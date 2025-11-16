const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { PubSub } = require('graphql-subscriptions');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const http = require('http'); 
const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws'); 
const { useServer } = require('graphql-ws/lib/use/ws');

const app = express();
const pubsub = new PubSub();

app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3002', 
    'http://api-gateway:3000', 
    'http://frontend-app:3002',
    'https://studio.apollographql.com' 
  ],
  credentials: true
}));

// --- MODIFIKASI DIMULAI: Mengganti data dummy ---

// Enum untuk status Task
const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
};

// Data dummy baru untuk Tasks
let tasks = [
  { id: '1', title: 'Selesaikan Backend REST API', description: 'Tambahkan endpoint untuk Teams.', status: TASK_STATUS.DONE, author: 'john@example.com', createdAt: new Date().toISOString() },
  { id: '2', title: 'Selesaikan Backend GraphQL', description: 'Ubah skema dari Posts menjadi Tasks.', status: TASK_STATUS.IN_PROGRESS, author: 'john@example.com', createdAt: new Date().toISOString() },
  { id: '3', title: 'Revisi Frontend', description: 'Tampilkan Tasks dan Teams.', status: TASK_STATUS.TODO, author: 'john@example.com', createdAt: new Date().toISOString() }
];

// --- MODIFIKASI SELESAI ---

// --- MODIFIKASI DIMULAI: Mengganti Type Defs (Skema GraphQL) ---
const typeDefs = `
  enum TaskStatus {
    TODO
    IN_PROGRESS
    DONE
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: TaskStatus!
    author: String!
    createdAt: String!
  }

  type Query {
    tasks: [Task!]!
    task(id: ID!): Task
  }

  type Mutation {
    createTask(title: String!, description: String): Task!
    updateTaskStatus(id: ID!, status: TaskStatus!): Task!
    deleteTask(id: ID!): Boolean!
  }

  type Subscription {
    taskAdded: Task!
    taskUpdated: Task!
    taskDeleted: ID!
  }
`;
// --- MODIFIKASI SELESAI ---


// --- MODIFIKASI DIMULAI: Mengganti Resolvers ---
const resolvers = {
  Query: {
    tasks: () => tasks,
    task: (_, { id }) => tasks.find(task => task.id === id),
  },
  Mutation: {
    createTask: (_, { title, description }, context) => {
      // Logic autentikasi dari JWT tetap sama
      if (!context.user || !context.user.email) {
        throw new Error('Not authenticated or user email not found in token');
      }
      
      const newTask = {
        id: uuidv4(),
        title,
        description: description || '',
        status: TASK_STATUS.TODO, // Status default
        author: context.user.email, // Ambil author dari context (JWT)
        createdAt: new Date().toISOString(),
      };
      
      tasks.push(newTask);
      pubsub.publish('TASK_ADDED', { taskAdded: newTask });
      return newTask;
    },
    
    updateTaskStatus: (_, { id, status }) => {
      const taskIndex = tasks.findIndex(task => task.id === id);
      if (taskIndex === -1) throw new Error('Task not found');
      
      // Pastikan status valid
      if (!Object.values(TASK_STATUS).includes(status)) {
        throw new Error('Invalid status');
      }
        
      tasks[taskIndex].status = status;
      const updatedTask = tasks[taskIndex];
      
      pubsub.publish('TASK_UPDATED', { taskUpdated: updatedTask });
      return updatedTask;
    },
    
    deleteTask: (_, { id }) => {
      const taskIndex = tasks.findIndex(task => task.id === id);
      if (taskIndex === -1) return false;
      
      tasks.splice(taskIndex, 1);
      pubsub.publish('TASK_DELETED', { taskDeleted: id });
      return true;
    },
  },
  Subscription: {
    taskAdded: { subscribe: () => pubsub.asyncIterator(['TASK_ADDED']) },
    taskUpdated: { subscribe: () => pubsub.asyncIterator(['TASK_UPDATED']) },
    taskDeleted: { subscribe: () => pubsub.asyncIterator(['TASK_DELETED']) },
  },
};
// --- MODIFIKASI SELESAI ---

// Kode startup server (tetap sama)
const schema = makeExecutableSchema({ typeDefs, resolvers });

async function startServer() {
  const httpServer = http.createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer({ 
    schema,
    context: (ctx) => {
      return { pubsub };
    },
  }, wsServer);

  const server = new ApolloServer({
    schema,
    context: ({ req }) => {
      const userPayload = req.headers['x-user-payload'];
      let user = null;
      if (userPayload) {
        try {
          user = JSON.parse(userPayload);
        } catch (e) {
          console.error('Error parsing x-user-payload header:', e);
        }
      }
      return { req, pubsub, user };
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT || 4000;
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 GraphQL API Server running on port ${PORT}`);
    console.log(`🛰  GraphQL endpoint: http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`🌊 Subscriptions ready at ws://localhost:${PORT}${server.graphqlPath}`);
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'graphql-api',
    timestamp: new Date().toISOString(),
    data: {
      tasks: tasks.length, // Diubah dari posts
    }
  });
});

startServer().catch(error => {
  console.error('Failed to start GraphQL server:', error);
  process.exit(1);
});