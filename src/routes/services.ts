import { Router } from "express";
import { createHash } from "node:crypto";
import { getDatabase } from "../config/database.js";
import { listServiceCategories, listCategoryDetails } from "../lib/service-categories.js";

export const servicesRouter = Router();

servicesRouter.get("/category-details", async (_req, res) => {
  try { res.set("Cache-Control", "no-store").json({ success: true, data: await listCategoryDetails() }); }
  catch { res.status(503).json({ success: false, message: "Categories are temporarily unavailable." }); }
});

servicesRouter.get("/categories", async (_req, res) => {
  try { res.set("Cache-Control", "no-store").json({ success: true, data: await listServiceCategories() }); }
  catch { res.status(503).json({ success: false, message: "Categories are temporarily unavailable." }); }
});

let pending: Promise<{ body: string; tag: string }> | undefined;

function load() {
  if (pending) return pending;

  pending = (async () => {
    const db = await getDatabase();
    const rows = await db
      .collection("services")
      .find(
        { status: "active" },
        {
          projection: {
            serviceName: 1,
            category: 1,
            description: 1,
            price: 1,
            duration: 1,
            image: 1,
            images: 1,
          },
          maxTimeMS: 5000,
        },
      )
      .sort({ _id: 1 })
      .toArray();

    const body = JSON.stringify({
      success: true,
      message: "Services loaded.",
      data: rows.map((row) => ({ ...row, _id: String(row._id) })),
    });

    return {
      body,
      tag: '"' + createHash("sha256").update(body).digest("hex") + '"',
    };
  })().finally(() => {
    pending = undefined;
  });

  return pending;
}

servicesRouter.get("/", async (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";

  try {
    const { body, tag } = await load();

    if (isProduction) {
      res.set({ ETag: tag, "Cache-Control": "private, no-cache" });
      if (req.fresh) {
        res.status(304).end();
        return;
      }
    } else {
      res.set("Cache-Control", "no-store");
      // res.end bypasses Express res.send's automatic ETag / 304 handling.
      res.type("application/json");
      res.end(body);
      return;
    }

    res.type("application/json").send(body);
  } catch {
    res
      .set("Cache-Control", "no-store")
      .status(503)
      .json({
        success: false,
        message: "Services are temporarily unavailable.",
      });
  }
});
