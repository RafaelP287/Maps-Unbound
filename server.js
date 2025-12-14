// server.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // ADD THIS LINE
const User = require('./userModel'); // Import the User model

const app = express();
const PORT = 3000;
const SALT_WORK_FACTOR = 10; // Keep this
const MONGODB_URI = "mongodb+srv://Boss:Password1234@mapsunbound.pcg1nnj.mongodb.net/test"; 

// Middleware to parse JSON bodies from requests
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Simple test route
app.get('/', (req, res) => {
    res.send('Server is running. Use /signup to register, /login to login.');
});

// In server.js, update the /signup route:

// 1. SIGNUP / CREATE (POST)
app.post('/signup', async (req, res) => {
    console.log('\n=== SIGNUP REQUEST ===');
    console.log('Username:', req.body.username);
    console.log('Password:', req.body.password);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        console.log('❌ Missing username or password');
        return res.status(400).send('Username and password are required');
    }
    
    try {
        console.log('Creating user (password will be hashed by middleware)...');
        
        // Create user with plain password - the pre-save middleware will hash it
        const newUser = new User({ 
            username: username, 
            password: password // Store plain password here
        });
        
        console.log('Saving user (will trigger pre-save middleware)...');
        await newUser.save(); 
        
        console.log('✅ User saved successfully');
        
        res.status(201).send('User registered successfully');
    } catch (err) {
        console.error('❌ Signup error:', err.message);
        console.error('Error stack:', err.stack);
        res.status(400).send(err.message);
    }
});
// 2. LOGIN / VERIFICATION (POST)
app.post('/login', async (req, res) => {
    console.log('\n=== LOGIN REQUEST ===');
    console.log('Username:', req.body.username);
    console.log('Password:', req.body.password);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }
    
    try {
        console.log('Looking for user in database...');
        const user = await User.findOne({ username });
        console.log('User found:', !!user);
        
        if (!user) {
            console.log('❌ User not found');
            return res.status(400).send('User not found');
        }

        console.log('Comparing passwords...');
        const isMatch = await user.comparePassword(password); 
        console.log('Final match result:', isMatch);
        
        if (isMatch) {
            console.log('✅ Login successful');
            res.status(200).send('Login successful');
        } else {
            console.log('❌ Invalid password');
            res.status(400).send('Invalid password');
        }
    } catch (err) {
        console.error('❌ Login error:', err.message);
        res.status(500).send(err.message);
    }
});

// 3. EDIT / CHANGE PASSWORD (PUT)
app.put('/profile/change-password', async (req, res) => {
    console.log('\n=== CHANGE PASSWORD ===');
    const { username, oldPassword, newPassword } = req.body;
    console.log('Username:', username);
    console.log('Old password:', oldPassword);
    console.log('New password:', newPassword);

    try {
        const user = await User.findOne({ username });
        if (!user) {
            console.log('❌ User not found');
            return res.status(404).send('User not found');
        }

        console.log('Verifying old password...');
        const isMatch = await user.comparePassword(oldPassword);
        console.log('Old password match:', isMatch);
        
        if (!isMatch) {
            console.log('❌ Invalid old password');
            return res.status(401).send('Invalid password for verification');
        }

        console.log('Setting new password (will be hashed by middleware)...');
        // Just set the plain password - the pre-save middleware will hash it
        user.password = newPassword;
        await user.save(); 

        console.log('✅ Password updated successfully');
        res.status(200).send('Password updated successfully');

    } catch (err) {
        console.error('❌ Change password error:', err);
        res.status(500).send(err.message);
    }
});

// 4. EDIT / CHANGE USERNAME (PUT)
app.put('/profile/change-username', async (req, res) => {
    const { currentUsername, password, newUsername } = req.body;

    try {
        const user = await User.findOne({ username: currentUsername });
        if (!user) return res.status(404).send('User not found');

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).send('Invalid password for verification');
        
        user.username = newUsername;
        await user.save(); 

        res.status(200).send('Username updated successfully');

    } catch (err) {
        // This might error if newUsername violates the 'unique: true' constraint
        res.status(400).send(err.message);
    }
});

// 5. DELETE ACCOUNT (DELETE)
app.delete('/profile/delete', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).send('User not found');

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).send('Invalid password for verification');

        // Delete the verified user document
        await User.deleteOne({ username }); 
        res.status(200).send('User account deleted successfully');

    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Database:', MONGODB_URI);
});
