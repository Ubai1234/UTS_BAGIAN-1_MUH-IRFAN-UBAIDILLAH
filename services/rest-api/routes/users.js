const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateUser, validateLogin, validateUserUpdate } = require('../middleware/validation');

const router = express.Router();

let users = [];

let teams = [
  { id: 't1', name: 'Tim Engineering' },
  { id: 't2', name: 'Tim Desain' }
];

// --- Membuat User Admin Default ---
const createDefaultAdmin = async () => {
  try {
    const adminEmail = 'john@example.com';
    if (users.find(u => u.email === adminEmail)) {
      console.log('>>> User admin default "John Doe" sudah ada.');
      return;
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    const adminUser = {
      id: '1',
      name: 'John Doe',
      email: adminEmail,
      password: hashedPassword, 
      role: 'admin',
      teamId: 't1', 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(adminUser);
    console.log('>>> User admin default "John Doe" berhasil dibuat. Email: john@example.com, Password: admin123');
  } catch (err) {
    console.error('Gagal membuat user admin default:', err);
  }
};
createDefaultAdmin();

router.get('/public-key', (req, res) => {
  res.status(200).send(process.env.JWT_PUBLIC_KEY);
});

router.post('/register', validateUser, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'A user with this email already exists'
      });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword, 
      role: 'user', 
      teamId: 't1', 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    const userResponse = { ...newUser };
    delete userResponse.password;

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (err) {
    next(err); 
  }
});

router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      sub: user.id, 
      email: user.email,
      role: user.role,
      teamId: user.teamId 
    };

    const token = jwt.sign(
      payload, 
      process.env.JWT_PRIVATE_KEY, 
      { 
        algorithm: 'RS256', 
        expiresIn: '1h' 
      }
    );

    res.json({
      message: 'Login successful',
      token: token
    });

  } catch (err) {
    next(err); 
  }
});

router.get('/', (req, res) => {
  const safeUsers = users.map(u => {
    const userCopy = { ...u };
    delete userCopy.password;
    return userCopy;
  });
  res.json(safeUsers);
});

router.get('/teams', (req, res) => {
  res.status(200).json(teams);
});

router.get('/teams/:id/users', (req, res) => {
  const { id } = req.params;
  const teamExists = teams.find(t => t.id === id);
  
  if (!teamExists) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const teamUsers = users.filter(u => u.teamId === id).map(u => {
    const userCopy = { ...u };
    delete userCopy.password;
    return userCopy;
  });

  res.status(200).json(teamUsers);
});

router.get('/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      message: `User with ID ${req.params.id} does not exist`
    });
  }
  
  const userCopy = { ...user };
  delete userCopy.password;
  res.json(userCopy);
});

router.put('/:id', validateUserUpdate, (req, res) => {
  res.status(501).json({ message: 'Update not implemented yet' });
});

router.delete('/:id', (req, res) => {
  const userIndex = users.findIndex(u => u.id === req.params.id);
  
  if (userIndex === -1) {
    return res.status(404).json({
      error: 'User not found',
      message: `User with ID ${req.params.id} does not exist`
    });
  }
  
  const deletedUser = users.splice(userIndex, 1)[0];
  
  res.json({
    message: 'User deleted successfully',
    user: deletedUser
  });
});

module.exports = router;