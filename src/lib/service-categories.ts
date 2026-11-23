import { getDatabase } from "../config/database.js";

export const DEFAULT_CATEGORIES = [
  "Haircut & Styling", "Hair Coloring", "Hair Treatment", "Facial & Skincare",
  "Makeup", "Manicure & Pedicure", "Spa & Massage", "Miscellaneous",
] as const;

let seeded: Promise<void> | null = null;
export async function ensureServiceCategories() {
  if (!seeded) seeded = (async () => {
    const db = await getDatabase();
    const collection = db.collection("serviceCategories");
    await collection.createIndex({ key: 1 }, { unique: true });
    const isNew = (await collection.countDocuments({})) === 0;
    await collection.bulkWrite(DEFAULT_CATEGORIES.filter((name) => name === "Miscellaneous").map((name) => ({
      updateOne: { filter: { key: name.toLocaleLowerCase("en") },
        update: { $setOnInsert: { name, key: name.toLocaleLowerCase("en"), order: 9999, isDefault: true, createdAt: new Date() } }, upsert: true },
    })), { ordered: false });
    if (isNew) await collection.bulkWrite(DEFAULT_CATEGORIES.filter((name) => name !== "Miscellaneous").map((name, order) => ({
      updateOne: { filter: { key: name.toLocaleLowerCase("en") },
        update: { $setOnInsert: { name, key: name.toLocaleLowerCase("en"), order, isDefault: true, createdAt: new Date() } }, upsert: true },
    })), { ordered: false });
  })().catch((error) => { seeded = null; throw error; });
  await seeded;
}

export async function listServiceCategories() {
  await ensureServiceCategories();
  const db = await getDatabase();
  const [saved, existing] = await Promise.all([
    db.collection("serviceCategories").find({}, { projection: { name: 1, _id: 0 } }).sort({ order: 1, name: 1 }).toArray(),
    db.collection("services").distinct("category"),
  ]);
  const result = new Map<string, string>();
  for (const item of saved) if (typeof item.name === "string") result.set(item.name.toLocaleLowerCase("en"), item.name);
  for (const name of existing) if (typeof name === "string" && name.trim()) {
    const normalized = name.trim();
    if (!result.has(normalized.toLocaleLowerCase("en"))) result.set(normalized.toLocaleLowerCase("en"), normalized);
  }
  return [...result.values()];
}

export async function listCategoryDetails() {
  await ensureServiceCategories();
  const db = await getDatabase();
  const [saved, names] = await Promise.all([
    db.collection("serviceCategories").find({}, { projection: { _id: 0, name: 1, image: 1 } }).sort({ order: 1, name: 1 }).toArray(),
    listServiceCategories(),
  ]);
  const byName = new Map(saved.map((row) => [String(row.name).toLocaleLowerCase("en"), row]));
  return names.map((name) => ({ name, image: typeof byName.get(name.toLocaleLowerCase("en"))?.image === "string" ? String(byName.get(name.toLocaleLowerCase("en"))?.image) : "" }));
}
