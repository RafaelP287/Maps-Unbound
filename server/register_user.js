require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline'); // Built-in Node module
const inquirer = require('inquirer');
const connectDB = require('./config/db');
const User = require('./models/User');

// Setup Interface to read from terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const runInteraction = async () => {
  try {
    // Connect to Database
    await connectDB();

    console.log('\n--- Create New User ---');

    // Prompt User for Input
    const answers = await inquirer.prompt([
      { type: 'input', name: 'username', message: 'Enter Username:' },
      { type: 'input', name: 'email', message: 'Enter Email:' },
      { type: 'password', name: 'password', message: 'Enter Password:', mask: '*' }
    ]);

    const { username, email, password } = answers;

    console.log('\nCreating user...');

    // Save to MongoDB
    // (The User model handles the hashing automatically!)
    const newUser = new User({ username, email, password });
    await newUser.save();

    console.log('✅ User successfully saved to database!');
    console.log(newUser);

  } catch (error) {
    if (error.code === 11000) {
      console.error('❌ Error: That username or email is already taken.');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    // Cleanup
    rl.close(); // Stop listening to keyboard
    mongoose.connection.close(); // Close DB connection
    process.exit(0);
  }
};

runInteraction();
