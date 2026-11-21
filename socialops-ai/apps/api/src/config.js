import "dotenv/config";

const allowedOrigins = (process.env.WEB_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.API_PORT || process.env.PORT || 4000),
  origins: allowedOrigins,
  poll: Number(process.env.PUBLISHER_POLL_INTERVAL_MS || 15000),
};
