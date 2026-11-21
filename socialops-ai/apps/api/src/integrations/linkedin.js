import crypto from "node:crypto";
import { prisma } from "../db.js";
import { encryptToken, decryptToken } from "../token-vault.js";
import { registerPublishingAdapter } from "../publishing/adapters.js";

const PLATFORM = "LINKEDIN";
const SCOPES = ["openid", "profile", "w_member_social"];
const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const POSTS_URL = "https://api.linkedin.com/rest/posts";

function settings() {
  const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI, LINKEDIN_VERSION } = process.env;
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET || !LINKEDIN_REDIRECT_URI) {
    throw new Error("LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET and LINKEDIN_REDIRECT_URI.");
  }
  if (!/^\d{6}$/.test(LINKEDIN_VERSION || "")) {
    throw new Error("Set LINKEDIN_VERSION to a currently supported YYYYMM API version.");
  }
  return { clientId: LINKEDIN_CLIENT_ID, clientSecret: LINKEDIN_CLIENT_SECRET, redirectUri: LINKEDIN_REDIRECT_URI, version: LINKEDIN_VERSION };
}

function safeFrontendUrl(status) {
  const raw = process.env.LINKEDIN_RESULT_URL || process.env.WEB_ORIGIN?.split(",")[0] || "http://localhost:5173";
  const url = new URL(raw);
  url.searchParams.set("linkedin", status);
  return url.toString();
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) {
    const error = new Error(data.error_description || data.message || `LinkedIn request failed (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
  return { data, response };
}

export function linkedinConfigured() {
  try { settings(); return Boolean(process.env.TOKEN_ENCRYPTION_KEY); } catch { return false; }
}

export async function registerLinkedInRoutes(app) {
  app.get("/api/v1/workspaces/:wid/integrations/linkedin/connect", async (req, reply) => {
    let cfg;
    try { cfg = settings(); } catch (error) { return reply.code(503).send({ error: error.message }); }
    if (!process.env.TOKEN_ENCRYPTION_KEY) return reply.code(503).send({ error: "Token encryption is not configured." });

    const workspace = await prisma.workspace.findUnique({ where: { id: req.params.wid }, select: { id: true } });
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

    // Until workspace-user authentication is implemented, OAuth initiation is restricted to local development.
    if (process.env.NODE_ENV === "production") {
      return reply.code(403).send({ error: "Workspace authorization is required before connecting social accounts in production." });
    }

    const rawState = crypto.randomBytes(32).toString("base64url");
    const stateHash = crypto.createHash("sha256").update(rawState).digest("hex");
    await prisma.linkedInOAuthState.create({
      data: { stateHash, workspaceId: workspace.id, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
    const url = new URL(AUTH_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("redirect_uri", cfg.redirectUri);
    url.searchParams.set("state", rawState);
    url.searchParams.set("scope", SCOPES.join(" "));
    return reply.redirect(url.toString());
  });

  app.get("/api/v1/integrations/linkedin/callback", async (req, reply) => {
    const { code, state, error } = req.query || {};
    if (error) return reply.redirect(safeFrontendUrl("denied"));
    if (typeof code !== "string" || typeof state !== "string") {
      return reply.code(400).send({ error: "Missing OAuth code or state." });
    }
    let cfg;
    try { cfg = settings(); } catch (e) { return reply.code(503).send({ error: e.message }); }

    const stateHash = crypto.createHash("sha256").update(state).digest("hex");
    const stored = await prisma.linkedInOAuthState.findUnique({ where: { stateHash } });
    if (!stored || stored.usedAt || stored.expiresAt <= new Date()) {
      return reply.code(400).send({ error: "OAuth state is invalid, expired, or already used." });
    }
    const consumed = await prisma.linkedInOAuthState.updateMany({
      where: { id: stored.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) return reply.code(400).send({ error: "OAuth state has already been used." });

    try {
      const tokenBody = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: cfg.redirectUri,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
      });
      const { data: token } = await fetchJson(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody,
      });
      if (!token.access_token || !Number.isFinite(Number(token.expires_in))) throw new Error("LinkedIn returned an invalid token response.");

      const { data: profile } = await fetchJson(USERINFO_URL, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!profile.sub) throw new Error("LinkedIn user profile did not include a member identifier.");
      const accountName = [profile.name, profile.given_name, profile.family_name].filter(Boolean).join(" ").trim() || `LinkedIn member ${profile.sub}`;
      const encryptedToken = encryptToken(token.access_token);
      const scopes = Array.isArray(token.scope) ? token.scope.join(" ") : (token.scope || SCOPES.join(" "));
      await prisma.socialAccount.upsert({
        where: { workspaceId_platform_accountName: { workspaceId: stored.workspaceId, platform: PLATFORM, accountName } },
        create: {
          workspaceId: stored.workspaceId, platform: PLATFORM, accountName,
          externalId: profile.sub, encryptedToken, tokenExpiresAt: new Date(Date.now() + Number(token.expires_in) * 1000),
          scopes, isDevelopment: false, isActive: true,
        },
        update: {
          externalId: profile.sub, encryptedToken, tokenExpiresAt: new Date(Date.now() + Number(token.expires_in) * 1000),
          scopes, isDevelopment: false, isActive: true,
        },
      });
      return reply.redirect(safeFrontendUrl("connected"));
    } catch (e) {
      req.log.error({ err: e }, "LinkedIn OAuth callback failed");
      return reply.redirect(safeFrontendUrl("failed"));
    }
  });
}

// Registering this module installs the live publishing adapter when credentials are configured.
registerPublishingAdapter(PLATFORM, {
  isReady: linkedinConfigured,
  capabilities: ["text_post", "member_profile"],
  async publish({ account, content }) {
    if (!linkedinConfigured()) throw new Error("LinkedIn publishing is not configured.");
    if (!account?.encryptedToken || !account.externalId || account.isDevelopment) {
      throw new Error("A live LinkedIn member account is required.");
    }
    if (account.tokenExpiresAt && account.tokenExpiresAt <= new Date()) {
      throw new Error("LinkedIn access token expired. Reconnect the LinkedIn account.");
    }
    const text = String(content?.body || "").trim();
    if (!text) throw new Error("LinkedIn post text cannot be empty.");
    if (text.length > 3000) throw new Error("LinkedIn post exceeds the 3000-character application limit.");
    const token = decryptToken(account.encryptedToken);
    const { version } = settings();
    const { response } = await fetchJson(POSTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": version,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: `urn:li:person:${account.externalId}`,
        commentary: text,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });
    return { id: response.headers.get("x-restli-id") || null };
  },
});
