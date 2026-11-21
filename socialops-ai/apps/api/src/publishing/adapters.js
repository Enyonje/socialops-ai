/**
 * Provider publishing adapter contract.
 * A provider is only marked ready when its real OAuth/API implementation is
 * installed and configured. Never report a queued post as published otherwise.
 */
const platformNames = ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TIKTOK", "YOUTUBE", "X", "PINTEREST", "THREADS"];

const adapters = new Map(platformNames.map((platform) => [platform, {
  platform,
  ready: false,
  capabilities: [],
  async publish() {
    const error = new Error(`${platform} publishing is not configured. Connect an approved ${platform} API adapter before publishing.`);
    error.code = "PROVIDER_NOT_CONFIGURED";
    throw error;
  },
}]));

function isAdapterReady(adapter) {
  try {
    if (typeof adapter?.isReady === "function") return adapter.isReady() === true;
    return adapter?.ready === true;
  } catch {
    return false;
  }
}

export function getPublishingAdapter(platform) {
  const adapter = adapters.get(platform);
  if (!adapter) return null;
  return { ...adapter, ready: isAdapterReady(adapter) };
}

export function listPublishingAdapters() {
  return [...adapters.values()].map((adapter) => ({
    platform: adapter.platform,
    ready: isAdapterReady(adapter),
    capabilities: adapter.capabilities,
  }));
}

// Readiness is evaluated when queried, not frozen when the module is imported.
export function registerPublishingAdapter(platform, adapter) {
  if (!adapters.has(platform)) throw new Error(`Unsupported social platform: ${platform}`);
  if (!adapter || typeof adapter.publish !== "function") throw new TypeError("Publishing adapter must implement publish()");
  if (adapter.isReady !== undefined && typeof adapter.isReady !== "function") {
    throw new TypeError("Publishing adapter isReady must be a function");
  }
  adapters.set(platform, {
    platform,
    isReady: adapter.isReady,
    ready: adapter.ready,
    capabilities: Array.isArray(adapter.capabilities) ? adapter.capabilities : [],
    publish: adapter.publish,
  });
}
