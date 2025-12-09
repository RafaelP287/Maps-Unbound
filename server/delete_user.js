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

    console.log('\n--- Admin: Delete User by Username ---');

    // Prompt Admin for Input
    const answers = await inquirer.prompt([
      { type: 'input', name: 'username', message: 'Enter Username:' },
    ]);

    const { username } = answers;

    console.log('\nDeleting user...');
    
    // Delete from database and save to MongoDB
    const query = { username: username }; 
    const deletedDocument = await User.findOneAndDelete(query);

    // Verifies if it is deleted 
    if (deletedDocument) {
      console.log("Document found and deleted:", deletedDocument);
    } else {
      console.log("No document found matching the criteria.");
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Cleanup
    rl.close(); // Stop listening to keyboard
    mongoose.connection.close(); // Close DB connection
    process.exit(0);
  }
};

runInteraction();
