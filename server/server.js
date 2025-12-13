// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Allows frontend to talk to backend
const connectDB = require('./config/db');
const { createUser } = require('./controllers/userController.js');

const app = express();

// Middleware to parse JSON bodies (The data sent by frontend)
app.use(express.urlencoded({ extended: false }))
app.use(express.json());
app.use(cors());

// Debugging Middleware (Add this to see what is happening)
app.use((req, res, next) => {
  console.log('---------------------');
  console.log('Incoming Request Method:', req.method);
  console.log('Incoming Headers:', req.headers['content-type']);
  console.log('Incoming Body:', req.body);
  next();
});

connectDB();

// The "Endpoint"
app.post('/api/register', async (req, res) => {
  try {
    // 1. Receive data directly from the request body (no terminal input needed)
    const { username, email, password } = req.body;

    // 2. Run the logic
    const savedUser = await createUser(username, email, password);

    // 3. Send response back to frontend
    res.status(201).json({ message: 'User created!', user: savedUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
