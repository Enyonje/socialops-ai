import { buildApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { processDuePublications } from "./publishing/worker.js";

const app = await buildApp();
const worker = setInterval(async () => {
  try {
    await processDuePublications({ logger: app.log });
  } catch (error) {
    app.log.error(error, "Publishing queue worker failed");
  }
}, config.poll);
worker.unref();

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info(`Received ${signal}; shutting down SocialOps API`);
  clearInterval(worker);
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
}
