import { MongoClient } from "mongodb";
import { env } from "./env.js";
let client: MongoClient | undefined;
let pending: Promise<boolean> | undefined;
let last = false;
let checked = 0;
export function databaseReady(): Promise<boolean> {
  if (pending) return pending;
  if (Date.now() - checked < (last ? 5000 : 3000)) return Promise.resolve(last);
  pending = (async () => {
    try {
      if (!env.mongodbUri) return false;
      client ??= new MongoClient(env.mongodbUri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
      await client.db("aayna").command({ ping: 1 }, { timeoutMS: 5000 });
      return true;
    } catch { return false; }
  })().then(value => { last = value; checked = Date.now(); return value; }).finally(() => { pending = undefined; });
  return pending;
}
export async function getDatabase() {
  if (!(await databaseReady()) || !client) throw new Error("Database unavailable.");
  return client.db("aayna");
}
export async function closeDatabase() { await client?.close(); }
