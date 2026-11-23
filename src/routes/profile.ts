import { Router } from "express";
import { requireAuth } from "../middleware/authorize.js";

export const profileRouter = Router();
profileRouter.use(requireAuth);

// Only authenticated users may upload. The ImgBB API key stays on Render.
profileRouter.post("/image", async (req, res, next) => {
  try {
    const key = process.env.IMGBB_API_KEY?.trim();
    if (!key) { res.status(503).json({ success: false, message: "Image hosting is not configured. Set IMGBB_API_KEY on Render." }); return; }
    const { image, mime } = req.body ?? {};
    if (typeof image !== "string" || typeof mime !== "string" ||
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime) ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
      res.status(400).json({ success: false, message: "Upload a JPEG, PNG, WebP, or GIF photo." }); return;
    }
    const buffer = Buffer.from(image, "base64");
    if (!buffer.length || buffer.length > 5 * 1024 * 1024 ||
        buffer.toString("base64").replace(/=+$/, "") !== image.replace(/=+$/, "")) {
      res.status(400).json({ success: false, message: "Photo must be 5 MB or smaller." }); return;
    }
    const jpg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    const png = buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const gif = buffer.subarray(0, 6).toString("ascii").startsWith("GIF8");
    const webp = buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
    if (!((mime === "image/jpeg" && jpg) || (mime === "image/png" && png) ||
          (mime === "image/gif" && gif) || (mime === "image/webp" && webp))) {
      res.status(400).json({ success: false, message: "Photo file contents are invalid." }); return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
        method: "POST", body: new URLSearchParams({ image }), signal: controller.signal,
      });
      const result = await response.json() as { success?: boolean; data?: { url?: string; display_url?: string } };
      const url = result.data?.url || result.data?.display_url;
      if (!response.ok || !result.success || !url || new URL(url).hostname !== "i.ibb.co") {
        res.status(502).json({ success: false, message: "Image hosting rejected the photo." }); return;
      }
      res.set("Cache-Control", "no-store").json({ success: true, data: { url } });
    } finally { clearTimeout(timeout); }
  } catch (error) { next(error); }
});
