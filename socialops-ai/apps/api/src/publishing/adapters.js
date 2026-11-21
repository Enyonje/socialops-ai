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

export function getPublishingAdapter(platform) {
  return adapters.get(platform) || null;
}

export function listPublishingAdapters() {
  return [...adapters.values()].map(({ platform, ready, capabilities }) => ({ platform, ready, capabilities }));
}

// Used by provider integration modules when real OAuth/API implementations land.
export function registerPublishingAdapter(platform, adapter) {
  if (!adapters.has(platform)) throw new Error(`Unsupported social platform: ${platform}`);
  if (!adapter || typeof adapter.publish !== "function") throw new TypeError("Publishing adapter must implement publish()");
  adapters.set(platform, { platform, ready: adapter.ready === true, capabilities: adapter.capabilities || [], publish: adapter.publish });
}
