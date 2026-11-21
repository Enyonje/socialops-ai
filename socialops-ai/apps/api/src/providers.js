import { listPublishingAdapters } from "./publishing/adapters.js";
const names = {
  INSTAGRAM: "Instagram", FACEBOOK: "Facebook", LINKEDIN: "LinkedIn", TIKTOK: "TikTok",
  YOUTUBE: "YouTube", X: "X", PINTEREST: "Pinterest", THREADS: "Threads",
};
export const providers = Object.entries(names).map(([id, name]) => ({
  id,
  name,
  ready: false,
  publishingReady: listPublishingAdapters().some((adapter) => adapter.platform === id && adapter.ready),
  capabilities: ["account_catalogue"],
  integrationStatus: "NOT_CONFIGURED",
}));
export function getProvider(id) { return providers.find((provider) => provider.id === id) || null; }
