import { app } from "./app.js";
import { env } from "./config/env.js";
import { closeDatabase, ensureBusinessIndexes } from "./config/database.js";
try {
  await ensureBusinessIndexes();
} catch {
  console.error("AAYNA startup failed: database or required indexes unavailable. Check database access and duplicate records.");
  await closeDatabase();
  process.exit(1);
}
const server = app.listen(env.port, "0.0.0.0", () => console.log(`AAYNA API listening on port ${env.port}`));
let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();
  server.close(async (error) => {
    try { await closeDatabase(); } catch { process.exitCode = 1; }
    if (error) process.exitCode = 1;
    clearTimeout(deadline);
  });
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
