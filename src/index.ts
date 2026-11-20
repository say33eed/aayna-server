import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.port, "0.0.0.0", () => {
  console.log(`AAYNA API listening on port ${env.port}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received. Closing HTTP server...`);
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
