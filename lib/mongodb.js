import { MongoClient } from 'mongodb';

let cachedClient = null;
let cachedDb = null;

export async function getDb() {
  if (cachedDb) return cachedDb;
  
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  cachedClient = client;
  cachedDb = client.db(process.env.DB_NAME || 'learnhub');
  return cachedDb;
}

export async function getClient() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  cachedClient = client;
  cachedDb = client.db(process.env.DB_NAME || 'learnhub');
  return cachedClient;
}
