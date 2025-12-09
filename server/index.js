const inquirer = require('inquirer');
const { spawn } = require('child_process');

// Helper function to run a script
const runScript = (scriptPath) => {
  return new Promise((resolve, reject) => {
    // 'node' is the command, [scriptPath] are the arguments
    // stdio: 'inherit' lets the child script print directly to your main terminal
    const process = spawn('node', [scriptPath], { stdio: 'inherit' });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(); // Script finished successfully
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
  });
};

const main = async () => {
  console.log("Starting the test cases...\n");

  try {
    // 'rawlist' gives you a numbered list (1, 2, 3...) automatically
    const answer = await inquirer.prompt([
      {
        type: 'rawlist', 
        name: 'choice',
        message: 'Which script do you want to run?',
        choices: [
          { name: 'User: Register User', value: 'register_user.js' },
          { name: 'Admin: Delete User', value: 'delete_user.js' },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);

    if (answer.choice === 'exit') {
      console.log('Exited. Closing Program.');
      return;
    }

    console.log(`\n🚀 Launching ${answer.choice}...`);
    
    // Run the selected file
    await runScript("scripts/" + answer.choice);

    console.log(`\n✅ ${answer.choice} finished. Returning to menu...`);
    
    main();

  } catch (error) {
    console.error('Error:', error.message);
  }
};

main();
