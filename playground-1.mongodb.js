/* TEST FILE */

// MongoDB Playground
// 1. Get the "MongoDB for VS Code" extension (if on VSCode)
// 2. Connect via the connection string provided by the online cluster
// 3. Edit the insertMany call with your name as the 'user' key
// 4. On the top right, there should be a run script button.

// For more documentation on playgrounds please refer to
// https://www.mongodb.com/docs/mongodb-vscode/playgrounds/

// Select the database to use.
use('mongodbVSCodePlaygroundDB');

// Insert a few documents into the sales collection.
db.getCollection('users').insertMany([
  { 'user': 'tensofu', 'role': 'admin', 'date': new Date('2025-11-23T20:20:07Z') },
]);

// Run a find command on all users registered 
const usersAfterNovember20 = db.getCollection('users').find({
  date: { $gt: new Date('2025-11-20') }
}).count();

// Print a message to the output window.
console.log(`${usersAfterNovember20} users registered.`);

// Here we run an aggregation and open a cursor to the results.
// Use '.toArray()' to exhaust the cursor to return the whole result set.
// You can use '.hasNext()/.next()' to iterate through the cursor page by page.
db.getCollection('users').aggregate([
  // Find all of the users.
  { $match: { date: { $gt: new Date('2025-11-20') } } }
]);
