// app.js
const express = require('express');
const mongoose = require('mongoose');
const User = require('./userModel'); // Import the User model

const app = express();
const PORT = 3000;
// REPLACE WITH YOUR MONGO URI if you are using Atlas or a different local setup
const MONGODB_URI = "mongodb+srv://Boss:Password1234@mapsunbound.pcg1nnj.mongodb.net/auth-app-new"; 

// Middleware to parse JSON bodies from requests
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));


// --- User Function Routes ---

// 1. SIGNUP / CREATE (POST)
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const newUser = new User({ username, password });
        // The 'pre("save")' middleware in userModel.js hashes the password here
        await newUser.save(); 
        res.status(201).send('User registered successfully');
    } catch (err) {
        res.status(400).send(err.message);
    }
});

// 2. LOGIN / VERIFICATION (POST)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).send('User not found');

        // Use the comparePassword method defined in userModel.js
        const isMatch = await user.comparePassword(password); 
        if (isMatch) {
            res.status(200).send('Login successful');
        } else {
            res.status(400).send('Invalid password');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 3. EDIT / CHANGE PASSWORD (PUT)
app.put('/profile/change-password', async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).send('User not found');

        const isMatch = await user.comparePassword(oldPassword);
        if (!isMatch) return res.status(401).send('Invalid old password');

        user.password = newPassword;
        // This save triggers the pre('save') hook again, hashing the new password
        await user.save(); 

        res.status(200).send('Password updated successfully');

    } catch (err) {
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
});
