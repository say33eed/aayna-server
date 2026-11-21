import { MongoClient } from "mongodb";
import { env } from "./env.js";

export const mongoClient = new MongoClient(env.mongodbUri, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
});
export const db = mongoClient.db("aayna");

export async function connectDatabase(): Promise<void> {
  await mongoClient.connect();
  await db.command({ ping: 1 });
}

export async function closeDatabase(): Promise<void> {
  await mongoClient.close();
}
