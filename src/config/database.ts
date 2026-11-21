import { MongoClient } from "mongodb";
import { env } from "./env.js";

let client: MongoClient | undefined;
let pending: Promise<boolean> | undefined;

let last = false;
let checked = 0;

export function getMongoClient(): MongoClient {
  if (!env.mongodbUri) {
    throw new Error("MongoDB is not configured.");
  }

  client ??= new MongoClient(env.mongodbUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  return client;
}

export function databaseReady(): Promise<boolean> {
  if (pending) return pending;

  if (Date.now() - checked < (last ? 5000 : 3000)) {
    return Promise.resolve(last);
  }

  pending = (async () => {
    try {
      const mongoClient = getMongoClient();

      await mongoClient.db("aayna").command(
        { ping: 1 },
        { timeoutMS: 5000 }
      );

      return true;
    } catch {
      return false;
    }
  })()
    .then((value) => {
      last = value;
      checked = Date.now();

      return value;
    })
    .finally(() => {
      pending = undefined;
    });

  return pending;
}

export async function getDatabase() {
  if (!(await databaseReady())) {
    throw new Error("Database unavailable.");
  }

  return getMongoClient().db("aayna");
}

export async function closeDatabase() {
  await client?.close();

  client = undefined;
  pending = undefined;
  last = false;
  checked = 0;
}