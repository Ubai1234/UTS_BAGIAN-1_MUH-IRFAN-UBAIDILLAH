'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql, useSubscription } from '@apollo/client';
// --- MODIFIKASI DIMULAI: Import teamApi ---
import { authApi, teamApi, userApi } from '@/lib/api';
// --- MODIFIKASI SELESAI ---

// --- MODIFIKASI DIMULAI: Mengganti Kueri GraphQL ---
const GET_TASKS = gql`
  query GetTasks {
    tasks {
      id
      title
      description
      status
      author
      createdAt
    }
  }
`;

const CREATE_TASK = gql`
  mutation CreateTask($title: String!, $description: String) {
    createTask(title: $title, description: $description) {
      id
      title
      description
      status
      author
      createdAt
    }
  }
`;

const UPDATE_TASK_STATUS = gql`
  mutation UpdateTaskStatus($id: ID!, $status: TaskStatus!) {
    updateTaskStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

// Subscription untuk notifikasi real-time
const TASK_ADDED_SUBSCRIPTION = gql`
  subscription OnTaskAdded {
    taskAdded {
      id
      title
      author
    }
  }
`;
// --- MODIFIKASI SELESAI ---


export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  
  // --- MODIFIKASI DIMULAI: State untuk data baru ---
  const [teams, setTeams] = useState<any[]>([]); // State untuk tim
  const [users, setUsers] = useState<any[]>([]); // State untuk users
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'login' | 'register'>('login'); 

  const [regForm, setRegForm] = useState({ name: '', email: '', password: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  
  // State baru untuk form task
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  // --- MODIFIKASI SELESAI ---

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      setLoading(false); 
    }
  }, []);

  // --- MODIFIKASI DIMULAI: Kueri GraphQL baru ---
  const { data: tasksData, loading: tasksLoading, refetch: refetchTasks } = useQuery(GET_TASKS, {
    skip: !token, // Jangan fetch jika belum login
  });
  const [createTask] = useMutation(CREATE_TASK);
  const [updateTaskStatus] = useMutation(UPDATE_TASK_STATUS);
  
  // Menjalankan subscription
  useSubscription(TASK_ADDED_SUBSCRIPTION, {
    onData: ({ data }) => {
      const task = data?.data?.taskAdded;
      if (task) {
        alert(`NOTIFIKASI REAL-TIME:\nTask baru ditambahkan: "${task.title}" oleh ${task.author}`);
        refetchTasks(); // Muat ulang daftar task
      }
    },
    skip: !token
  });
  // --- MODIFIKASI SELESAI ---


  // Fetch data REST API (Teams & Users)
  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchTeamsAndUsers();
    }
  }, [token]);

  // --- MODIFIKASI DIMULAI: Fungsi Fetch Baru ---
  const fetchTeamsAndUsers = async () => {
    try {
      // Ambil data teams dan users secara bersamaan
      const [teamResponse, userResponse] = await Promise.all([
        teamApi.getTeams(),
        userApi.getUsers() // Ambil semua user
      ]);
      setTeams(teamResponse.data);
      setUsers(userResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  // --- MODIFIKASI SELESAI ---

  // Handler untuk Auth (Login/Register/Logout) - Ini tetap sama
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authApi.register(regForm);
      alert('Registration successful! Please login.');
      setRegForm({ name: '', email: '', password: '' });
      setView('login'); 
    } catch (error) {
      console.error('Error registering:', error);
      alert('Registration failed.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await authApi.login(loginForm);
      const { token } = response.data;
      
      localStorage.setItem('token', token);
      setToken(token); 
      
      setLoginForm({ email: '', password: '' });
      refetchTasks(); // Panggil refetch task setelah login
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Login failed. Check credentials.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUsers([]); 
    setTeams([]);
    setView('login');
  };
  
  // --- MODIFIKASI DIMULAI: Handler untuk Task ---
  // --- MODIFIKASI DIMULAI: Handler untuk Task ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTask({
        variables: newTask,
      });
      setNewTask({ title: '', description: '' });
      
      // TAMBAHKAN BARIS INI:
      refetchTasks(); 
      // Ini akan langsung me-refresh daftar task di bawah

    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task.');
    }
  };
  
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus({
        variables: { id: taskId, status: newStatus }
      });
      refetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };
  // --- MODIFIKASI SELESAI ---

  // Tampilan Loading
  if (loading && token === null) {
     return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  // Tampilan Halaman Auth (Login/Register) - Ini tetap sama
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <h1 className="text-4xl font-bold text-center text-gray-900">
            {/* --- MODIFIKASI: Judul --- */}
            Task Management App
          </h1>
          
          {view === 'login' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Login</h2>
              <form onSubmit={handleLogin} className="mb-6">
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="email"
                    placeholder="Email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="border rounded-md px-3 py-2"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="border rounded-md px-3 py-2"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 w-full"
                  >
                    Login
                  </button>
                </div>
              </form>
              <p className="text-center text-sm">
                Belum punya akun?{' '}
                <button
                  onClick={() => setView('register')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Register di sini
                </button>
              </p>
            </div>
          )}

          {view === 'register' && (
             <div className="bg-white shadow rounded-lg p-6">
             <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Register</h2>
             <form onSubmit={handleRegister} className="mb-6">
               <div className="grid grid-cols-1 gap-4">
                 <input
                   type="text"
                   placeholder="Name"
                   value={regForm.name}
                   onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                   className="border rounded-md px-3 py-2"
                   required
                 />
                 <input
                   type="email"
                   placeholder="Email"
                   value={regForm.email}
                   onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                   className="border rounded-md px-3 py-2"
                   required
                 />
                 <input
                   type="password"
                   placeholder="Password"
                   value={regForm.password}
                   onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                   className="border rounded-md px-3 py-2"
                   required
                 />
                 <button
                   type="submit"
                   className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 w-full"
                 >
                   Register
                 </button>
               </div>
             </form>
             <p className="text-center text-sm">
               Sudah punya akun?{' '}
               <button
                 onClick={() => setView('login')}
                 className="font-medium text-blue-600 hover:text-blue-500"
               >
                 Login di sini
               </button>
             </p>
           </div>
          )}
        </div>
      </div>
    );
  }

  // --- MODIFIKASI DIMULAI: Tampilan Halaman Dashboard (Task Management) ---
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">
            Task Management App
          </h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Kolom Kiri: Teams & Users (REST API) */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Teams (REST API)</h2>
            {loading ? (
              <p>Loading teams...</p>
            ) : (
              <div className="space-y-4">
                {teams.map((team: any) => (
                  <div key={team.id} className="p-3 border rounded">
                    <p className="font-semibold text-lg">{team.name}</p>
                    {/* Menampilkan user yang ada di tim tersebut */}
                    <div className="mt-2 pl-4">
                      {users.filter(u => u.teamId === team.id).map((user: any) => (
                        <div key={user.id} className="text-sm text-gray-600">
                          <p>{user.name} ({user.email})</p>
                        </div>
                      ))}
                      {users.filter(u => u.teamId === team.id).length === 0 && (
                        <p className="text-sm text-gray-400">Belum ada anggota.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kolom Kanan: Tasks (GraphQL) */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Tasks (GraphQL)</h2>
            
            {/* Form Create Task */}
            <form onSubmit={handleCreateTask} className="mb-6">
              <div className="grid grid-cols-1 gap-4">
                <input
                  type="text"
                  placeholder="Task Title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="border rounded-md px-3 py-2"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="border rounded-md px-3 py-2 h-20"
                />
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                >
                  Add Task
                </button>
              </div>
            </form>

            {/* Daftar Tasks */}
            {tasksLoading ? (
              <p>Loading tasks...</p>
            ) : (
              <div className="space-y-4">
                {tasksData?.tasks.map((task: any) => (
                  <div key={task.id} className="p-4 border rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <p className="text-gray-600 mt-2">{task.description}</p>
                      </div>
                      <select 
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className={`rounded-md p-1 text-sm font-medium border-2 ${
                          task.status === 'DONE' ? 'bg-green-100 text-green-800 border-green-200' :
                          task.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
                      <span>By: {task.author}</span>
                      <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  // --- MODIFIKASI SELESAI ---
}