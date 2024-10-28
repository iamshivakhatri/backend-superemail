// db.js
const { MongoClient } = require('mongodb');

let db;

async function connectToDatabase() {
  if (db) {
    return db;
  }

  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();
  db = client.db(); // Use the default database defined in the URI or specify a specific DB

  return db;
}

module.exports = connectToDatabase;
