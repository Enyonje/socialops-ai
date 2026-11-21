import { z } from "zod";
import { prisma } from "./db.js";
import { providers } from "./providers.js";
import { listPublishingAdapters } from "./publishing/adapters.js";
import { registerLinkedInRoutes } from "./integrations/linkedin.js";

const AGENT_PROVIDERS = {
    gemini: {
        keyEnv: "GEMINI_API_KEY",
        defaultModel: "gemini-2.5-flash",
        modelEnv: "GEMINI_MODEL",
    },
    groq: {
        keyEnv: "GROQ_API_KEY",
        defaultModel: "llama-3.3-70b-versatile",
        modelEnv: "GROQ_MODEL",
    },
    openai: {
        keyEnv: "OPENAI_API_KEY",
        defaultModel: "gpt-4o-mini",
        modelEnv: "OPENAI_MODEL",
    },
    deepseek: {
        keyEnv: "DEEPSEEK_API_KEY",
        defaultModel: "deepseek-chat",
        modelEnv: "DEEPSEEK_MODEL",
    },
};

function resolveProviderOrder(requestedProvider) {
    const all = ["gemini", "groq", "openai", "deepseek"];
    const preferred = (requestedProvider || process.env.AGENT_PROVIDER || "").toLowerCase();
    if (all.includes(preferred)) {
        return [preferred, ...all.filter((p) => p !== preferred)];
    }
    return all;
}

async function callOpenAICompatible({ url, apiKey, model, systemPrompt, userPrompt }) {
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty model response");
    return text;
}

async function callGemini({ apiKey, model, systemPrompt, userPrompt }) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }
    const text = data?.candidates?.[0]?.content?.parts
        ?.map((p) => p?.text || "")
        .join("")
        .trim();
    if (!text) throw new Error("Empty model response");
    return text;
}

async function callProvider(providerId, systemPrompt, userPrompt) {
    const cfg = AGENT_PROVIDERS[providerId];
    const apiKey = process.env[cfg.keyEnv];
    if (!apiKey) return null;

    const model = process.env[cfg.modelEnv] || cfg.defaultModel;
    if (providerId === "gemini") {
        return callGemini({ apiKey, model, systemPrompt, userPrompt });
    }
    if (providerId === "groq") {
        return callOpenAICompatible({
            url: "https://api.groq.com/openai/v1/chat/completions",
            apiKey,
            model,
            systemPrompt,
            userPrompt,
        });
    }
    if (providerId === "openai") {
        return callOpenAICompatible({
            url: "https://api.openai.com/v1/chat/completions",
            apiKey,
            model,
            systemPrompt,
            userPrompt,
        });
    }
    if (providerId === "deepseek") {
        return callOpenAICompatible({
            url: "https://api.deepseek.com/chat/completions",
            apiKey,
            model,
            systemPrompt,
            userPrompt,
        });
    }
    return null;
}

async function runAgentTask({ workspaceId, agent, task, provider }) {
    const brand = await prisma.brandProfile.findUnique({ where: { workspaceId } });
    const systemPrompt = [
        `You are the ${agent} agent in SocialOps AI.`,
        brand?.voice ? `Brand voice: ${brand.voice}` : "",
        brand?.audience ? `Target audience: ${brand.audience}` : "",
        brand?.guidelines ? `Brand guidelines: ${brand.guidelines}` : "",
    ]
        .filter(Boolean)
        .join("\n");

    const order = resolveProviderOrder(provider);
    const errors = [];

    for (const candidate of order) {
        const apiKey = process.env[AGENT_PROVIDERS[candidate].keyEnv];
        if (!apiKey) continue;
        try {
            const output = await callProvider(candidate, systemPrompt, task);
            if (output) {
                return { status: "COMPLETED", result: output };
            }
        } catch (err) {
            errors.push(`${candidate}: ${err?.message || "request failed"}`);
        }
    }

    if (errors.length) {
        return { status: "FAILED", result: errors.join(" | ") };
    }
    return {
        status: "FAILED",
        result: "No LLM API key configured. Set GEMINI_API_KEY, GROQ_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY.",
    };
}

async function fireAutomations(workspaceId, trigger, context = {}) {
    const rules = await prisma.automationRule.findMany({
        where: { workspaceId, trigger, enabled: true },
    });

    for (const rule of rules) {
        if (rule.action === "REQUEST_APPROVAL" && context.contentId) {
            const existing = await prisma.approval.findFirst({
                where: { workspaceId, contentId: context.contentId, status: "PENDING" },
            });
            if (!existing) {
                await prisma.contentItem.update({
                    where: { id: context.contentId },
                    data: { status: "IN_REVIEW" },
                });
                await prisma.approval.create({
                    data: { workspaceId, contentId: context.contentId },
                });
            }
        }

        if (rule.action === "RUN_AGENT") {
            const prompt = (rule.agentTask || "Review workspace activity and suggest next steps.")
                .replaceAll("{{title}}", context.title || "Untitled")
                .replaceAll("{{body}}", context.body || "");
            const outcome = await runAgentTask({
                workspaceId,
                agent: "Automation Agent",
                task: prompt,
            });
            await prisma.agentRun.create({
                data: {
                    workspaceId,
                    agent: "Automation Agent",
                    task: prompt,
                    status: outcome.status,
                    result: outcome.result,
                },
            });
        }

        await prisma.automationRule.update({
            where: { id: rule.id },
            data: { runCount: { increment: 1 }, lastRunAt: new Date() },
        });
    }
}

const platforms = ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TIKTOK", "YOUTUBE", "X", "PINTEREST", "THREADS"];

export async function routes(app) {
    await registerLinkedInRoutes(app);

    app.get("/api/v1/health", async () => ({ ok: true, service: "socialops-api" }));
    app.get("/api/v1/ready", async () => {
        await prisma.$queryRaw`SELECT 1`;
        return { ready: true };
    });

    app.post("/api/v1/bootstrap", async (req, rep) => {
        const x = z.object({
            organizationName: z.string().min(2),
            workspaceName: z.string().min(2),
        }).parse(req.body);
        const o = await prisma.organization.create({
            data: {
                name: x.organizationName,
                workspaces: { create: { name: x.workspaceName } },
            },
            include: { workspaces: true },
        });
        return rep.code(201).send({ organizationId: o.id, workspace: o.workspaces[0] });
    });

    app.get("/api/v1/providers", async () => {
        const adapters = listPublishingAdapters();
        return providers.map((provider) => {
            const adapterReady = adapters.find((adapter) => adapter.platform === provider.id)?.ready === true;
            return {
                ...provider,
                ready: adapterReady,
                publishingReady: adapterReady,
                integrationStatus: adapterReady ? "CONFIGURED" : "NOT_CONFIGURED",
            };
        });
    });
    app.get("/api/v1/publishing/adapters", async () => listPublishingAdapters());

    app.get("/api/v1/workspaces/:wid/brand", async (req) => {
        const profile = await prisma.brandProfile.findUnique({ where: { workspaceId: req.params.wid } });
        return profile || { voice: "", audience: "", guidelines: "" };
    });

    app.put("/api/v1/workspaces/:wid/brand", async (req, rep) => {
        const x = z.object({
            voice: z.string().max(5000).default(""),
            audience: z.string().max(5000).default(""),
            guidelines: z.string().max(10000).default(""),
        }).parse(req.body);
        return rep.send(
            await prisma.brandProfile.upsert({
                where: { workspaceId: req.params.wid },
                create: { workspaceId: req.params.wid, ...x },
                update: x,
            })
        );
    });

    app.get("/api/v1/workspaces/:wid/summary", async (req) => {
        const w = req.params.wid;
        const [content, accounts, queued, approvals, unreadInteractions] = await Promise.all([
            prisma.contentItem.count({ where: { workspaceId: w } }),
            prisma.socialAccount.count({ where: { workspaceId: w, isActive: true } }),
            prisma.publication.count({ where: { workspaceId: w, status: "QUEUED" } }),
            prisma.approval.count({ where: { workspaceId: w, status: "PENDING" } }),
            prisma.socialInteraction.count({ where: { workspaceId: w, isRead: false } }),
        ]);
        return { content, accounts, queued, approvals, unreadInteractions };
    });

    app.get("/api/v1/workspaces/:wid/accounts", (req) =>
        prisma.socialAccount.findMany({
            where: { workspaceId: req.params.wid },
            select: { id: true, platform: true, accountName: true, isDevelopment: true, isActive: true, createdAt: true },
        })
    );

    app.post("/api/v1/workspaces/:wid/accounts/dev-connect", async (req, rep) => {
        if (process.env.NODE_ENV === "production") return rep.code(404).send({ error: "Not found" });
        const x = z.object({ platform: z.enum(platforms), accountName: z.string().min(1) }).parse(req.body);
        const a = await prisma.socialAccount.upsert({
            where: { workspaceId_platform_accountName: { workspaceId: req.params.wid, ...x } },
            create: { workspaceId: req.params.wid, ...x, isDevelopment: true },
            update: { isActive: true },
        });
        return rep.code(201).send({
            id: a.id,
            platform: a.platform,
            accountName: a.accountName,
            isDevelopment: a.isDevelopment,
            isActive: a.isActive,
        });
    });

    app.patch("/api/v1/workspaces/:wid/accounts/:id", async (req, rep) => {
        if (process.env.NODE_ENV === "production") return rep.code(404).send({ error: "Not found" });
        const x = z.object({ isActive: z.boolean() }).parse(req.body);
        const existing = await prisma.socialAccount.findFirst({
            where: { id: req.params.id, workspaceId: req.params.wid },
        });
        if (!existing) return rep.code(404).send({ error: "Account not found" });
        return prisma.socialAccount.update({
            where: { id: existing.id },
            data: { isActive: x.isActive },
        });
    });

    app.get("/api/v1/workspaces/:wid/content", (req) =>
        prisma.contentItem.findMany({ where: { workspaceId: req.params.wid }, orderBy: { updatedAt: "desc" } })
    );

    app.post("/api/v1/workspaces/:wid/content", async (req, rep) => {
        const x = z.object({
            title: z.string().min(1),
            body: z.string().default(""),
            platform: z.enum(platforms).nullable().optional(),
        }).parse(req.body);

        const created = await prisma.contentItem.create({
            data: {
                workspaceId: req.params.wid,
                title: x.title.trim(),
                body: x.body,
                ...(x.platform ? { platform: x.platform } : {}),
            },
        });

        await fireAutomations(req.params.wid, "CONTENT_CREATED", {
            contentId: created.id,
            title: created.title,
            body: created.body,
        });

        const refreshed = await prisma.contentItem.findUnique({ where: { id: created.id } });
        return rep.code(201).send(refreshed || created);
    });

    app.post("/api/v1/content/:id/request-approval", async (req, rep) => {
        const c = await prisma.contentItem.findUniqueOrThrow({ where: { id: req.params.id } });
        await prisma.contentItem.update({ where: { id: c.id }, data: { status: "IN_REVIEW" } });
        const approval = await prisma.approval.create({
            data: { workspaceId: c.workspaceId, contentId: c.id },
        });
        await fireAutomations(c.workspaceId, "APPROVAL_REQUESTED", {
            contentId: c.id,
            title: c.title,
            body: c.body,
        });
        return rep.code(201).send(approval);
    });

    app.get("/api/v1/workspaces/:wid/approvals", (req) =>
        prisma.approval.findMany({ where: { workspaceId: req.params.wid, status: "PENDING" } })
    );

    app.post("/api/v1/approvals/:id/decision", async (req) => {
        const x = z.object({
            decision: z.enum(["APPROVED", "REJECTED"]),
            note: z.string().optional(),
        }).parse(req.body);

        const a = await prisma.approval.update({
            where: { id: req.params.id },
            data: { status: x.decision, note: x.note, decidedAt: new Date() },
        });

        const content = await prisma.contentItem.update({
            where: { id: a.contentId },
            data: { status: x.decision === "APPROVED" ? "APPROVED" : "DRAFT" },
        });

        if (x.decision === "APPROVED") {
            await fireAutomations(a.workspaceId, "CONTENT_APPROVED", {
                contentId: content.id,
                title: content.title,
                body: content.body,
            });
        }

        return a;
    });

    app.post("/api/v1/workspaces/:wid/schedule", async (req, rep) => {
        const x = z.object({
            contentItemId: z.string(),
            socialAccountId: z.string().min(1),
            scheduledAt: z.string().datetime(),
        }).parse(req.body);

        const c = await prisma.contentItem.findFirstOrThrow({
            where: { id: x.contentItemId, workspaceId: req.params.wid },
        });
        if (c.status !== "APPROVED") {
            return rep.code(409).send({ error: "Content must be approved before scheduling" });
        }

        const account = await prisma.socialAccount.findFirst({
            where: { id: x.socialAccountId, workspaceId: req.params.wid, isActive: true },
        });
        if (!account) {
            return rep.code(400).send({ error: "Selected social account is not active in this workspace" });
        }
        if (account.isDevelopment) {
            return rep.code(409).send({ error: "Development accounts cannot receive live scheduled publications" });
        }

        const p = await prisma.publication.create({
            data: {
                workspaceId: req.params.wid,
                contentItemId: c.id,
                socialAccountId: x.socialAccountId,
                scheduledAt: new Date(x.scheduledAt),
            },
        });
        await prisma.contentItem.update({
            where: { id: c.id },
            data: { status: "SCHEDULED", scheduledAt: new Date(x.scheduledAt) },
        });
        return rep.code(201).send(p);
    });

    app.get("/api/v1/workspaces/:wid/calendar", (req) =>
        prisma.publication.findMany({
            where: { workspaceId: req.params.wid },
            include: { contentItem: true, socialAccount: true },
            orderBy: { scheduledAt: "asc" },
        })
    );

    app.get("/api/v1/workspaces/:wid/publications", (req) =>
        prisma.publication.findMany({
            where: { workspaceId: req.params.wid },
            include: { contentItem: true, socialAccount: true },
            orderBy: { scheduledAt: "desc" },
            take: 100,
        })
    );

    app.post("/api/v1/workspaces/:wid/publications/:id/cancel", async (req, rep) => {
        const p = await prisma.publication.findFirst({
            where: { id: req.params.id, workspaceId: req.params.wid },
        });
        if (!p) return rep.code(404).send({ error: "Publication not found" });
        if (!["QUEUED", "FAILED"].includes(p.status)) {
            return rep.code(409).send({ error: "Only queued or failed publications can be cancelled" });
        }
        const updated = await prisma.publication.update({
            where: { id: p.id },
            data: { status: "CANCELLED" },
        });
        await prisma.contentItem.update({
            where: { id: p.contentItemId },
            data: { status: "DRAFT", scheduledAt: null },
        });
        return updated;
    });

    app.post("/api/v1/workspaces/:wid/publications/:id/retry", async (req, rep) => {
        const p = await prisma.publication.findFirst({
            where: { id: req.params.id, workspaceId: req.params.wid },
            include: { socialAccount: true },
        });
        if (!p) return rep.code(404).send({ error: "Publication not found" });
        if (p.status !== "FAILED") return rep.code(409).send({ error: "Only failed publications can be retried" });
        if (!p.socialAccountId || !p.socialAccount?.isActive || p.socialAccount.isDevelopment) {
            return rep.code(409).send({ error: "A live connected social account is required before retrying" });
        }
        return prisma.publication.update({
            where: { id: p.id },
            data: { status: "QUEUED", attempts: 0, lastError: null, scheduledAt: new Date() },
        });
    });

    app.post("/api/v1/workspaces/:wid/agents/run", async (req, rep) => {
        const x = z.object({
            agent: z.string().min(1),
            task: z.string().min(3),
            provider: z.enum(["gemini", "groq", "openai", "deepseek"]).optional(),
        }).parse(req.body);

        const run = await prisma.agentRun.create({
            data: {
                workspaceId: req.params.wid,
                agent: x.agent,
                task: x.task,
                status: "RUNNING",
                result: "Executing task...",
            },
        });

        try {
            const outcome = await runAgentTask({
                workspaceId: req.params.wid,
                agent: x.agent,
                task: x.task,
                provider: x.provider,
            });
            const updated = await prisma.agentRun.update({
                where: { id: run.id },
                data: { status: outcome.status, result: outcome.result },
            });
            return rep.code(201).send(updated);
        } catch (err) {
            const failed = await prisma.agentRun.update({
                where: { id: run.id },
                data: { status: "FAILED", result: err?.message || "Agent execution error." },
            });
            return rep.code(201).send(failed);
        }
    });

    app.get("/api/v1/workspaces/:wid/agents/runs", (req) =>
        prisma.agentRun.findMany({ where: { workspaceId: req.params.wid }, orderBy: { createdAt: "desc" } })
    );

    app.get("/api/v1/workspaces/:wid/inbox", (req) =>
        prisma.socialInteraction.findMany({ where: { workspaceId: req.params.wid }, orderBy: { receivedAt: "desc" } })
    );

    app.post("/api/v1/workspaces/:wid/inbox", async (req, rep) => {
        const x = z.object({
            platform: z.enum(platforms),
            author: z.string().min(1),
            message: z.string().min(1),
        }).parse(req.body);

        const created = await prisma.socialInteraction.create({
            data: {
                workspaceId: req.params.wid,
                platform: x.platform,
                author: x.author.trim(),
                message: x.message.trim(),
                isRead: false,
            },
        });
        return rep.code(201).send(created);
    });

    app.post("/api/v1/workspaces/:wid/interactions/:id/read", async (req, rep) => {
        const item = await prisma.socialInteraction.findFirst({
            where: { id: req.params.id, workspaceId: req.params.wid },
        });
        if (!item) return rep.code(404).send({ error: "Interaction not found" });
        return prisma.socialInteraction.update({ where: { id: item.id }, data: { isRead: true } });
    });

    app.get("/api/v1/workspaces/:wid/analytics", (req) =>
        prisma.analyticsSnapshot.findMany({ where: { workspaceId: req.params.wid }, orderBy: { capturedAt: "desc" } })
    );

    app.post("/api/v1/workspaces/:wid/analytics", async (req, rep) => {
        const x = z.object({
            platform: z.enum(platforms).nullable().optional(),
            metric: z.string().min(1).max(120),
            value: z.coerce.number().finite(),
        }).parse(req.body);

        const created = await prisma.analyticsSnapshot.create({
            data: {
                workspaceId: req.params.wid,
                platform: x.platform || null,
                metric: x.metric.trim(),
                value: x.value,
            },
        });
        return rep.code(201).send(created);
    });

    app.get("/api/v1/workspaces/:wid/competitors", (req) =>
        prisma.competitorProfile.findMany({
            where: { workspaceId: req.params.wid },
            orderBy: { updatedAt: "desc" },
        })
    );

    app.post("/api/v1/workspaces/:wid/competitors", async (req, rep) => {
        const x = z.object({
            name: z.string().min(1).max(160),
            platform: z.enum(platforms),
            handle: z.string().min(1).max(160),
            profileUrl: z.string().url().max(500).optional().or(z.literal("")),
            notes: z.string().max(4000).optional().default(""),
            followers: z.coerce.number().int().nonnegative().nullable().optional(),
        }).parse(req.body);

        const normalizedHandle = x.handle.trim().replace(/^@+/, "");
        const created = await prisma.competitorProfile.upsert({
            where: {
                workspaceId_platform_handle: {
                    workspaceId: req.params.wid,
                    platform: x.platform,
                    handle: normalizedHandle,
                },
            },
            create: {
                workspaceId: req.params.wid,
                name: x.name.trim(),
                platform: x.platform,
                handle: normalizedHandle,
                profileUrl: x.profileUrl ? x.profileUrl.trim() : null,
                notes: x.notes.trim(),
                followers: x.followers ?? null,
            },
            update: {
                name: x.name.trim(),
                profileUrl: x.profileUrl ? x.profileUrl.trim() : null,
                notes: x.notes.trim(),
                followers: x.followers ?? null,
            },
        });
        return rep.code(201).send(created);
    });

    app.delete("/api/v1/workspaces/:wid/competitors/:id", async (req, rep) => {
        const existing = await prisma.competitorProfile.findFirst({
            where: { id: req.params.id, workspaceId: req.params.wid },
        });
        if (!existing) return rep.code(404).send({ error: "Competitor not found" });

        await prisma.competitorProfile.delete({ where: { id: existing.id } });
        return { deleted: true };
    });

    app.get("/api/v1/workspaces/:wid/automations", (req) =>
        prisma.automationRule.findMany({
            where: { workspaceId: req.params.wid },
            orderBy: { createdAt: "desc" },
        })
    );

    app.post("/api/v1/workspaces/:wid/automations", async (req, rep) => {
        const x = z.object({
            name: z.string().min(2),
            trigger: z.enum(["CONTENT_CREATED", "APPROVAL_REQUESTED", "CONTENT_APPROVED"]),
            action: z.enum(["REQUEST_APPROVAL", "RUN_AGENT"]),
            agentTask: z.string().max(2000).optional().default(""),
            enabled: z.boolean().optional().default(true),
        }).parse(req.body);

        const created = await prisma.automationRule.create({
            data: { workspaceId: req.params.wid, ...x },
        });
        return rep.code(201).send(created);
    });

    app.patch("/api/v1/workspaces/:wid/automations/:id", async (req, rep) => {
        const existing = await prisma.automationRule.findFirst({
            where: { id: req.params.id, workspaceId: req.params.wid },
        });
        if (!existing) return rep.code(404).send({ error: "Automation not found" });

        const x = z.object({ enabled: z.boolean() }).parse(req.body);
        return prisma.automationRule.update({
            where: { id: existing.id },
            data: { enabled: x.enabled },
        });
    });

    app.delete("/api/v1/workspaces/:wid/automations/:id", async (req, rep) => {
        const existing = await prisma.automationRule.findFirst({
            where: { id: req.params.id, workspaceId: req.params.wid },
        });
        if (!existing) return rep.code(404).send({ error: "Automation not found" });

        await prisma.automationRule.delete({ where: { id: existing.id } });
        return { deleted: true };
    });
}