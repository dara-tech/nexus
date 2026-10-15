import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexus_news';
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so the connection is preserved across module reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, avoid global variables
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * Returns the MongoDB Database instance
 */
export async function getDatabase(): Promise<Db> {
  const connectedClient = await clientPromise;
  return connectedClient.db();
}

export default clientPromise;
