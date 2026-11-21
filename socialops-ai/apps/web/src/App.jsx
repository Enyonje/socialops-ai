import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertCircle, ArrowUpRight, Bell, CalendarDays, Check, CheckCircle2,
  ChevronRight, CircleHelp, Clock3, Command, FileText, Hash, Home, Inbox,
  Layers3, LoaderCircle, MessageSquare, Plus, Radio, RefreshCw, Search,
  Settings2, ShieldCheck, Sparkles, Target, Users, WandSparkles, X
} from "lucide-react";

const API = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:4000/api/v1" : "/api/v1")).replace(/\/$/, "");
const platforms = ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TIKTOK", "YOUTUBE", "X", "PINTEREST", "THREADS"];
const navigation = [
  { group: "WORKSPACE", items: [["Overview", Home], ["Content Studio", FileText], ["Publishing Calendar", CalendarDays], ["Social Accounts", Radio], ["Unified Inbox", Inbox]] },
  { group: "INTELLIGENCE", items: [["AI Agents", Sparkles], ["Analytics", Activity], ["Competitor Research", Target], ["Social Listening", Search]] },
  { group: "OPERATIONS", items: [["Campaigns", Layers3], ["Automations", WandSparkles], ["Approvals", CheckCircle2], ["Team", Users]] },
  { group: "PREFERENCES", items: [["Brand Profile", Hash], ["Settings", Settings2]] },
];

const emptyWorkspaceData = {
  summary: {},
  content: [],
  accounts: [],
  calendar: [],
  approvals: [],
  runs: [],
  inbox: [],
  analytics: [],
  competitors: [],
  automations: [],
};

const PUBLIC_ROUTES = {
  "/": {
    key: "home",
    title: "SocialOps AI — AI-Powered Social Media Operations & Agent Workspace",
    description:
      "Plan content, enforce approvals, run brand-aware AI agents across Gemini, Groq, OpenAI & DeepSeek, and manage your inbox, analytics, and competitor research in one workspace.",
  },
  "/features": {
    key: "features",
    title: "Features — Content Studio, AI Agents, Automations & Inbox | SocialOps AI",
    description:
      "Explore SocialOps AI modules: multi-provider AI agents, approval workflows, event automations, unified inbox, analytics, and competitor research.",
  },
  "/pricing": {
    key: "pricing",
    title: "Pricing — Plans for Solo Builders, Teams & Agencies | SocialOps AI",
    description:
      "Start free with SocialOps AI or scale across teams and client workspaces with transparent plans.",
  },
  "/guides": {
    key: "guides",
    title: "Social Media Operations Guides & AI Playbooks | SocialOps AI",
    description:
      "Actionable playbooks on content approvals, multi-LLM brand voice consistency, and competitor tracking.",
  },
  "/contact": {
    key: "contact",
    title: "Contact & Sales — SocialOps AI",
    description:
      "Get in touch with SocialOps AI for team rollouts, custom workflows, and agency workspaces.",
  },
};

function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname || "/");

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname || "/");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to) => {
    if (to === window.location.pathname) return;
    window.history.pushState({}, "", to);
    setPathname(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return [pathname, navigate];
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
  } catch {
    throw new Error(`Cannot reach the SocialOps API at ${API}. Check the API deployment and VITE_API_URL.`);
  }
  const type = response.headers.get("content-type") || "";
  const payload = type.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status})`);
  return payload;
}

function ErrorBoundaryFallback({ error, reset }) {
  return (
    <div className="fatal">
      <div className="fatal-icon"><AlertCircle /></div>
      <h1>SocialOps hit an unexpected error</h1>
      <p>{error?.message || "The page could not be rendered."}</p>
      <button type="button" onClick={reset}>Reload workspace</button>
    </div>
  );
}

class AppBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, key: 0 };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          reset={() => this.setState({ error: null, key: this.state.key + 1 })}
        />
      );
    }
    return <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>;
  }
}

function PublicSite({ pathname, navigate, hasWorkspace }) {
  const routeMeta = PUBLIC_ROUTES[pathname] || PUBLIC_ROUTES["/"];
  const route = routeMeta.key;
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", teamSize: "2-10", message: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = routeMeta.title;
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "description");
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", routeMeta.description);
  }, [routeMeta]);

  const modules = [
    {
      icon: Sparkles,
      title: "Multi-Provider AI Agents",
      summary: "Run role-based agents with your brand voice and guidelines across Gemini, Groq, OpenAI, and DeepSeek.",
    },
    {
      icon: CalendarDays,
      title: "Content Studio & Calendar",
      summary: "Draft posts, search your content library, move items through review, and schedule approved publications.",
    },
    {
      icon: ShieldCheck,
      title: "Approval Workflows",
      summary: "Keep brand standards tight with structured review queues before content goes live.",
    },
    {
      icon: WandSparkles,
      title: "Event Automations",
      summary: "Trigger approval requests or agent tasks automatically when drafts are created or approved.",
    },
    {
      icon: Inbox,
      title: "Unified Inbox",
      summary: "Triage incoming messages and mentions across channels with read/unread workflows.",
    },
    {
      icon: Target,
      title: "Competitor Research & Analytics",
      summary: "Track competitor handles, positioning notes, and channel metrics in one workspace.",
    },
  ];

  const guides = [
    {
      slug: "approval-workflows",
      tag: "Operations",
      title: "How to set up content approvals without bottlenecking publishing",
      readTime: "4 min read",
      body: "Define clear draft-to-review rules, pair them with event automations, and schedule only approved items so nothing goes out half-baked.",
    },
    {
      slug: "brand-voice-llms",
      tag: "AI Agents",
      title: "Keeping brand voice consistent when switching LLM providers",
      readTime: "5 min read",
      body: "Centralize voice, audience, and do/don't guidelines in your workspace profile so every prompt starts with the same context.",
    },
    {
      slug: "competitor-tracking",
      tag: "Intelligence",
      title: "A practical framework for tracking competitors across social channels",
      readTime: "4 min read",
      body: "Focus on repeatable angles, cadence, and positioning notes rather than vanity metrics alone.",
    },
  ];

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-container public-nav-row">
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); setSelectedGuide(null); navigate("/"); }}
            className="public-brand"
          >
            <span className="brand-mark">S</span>
            <strong>socialops<span>.ai</span></strong>
          </a>

          <nav className="public-nav" aria-label="Main navigation">
            {[
              ["/", "Overview"],
              ["/features", "Features"],
              ["/pricing", "Pricing"],
              ["/guides", "Guides"],
              ["/contact", "Contact"],
            ].map(([path, label]) => (
              <a
                key={path}
                href={path}
                onClick={(e) => { e.preventDefault(); setSelectedGuide(null); navigate(path); }}
                className={pathname === path ? "active" : ""}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="heading-actions">
            <a
              href="/app"
              onClick={(e) => { e.preventDefault(); navigate("/app"); }}
              className="primary"
            >
              {hasWorkspace ? "Open workspace" : "Get started"} <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </header>

      <main className="public-container public-main">
        {route === "home" && (
          <>
            <section className="public-hero">
              <div className="eyebrow">SOCIAL MEDIA OPERATIONS & AI WORKFLOWS</div>
              <h1>Run your entire social operation from one focused workspace.</h1>
              <p>
                Draft content, enforce approvals, trigger event automations, manage your inbox, track analytics and competitors, and run brand-aware AI agents across Gemini, Groq, OpenAI, and DeepSeek.
              </p>
              <div className="heading-actions">
                <a
                  href="/app"
                  onClick={(e) => { e.preventDefault(); navigate("/app"); }}
                  className="primary"
                >
                  {hasWorkspace ? "Go to your workspace" : "Create free workspace"} <ArrowUpRight size={16} />
                </a>
                <a
                  href="/features"
                  onClick={(e) => { e.preventDefault(); navigate("/features"); }}
                  className="secondary"
                >
                  Explore all modules
                </a>
              </div>
            </section>

            <section className="public-section">
              <div className="panel-head">
                <div>
                  <h2>Everything connected to your brand context</h2>
                  <p>Click any module to inspect how workflows connect end-to-end.</p>
                </div>
                <a
                  href="/features"
                  onClick={(e) => { e.preventDefault(); navigate("/features"); }}
                  className="text-button"
                >
                  Full feature breakdown <ChevronRight size={14} />
                </a>
              </div>
              <div className="public-grid">
                {modules.map(({ icon: Icon, title, summary }) => (
                  <article className="panel" key={title}>
                    <div className="agent-avatar"><Icon size={17} /></div>
                    <h3>{title}</h3>
                    <p>{summary}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {route === "features" && (
          <section className="public-section">
            <div className="eyebrow">PLATFORM CAPABILITIES</div>
            <h1>Built for real execution, from draft to published queue</h1>
            <p className="public-lead">
              Every module shares your workspace brand voice, audience profile, and approval rules.
            </p>
            <div className="public-grid">
              {modules.map(({ icon: Icon, title, summary }) => (
                <article className="panel" key={title}>
                  <div className="agent-avatar"><Icon size={17} /></div>
                  <h2>{title}</h2>
                  <p>{summary}</p>
                </article>
              ))}
            </div>
            <div className="panel public-cta-box">
              <div>
                <h2>Ready to run it on your own brand?</h2>
                <p>Create your independent workspace and configure your brand voice in minutes.</p>
              </div>
              <a
                href="/app"
                onClick={(e) => { e.preventDefault(); navigate("/app"); }}
                className="primary"
              >
                Launch workspace <ArrowUpRight size={15} />
              </a>
            </div>
          </section>
        )}

        {route === "pricing" && (
          <section className="public-section">
            <div className="eyebrow">PRICING</div>
            <h1>Simple, transparent plans</h1>
            <p className="public-lead">Start with a self-serve workspace or reach out for agency and multi-team rollouts.</p>
            <div className="public-grid">
              {[
                {
                  name: "Starter",
                  price: "$0",
                  desc: "For solo founders and creators testing AI workflows.",
                  perks: ["1 workspace & brand profile", "Content Studio & approval queue", "Multi-provider AI Agents & automations"],
                  cta: "Start free",
                  href: "/app",
                },
                {
                  name: "Growth",
                  price: "$49/mo",
                  desc: "For lean marketing teams shipping daily across channels.",
                  perks: ["Unlimited drafts & automation rules", "Unified Inbox & Analytics snapshots", "Competitor Research & tracking"],
                  cta: "Create workspace",
                  href: "/app",
                },
                {
                  name: "Agency & Custom",
                  price: "Custom",
                  desc: "For agencies managing multiple client workspaces.",
                  perks: ["Multi-workspace setup support", "Custom publishing integrations", "Dedicated onboarding"],
                  cta: "Talk to sales",
                  href: "/contact",
                },
              ].map((tier) => (
                <article className="panel public-tier" key={tier.name}>
                  <div>
                    <h2>{tier.name}</h2>
                    <strong className="tier-price">{tier.price}</strong>
                    <p>{tier.desc}</p>
                    <ul className="tier-list">
                      {tier.perks.map((perk) => (
                        <li key={perk}><Check size={14} /> <span>{perk}</span></li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={tier.href}
                    onClick={(e) => { e.preventDefault(); navigate(tier.href); }}
                    className="primary full"
                  >
                    {tier.cta}
                  </a>
                </article>
              ))}
            </div>
          </section>
        )}

        {route === "guides" && (
          <section className="public-section">
            <div className="eyebrow">GUIDES & PLAYBOOKS</div>
            <h1>Social operations playbooks</h1>
            <p className="public-lead">Practical workflows for approvals, AI prompting, and channel intelligence.</p>
            {selectedGuide ? (
              <article className="panel">
                <button type="button" className="text-button" onClick={() => setSelectedGuide(null)}>
                  ← Back to all guides
                </button>
                <div className="eyebrow">{selectedGuide.tag} · {selectedGuide.readTime}</div>
                <h2>{selectedGuide.title}</h2>
                <p>{selectedGuide.body}</p>
                <a
                  href="/app"
                  onClick={(e) => { e.preventDefault(); navigate("/app"); }}
                  className="primary"
                >
                  Apply this in your workspace
                </a>
              </article>
            ) : (
              <div className="public-grid">
                {guides.map((g) => (
                  <article className="panel" key={g.slug}>
                    <div className="eyebrow">{g.tag} · {g.readTime}</div>
                    <h2>{g.title}</h2>
                    <p>{g.body}</p>
                    <button type="button" className="text-button" onClick={() => setSelectedGuide(g)}>
                      Read guide <ChevronRight size={14} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {route === "contact" && (
          <section className="public-section">
            <div className="panel public-contact">
              <div className="eyebrow">CONTACT & SALES</div>
              <h1>Tell us about your social operation</h1>
              <p>Ask about multi-workspace setups, custom integrations, or team onboarding.</p>
              {submitted ? (
                <div className="alert alert-success">
                  <Check size={17} /> Inquiry received. You can also launch a workspace immediately via Get Started.
                </div>
              ) : (
                <form className="brand-form" onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>
                  <label>
                    Your name
                    <input required value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
                  </label>
                  <label>
                    Work email
                    <input type="email" required value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                  </label>
                  <label>
                    Team size
                    <select value={contactForm.teamSize} onChange={(e) => setContactForm({ ...contactForm, teamSize: e.target.value })}>
                      <option value="1">Solo creator / founder</option>
                      <option value="2-10">2–10 team members</option>
                      <option value="11+">11+ / Agency</option>
                    </select>
                  </label>
                  <label>
                    What would you like to streamline?
                    <textarea rows="4" required value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} />
                  </label>
                  <button type="submit" className="primary">Send inquiry</button>
                </form>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="public-footer">
        <div className="public-container public-nav-row">
          <span>◈ SOCIALOPS AI · Independent social media operations platform</span>
          <div className="heading-actions">
            <a href="/features" onClick={(e) => { e.preventDefault(); navigate("/features"); }}>Features</a>
            <a href="/pricing" onClick={(e) => { e.preventDefault(); navigate("/pricing"); }}>Pricing</a>
            <a href="/guides" onClick={(e) => { e.preventDefault(); navigate("/guides"); }}>Guides</a>
            <a href="/app" onClick={(e) => { e.preventDefault(); navigate("/app"); }}>Workspace</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App({ onBackToSite }) {
  const [workspaceId, setWorkspaceId] = useState(() => localStorage.getItem("socialops.workspace") || "");
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [organizationName, setOrganizationName] = useState("My Organization");
  const [page, setPage] = useState("Overview");

  const [data, setData] = useState(emptyWorkspaceData);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [showComposer, setShowComposer] = useState(false);

  // Content & Schedule state
  const [draft, setDraft] = useState({ title: "", body: "", platform: "" });
  const [scheduleForm, setScheduleForm] = useState({ contentItemId: "", socialAccountId: "", scheduledAt: "" });

  // Social Accounts state
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [accountName, setAccountName] = useState("");

  // AI Agents state
  const [agentRole, setAgentRole] = useState("Content Strategist");
  const [agentProvider, setAgentProvider] = useState("gemini");
  const [agentTask, setAgentTask] = useState("");

  // Inbox state
  const [inboxFilter, setInboxFilter] = useState("ALL");
  const [inboxForm, setInboxForm] = useState({ platform: "INSTAGRAM", author: "", message: "" });

  // Analytics state
  const [analyticsPlatformFilter, setAnalyticsPlatformFilter] = useState("ALL");
  const [metricForm, setMetricForm] = useState({ platform: "", metric: "Impressions", value: "" });

  // Competitor Research state
  const [competitorForm, setCompetitorForm] = useState({
    name: "",
    platform: "LINKEDIN",
    handle: "",
    profileUrl: "",
    followers: "",
    notes: "",
  });

  // Automations state
  const [ruleForm, setRuleForm] = useState({
    name: "",
    trigger: "CONTENT_CREATED",
    action: "REQUEST_APPROVAL",
    agentTask: "",
  });

  // Brand & Workspace state
  const [brand, setBrand] = useState({ voice: "", audience: "", guidelines: "" });
  const [workspaceSettings, setWorkspaceSettings] = useState({
    organizationName: "My Organization",
    workspaceName: "My Workspace",
    apiUrl: API,
  });

  // Local operational logs for Listening, Campaigns, and Team
  const [listeningQuery, setListeningQuery] = useState("");
  const [listeningPlatform, setListeningPlatform] = useState("ALL");
  const [campaigns, setCampaigns] = useState(() => {
    try { return JSON.parse(localStorage.getItem("socialops.campaigns") || "[]"); } catch { return []; }
  });
  const [campaignForm, setCampaignForm] = useState({ name: "", objective: "", channel: "LINKEDIN", status: "ACTIVE" });
  const [teamMembers, setTeamMembers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("socialops.team") || "[]"); } catch { return []; }
  });
  const [teamForm, setTeamForm] = useState({ name: "", email: "", role: "Editor" });

  useEffect(() => {
    document.title = `${page} — SocialOps AI Workspace`;
  }, [page]);

  useEffect(() => {
    try { localStorage.setItem("socialops.campaigns", JSON.stringify(campaigns)); } catch { }
  }, [campaigns]);

  useEffect(() => {
    try { localStorage.setItem("socialops.team", JSON.stringify(teamMembers)); } catch { }
  }, [teamMembers]);

  const flash = useCallback((message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4000);
  }, []);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");

    const sources = [
      ["summary", "summary", {}],
      ["content", "content", []],
      ["accounts", "accounts", []],
      ["calendar", "calendar", []],
      ["approvals", "approvals", []],
      ["runs", "agents/runs", []],
      ["inbox", "inbox", []],
      ["analytics", "analytics", []],
      ["competitors", "competitors", []],
      ["automations", "automations", []],
    ];

    const results = await Promise.allSettled(
      sources.map(([, endpoint]) => request(`/workspaces/${workspaceId}/${endpoint}`))
    );

    const next = { ...emptyWorkspaceData };
    const failures = [];

    results.forEach((result, index) => {
      const [key, , fallback] = sources[index];
      if (result.status === "fulfilled") {
        if (Array.isArray(fallback)) {
          next[key] = Array.isArray(result.value) ? result.value : fallback;
        } else {
          next[key] = result.value && typeof result.value === "object" ? result.value : fallback;
        }
      } else {
        next[key] = fallback;
        failures.push(`${key}: ${result.reason.message}`);
      }
    });

    setData(next);
    if (failures.length) setError(`Some workspace data could not load. ${failures.join(" · ")}`);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!workspaceId) return;
    request(`/workspaces/${workspaceId}/brand`)
      .then((value) => setBrand(value || { voice: "", audience: "", guidelines: "" }))
      .catch(() => { });
  }, [workspaceId]);

  async function createWorkspace(event) {
    event.preventDefault();
    setBootstrapping(true);
    setError("");
    try {
      const result = await request("/bootstrap", {
        method: "POST",
        body: JSON.stringify({ organizationName, workspaceName }),
      });
      localStorage.setItem("socialops.workspace", result.workspace.id);
      setWorkspaceId(result.workspace.id);
      setWorkspaceSettings((prev) => ({ ...prev, organizationName, workspaceName }));
      flash("Your SocialOps workspace is ready.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBootstrapping(false);
    }
  }

  async function createDraft(event) {
    event.preventDefault();
    try {
      await request(`/workspaces/${workspaceId}/content`, {
        method: "POST",
        body: JSON.stringify({
          title: draft.title,
          body: draft.body,
          ...(draft.platform ? { platform: draft.platform } : {}),
        }),
      });
      setDraft({ title: "", body: "", platform: "" });
      setShowComposer(false);
      await load();
      flash("Draft saved to your content library.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function requestApproval(contentId) {
    try {
      await request(`/content/${contentId}/request-approval`, { method: "POST" });
      await load();
      flash("Submitted for approval.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function schedulePost(event) {
    event.preventDefault();
    try {
      const isoDate = scheduleForm.scheduledAt ? new Date(scheduleForm.scheduledAt).toISOString() : "";
      await request(`/workspaces/${workspaceId}/schedule`, {
        method: "POST",
        body: JSON.stringify({
          contentItemId: scheduleForm.contentItemId,
          socialAccountId: scheduleForm.socialAccountId,
          scheduledAt: isoDate,
        }),
      });
      setScheduleForm({ contentItemId: "", socialAccountId: "", scheduledAt: "" });
      await load();
      flash("Post scheduled to publishing calendar.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function submitAgent(event) {
    event.preventDefault();
    try {
      await request(`/workspaces/${workspaceId}/agents/run`, {
        method: "POST",
        body: JSON.stringify({ agent: agentRole, task: agentTask, provider: agentProvider }),
      });
      setAgentTask("");
      await load();
      flash("Agent task executed.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function approvalDecision(id, decision) {
    try {
      await request(`/approvals/${id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      await load();
      flash(`Content ${decision.toLowerCase()}.`);
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveBrand(event) {
    event.preventDefault();
    try {
      await request(`/workspaces/${workspaceId}/brand`, {
        method: "PUT",
        body: JSON.stringify(brand),
      });
      flash("Brand profile saved.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function connectSocialAccount(event) {
    event.preventDefault();
    if (!selectedPlatform || !accountName.trim()) return;
    try {
      await request(`/workspaces/${workspaceId}/accounts/dev-connect`, {
        method: "POST",
        body: JSON.stringify({ platform: selectedPlatform, accountName: accountName.trim() }),
      });
      setAccountName("");
      await load();
      flash(`${prettyPlatform(selectedPlatform)} account connected.`);
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleSocialAccount(account) {
    try {
      await request(`/workspaces/${workspaceId}/accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      await load();
      flash(`${account.accountName} ${!account.isActive ? "activated" : "disconnected"}.`);
    } catch (e) {
      setError(e.message);
    }
  }

  async function createInboxMessage(event) {
    event.preventDefault();
    try {
      await request(`/workspaces/${workspaceId}/inbox`, {
        method: "POST",
        body: JSON.stringify(inboxForm),
      });
      setInboxForm({ platform: inboxForm.platform, author: "", message: "" });
      await load();
      flash("Message added to Unified Inbox.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function markInboxRead(id) {
    try {
      await request(`/workspaces/${workspaceId}/interactions/${id}/read`, { method: "POST" });
      await load();
      flash("Marked as read.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function recordMetric(event) {
    event.preventDefault();
    if (metricForm.value === "") return;
    try {
      await request(`/workspaces/${workspaceId}/analytics`, {
        method: "POST",
        body: JSON.stringify({
          platform: metricForm.platform || null,
          metric: metricForm.metric,
          value: Number(metricForm.value),
        }),
      });
      setMetricForm({ ...metricForm, value: "" });
      await load();
      flash("Analytics metric recorded.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveCompetitor(event) {
    event.preventDefault();
    try {
      await request(`/workspaces/${workspaceId}/competitors`, {
        method: "POST",
        body: JSON.stringify({
          ...competitorForm,
          followers: competitorForm.followers === "" ? null : Number(competitorForm.followers),
        }),
      });
      setCompetitorForm({
        name: "",
        platform: competitorForm.platform,
        handle: "",
        profileUrl: "",
        followers: "",
        notes: "",
      });
      await load();
      flash("Competitor profile saved.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeCompetitor(id) {
    try {
      await request(`/workspaces/${workspaceId}/competitors/${id}`, { method: "DELETE" });
      await load();
      flash("Competitor removed.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function createAutomation(event) {
    event.preventDefault();
    try {
      await request(`/workspaces/${workspaceId}/automations`, {
        method: "POST",
        body: JSON.stringify(ruleForm),
      });
      setRuleForm({ name: "", trigger: "CONTENT_CREATED", action: "REQUEST_APPROVAL", agentTask: "" });
      await load();
      flash("Automation rule created.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleAutomation(rule) {
    try {
      await request(`/workspaces/${workspaceId}/automations/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      await load();
      flash(`Automation ${!rule.enabled ? "enabled" : "paused"}.`);
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteAutomation(id) {
    try {
      await request(`/workspaces/${workspaceId}/automations/${id}`, { method: "DELETE" });
      await load();
      flash("Automation deleted.");
    } catch (e) {
      setError(e.message);
    }
  }

  function addCampaign(event) {
    event.preventDefault();
    if (!campaignForm.name.trim()) return;
    setCampaigns((prev) => [
      { id: String(Date.now()), ...campaignForm, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setCampaignForm({ name: "", objective: "", channel: campaignForm.channel, status: "ACTIVE" });
    flash("Campaign added.");
  }

  function addTeamMember(event) {
    event.preventDefault();
    if (!teamForm.name.trim() || !teamForm.email.trim()) return;
    setTeamMembers((prev) => [
      { id: String(Date.now()), ...teamForm },
      ...prev,
    ]);
    setTeamForm({ name: "", email: "", role: teamForm.role });
    flash("Team member added.");
  }

  function saveWorkspacePreferences(event) {
    event.preventDefault();
    setOrganizationName(workspaceSettings.organizationName.trim() || "My Organization");
    setWorkspaceName(workspaceSettings.workspaceName.trim() || "My Workspace");
    flash("Workspace settings updated.");
  }

  function resetWorkspaceSession() {
    localStorage.removeItem("socialops.workspace");
    setWorkspaceId("");
    setData(emptyWorkspaceData);
    setPage("Overview");
  }

  const contentList = Array.isArray(data.content) ? data.content : [];
  const accountList = Array.isArray(data.accounts) ? data.accounts : [];
  const calendarList = Array.isArray(data.calendar) ? data.calendar : [];
  const approvalList = Array.isArray(data.approvals) ? data.approvals : [];
  const runList = Array.isArray(data.runs) ? data.runs : [];
  const inboxList = Array.isArray(data.inbox) ? data.inbox : [];
  const analyticsList = Array.isArray(data.analytics) ? data.analytics : [];
  const competitorList = Array.isArray(data.competitors) ? data.competitors : [];
  const automationList = Array.isArray(data.automations) ? data.automations : [];

  const filteredContent = useMemo(
    () => contentList.filter((item) => `${item.title || ""} ${item.body || ""}`.toLowerCase().includes(search.toLowerCase())),
    [contentList, search]
  );

  const approvedContent = useMemo(
    () => contentList.filter((item) => item.status === "APPROVED"),
    [contentList]
  );

  const activeAccounts = useMemo(
    () => accountList.filter((acc) => acc.isActive),
    [accountList]
  );

  const stats = data.summary || {};

  if (!workspaceId) {
    return (
      <div className="onboarding">
        <div className="onboard-card">
          <div className="brand-mark">S</div>
          <div className="eyebrow">YOUR SOCIAL OPERATIONS HQ</div>
          <h1>Make social work<br /><span>smarter.</span></h1>
          <p>Create your independent SocialOps workspace to plan content, coordinate channels and build your social media operation.</p>
          <form onSubmit={createWorkspace}>
            <label>
              Organization name
              <input required minLength="2" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
            </label>
            <label>
              Workspace name
              <input required minLength="2" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
            </label>
            <button type="submit" className="primary full" disabled={bootstrapping}>
              {bootstrapping ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} Create workspace
            </button>
          </form>
          {error && <div className="inline-error"><AlertCircle size={16} />{error}</div>}
          {onBackToSite && (
            <button type="button" className="text-button" onClick={onBackToSite}>
              ← Back to website
            </button>
          )}
          <small className="onboard-foot">Independent platform · Your own workspace · No Nexus Core account required</small>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div><strong>socialops<span>.ai</span></strong><small>SOCIAL COMMAND CENTER</small></div>
        </div>
        <div className="workspace-switch">
          <div className="workspace-avatar">{workspaceName.slice(0, 1).toUpperCase()}</div>
          <div><b>{workspaceName}</b><small>{organizationName}</small></div>
          <ChevronRight size={15} />
        </div>
        <nav>
          {navigation.map((section) => (
            <div className="nav-group" key={section.group}>
              <small>{section.group}</small>
              {section.items.map(([name, Icon]) => (
                <button
                  type="button"
                  key={name}
                  className={`nav-item ${page === name ? "active" : ""}`}
                  onClick={() => setPage(name)}
                >
                  <Icon size={17} />
                  <span>{name}</span>
                  {name === "Approvals" && approvalList.length > 0 && <i>{approvalList.length}</i>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-box">
            <CircleHelp size={17} />
            <div><b>Need a hand?</b><small>Workspace ID: {workspaceId.slice(0, 8)}…</small></div>
          </div>
          <button type="button" className="profile-row nav-item" onClick={() => setPage("Settings")}>
            <div className="profile-avatar">SO</div>
            <div><b>Workspace owner</b><small>Active workspace</small></div>
            <Settings2 size={16} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb"><span>WORKSPACE</span><ChevronRight size={13} /><b>{page}</b></div>
          <div className="top-actions">
            {onBackToSite && (
              <button type="button" className="secondary small" onClick={onBackToSite}>
                Public site
              </button>
            )}
            <div className="api-status"><span /> {API}</div>
            <button type="button" className="icon-button" title="Refresh data" onClick={load}>
              <RefreshCw size={17} className={loading ? "spin" : ""} />
            </button>
            <button type="button" className="icon-button" title="Notifications" onClick={() => setPage("Unified Inbox")}>
              <Bell size={17} />
            </button>
            <div className="top-avatar">SO</div>
          </div>
        </header>

        <div className="page-heading">
          <div>
            <div className="eyebrow">SOCIALOPS WORKSPACE</div>
            <h1>{page}</h1>
            <p>{pageDescription(page)}</p>
          </div>
          <div className="heading-actions">
            {page === "Content Studio" && (
              <button type="button" className="primary" onClick={() => setShowComposer(true)}>
                <Plus size={16} /> Create content
              </button>
            )}
            {page === "Overview" && (
              <button type="button" className="primary" onClick={() => { setPage("Content Studio"); setShowComposer(true); }}>
                <Plus size={16} /> New post
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={17} />
            <span>{error}</span>
            <button type="button" onClick={() => setError("")}><X size={15} /></button>
          </div>
        )}
        {notice && <div className="alert alert-success"><Check size={17} />{notice}</div>}
        {loading && <div className="loading-line"><span /></div>}

        {page === "Overview" && (
          <>
            <section className="welcome-banner">
              <div>
                <div className="eyebrow light">YOUR SOCIAL PRESENCE, IN SYNC</div>
                <h2>Build a brand people<br />want to follow.</h2>
                <p>Plan, create, publish and learn — all from one workspace.</p>
                <button type="button" className="banner-button" onClick={() => setPage("Content Studio")}>
                  Go to Content Studio <ArrowUpRight size={15} />
                </button>
              </div>
              <div className="banner-art">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="orbit-core"><Command size={37} /></div>
                <div className="orbit-node node-a"><Sparkles size={18} /></div>
                <div className="orbit-node node-b"><CalendarDays size={18} /></div>
                <div className="orbit-node node-c"><Activity size={18} /></div>
              </div>
            </section>

            <section className="metric-grid">
              {[
                ["Content items", stats.content ?? contentList.length, FileText, "In your library"],
                ["Connected profiles", stats.accounts ?? activeAccounts.length, Radio, "Active social accounts"],
                ["Scheduled posts", stats.queued ?? calendarList.length, Clock3, "In publishing queue"],
                ["Pending approvals", stats.approvals ?? approvalList.length, ShieldCheck, "Needs your review"],
              ].map(([label, value, Icon, hint]) => (
                <article className="metric-card" key={label}>
                  <div className="metric-top"><span>{label}</span><div><Icon size={17} /></div></div>
                  <strong>{value}</strong>
                  <small>{hint}</small>
                </article>
              ))}
            </section>

            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-head">
                  <div><h3>Recent content</h3><p>Your latest drafts and posts</p></div>
                  <button type="button" className="text-button" onClick={() => setPage("Content Studio")}>
                    View library <ChevronRight size={14} />
                  </button>
                </div>
                {contentList.length ? (
                  contentList.slice(0, 5).map((item) => <ContentRow key={item.id} item={item} />)
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="Your content studio is ready"
                    text="Create your first draft to start building your publishing pipeline."
                    action="Create a draft"
                    onAction={() => { setPage("Content Studio"); setShowComposer(true); }}
                  />
                )}
              </article>

              <article className="panel">
                <div className="panel-head">
                  <div><h3>Workspace checklist</h3><p>Set up your social operations</p></div>
                  <span className="pill">Getting started</span>
                </div>
                <Checklist
                  rows={[
                    ["Create your first post", contentList.length > 0, () => { setPage("Content Studio"); setShowComposer(true); }],
                    ["Connect a social profile", activeAccounts.length > 0, () => setPage("Social Accounts")],
                    ["Set your brand voice", Boolean(brand.voice), () => setPage("Brand Profile")],
                    ["Review your publishing queue", calendarList.length > 0, () => setPage("Publishing Calendar")],
                  ]}
                />
              </article>
            </section>
          </>
        )}

        {page === "Content Studio" && (
          <>
            <div className="toolbar">
              <div className="search-field">
                <Search size={16} />
                <input
                  placeholder="Search your content library..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="muted">{filteredContent.length} items</span>
            </div>

            {showComposer && (
              <section className="panel composer-panel">
                <div className="panel-head">
                  <div>
                    <h3>Create content</h3>
                    <p>Save a draft to your library, submit for approval, then schedule to a connected channel.</p>
                  </div>
                  <button type="button" className="icon-button" onClick={() => setShowComposer(false)}>
                    <X size={17} />
                  </button>
                </div>
                <form className="form-grid" onSubmit={createDraft}>
                  <label>
                    Post title
                    <input
                      required
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      placeholder="Give your post a working title"
                    />
                  </label>
                  <label>
                    Target platform
                    <select value={draft.platform} onChange={(e) => setDraft({ ...draft, platform: e.target.value })}>
                      <option value="">Not selected</option>
                      {platforms.map((p) => <option key={p} value={p}>{prettyPlatform(p)}</option>)}
                    </select>
                  </label>
                  <label className="wide">
                    Caption / post copy
                    <textarea
                      rows="5"
                      value={draft.body}
                      onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                      placeholder="What do you want to say?"
                    />
                  </label>
                  <div className="form-actions">
                    <button type="button" className="secondary" onClick={() => setShowComposer(false)}>Cancel</button>
                    <button type="submit" className="primary"><Plus size={15} /> Save draft</button>
                  </div>
                </form>
              </section>
            )}

            <section className="panel">
              <div className="panel-head">
                <div><h3>Content library</h3><p>Drafts, reviews, approved and scheduled content</p></div>
              </div>
              {filteredContent.length ? (
                filteredContent.map((item) => (
                  <ContentRow
                    key={item.id}
                    item={item}
                    onReview={item.status === "DRAFT" ? () => requestApproval(item.id) : undefined}
                  />
                ))
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No matching content"
                  text="Your content library will appear here as you create drafts."
                  action="Create content"
                  onAction={() => setShowComposer(true)}
                />
              )}
            </section>
          </>
        )}

        {page === "Publishing Calendar" && (
          <section className="dashboard-grid">
            <article className="panel">
              <div className="panel-head">
                <div><h3>Schedule approved post</h3><p>Assign an approved content item and active account</p></div>
                <CalendarDays size={19} />
              </div>
              <form className="brand-form" onSubmit={schedulePost}>
                <label>
                  Approved content
                  <select
                    required
                    value={scheduleForm.contentItemId}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, contentItemId: e.target.value })}
                  >
                    <option value="">Select approved content</option>
                    {approvedContent.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </label>
                <label>
                  Social account
                  <select
                    required
                    value={scheduleForm.socialAccountId}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, socialAccountId: e.target.value })}
                  >
                    <option value="">Select connected account</option>
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{prettyPlatform(a.platform)} · {a.accountName}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Publish date & time
                  <input
                    type="datetime-local"
                    required
                    value={scheduleForm.scheduledAt}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                  />
                </label>
                <button type="submit" className="primary" disabled={!approvedContent.length || !activeAccounts.length}>
                  <Plus size={15} /> Schedule post
                </button>
              </form>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div><h3>Publishing queue</h3><p>Scheduled and queued publications</p></div>
                <span className="pill">{calendarList.length} scheduled</span>
              </div>
              {calendarList.length ? (
                calendarList.map((item) => (
                  <div className="list-row" key={item.id}>
                    <div className="date-tile">
                      <b>{new Date(item.scheduledAt).getDate()}</b>
                      <small>{new Date(item.scheduledAt).toLocaleString(undefined, { month: "short" })}</small>
                    </div>
                    <div className="row-main">
                      <b>{item.contentItem?.title || "Untitled post"}</b>
                      <small>{new Date(item.scheduledAt).toLocaleString()} · {item.socialAccount?.accountName || "No destination selected"}</small>
                    </div>
                    <Status value={item.status} />
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="Your calendar is clear"
                  text="Approve content and schedule it on the left to populate your publishing queue."
                  action="Create a post"
                  onAction={() => { setPage("Content Studio"); setShowComposer(true); }}
                />
              )}
            </article>
          </section>
        )}

        {page === "Social Accounts" && (
          <>
            <div className="callout">
              <Radio size={18} />
              <div>
                <b>Connect your social channels</b>
                <p>Select a channel to inspect linked accounts or manage connection status.</p>
              </div>
            </div>
            <section className="platform-grid">
              {platforms.map((platform) => {
                const linked = accountList.filter((a) => a.platform === platform && a.isActive);
                const isSelected = selectedPlatform === platform;
                return (
                  <button
                    type="button"
                    className={`platform-card ${isSelected ? "selected" : ""}`}
                    key={platform}
                    onClick={() => setSelectedPlatform(isSelected ? "" : platform)}
                  >
                    <div className="platform-symbol">{platform.slice(0, 1)}</div>
                    <div className="platform-info">
                      <b>{prettyPlatform(platform)}</b>
                      <small>{linked.length ? `${linked.length} account${linked.length > 1 ? "s" : ""} connected` : "Not connected"}</small>
                    </div>
                    <span className={`connection-dot ${linked.length ? "connected" : ""}`} />
                  </button>
                );
              })}
            </section>
            {selectedPlatform && (() => {
              const linked = accountList.filter((a) => a.platform === selectedPlatform);
              return (
                <section className="panel platform-detail">
                  <div className="panel-head">
                    <div>
                      <h3>{prettyPlatform(selectedPlatform)}</h3>
                      <p>{linked.length ? `${linked.length} account(s) in workspace` : "No account connected yet"}</p>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Close platform details"
                      onClick={() => { setSelectedPlatform(""); setAccountName(""); }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form className="form-grid" onSubmit={connectSocialAccount}>
                    <label className="wide">
                      Account handle or page name
                      <input
                        required
                        minLength="1"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder={`e.g. @${selectedPlatform.toLowerCase()}_handle`}
                      />
                    </label>
                    <div className="form-actions">
                      <button type="submit" className="primary small">
                        <Plus size={14} /> Connect account
                      </button>
                    </div>
                  </form>

                  {linked.length ? (
                    linked.map((acc) => (
                      <div className="list-row" key={acc.id}>
                        <div className="row-main">
                          <b>{acc.accountName || selectedPlatform}</b>
                          <small>{acc.isActive ? "Active" : "Inactive"}{acc.isDevelopment ? " · Dev account" : ""}</small>
                        </div>
                        <Status value={acc.isActive ? "CONNECTED" : "DISCONNECTED"} />
                        <button type="button" className="secondary small" onClick={() => toggleSocialAccount(acc)}>
                          {acc.isActive ? "Disconnect" : "Reconnect"}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="muted-note">
                      No {prettyPlatform(selectedPlatform)} account added yet.
                    </p>
                  )}
                </section>
              );
            })()}
          </>
        )}

        {page === "AI Agents" && (
          <div className="agent-workspace">
            <article className="panel agent-composer">
              <div className="panel-head">
                <div>
                  <h3>AI Intelligence Command Center</h3>
                  <p>Select an agent persona, choose a model provider, and run social workflows</p>
                </div>
                <Sparkles size={20} />
              </div>

              <form className="agent-form" onSubmit={submitAgent}>
                <div className="form-grid">
                  <label>
                    Agent specialist
                    <select value={agentRole} onChange={(e) => setAgentRole(e.target.value)}>
                      <option value="Content Strategist">Content Strategist</option>
                      <option value="Copywriter">Social Copywriter</option>
                      <option value="Campaign Planner">Campaign Planner</option>
                      <option value="Audience Analyst">Audience & Trend Analyst</option>
                    </select>
                  </label>

                  <label>
                    Model provider
                    <select value={agentProvider} onChange={(e) => setAgentProvider(e.target.value)}>
                      <option value="gemini">Gemini</option>
                      <option value="groq">Groq (Llama 3.3)</option>
                      <option value="openai">OpenAI</option>
                      <option value="deepseek">DeepSeek</option>
                    </select>
                  </label>
                </div>

                <label>
                  Task brief & context
                  <textarea
                    className="agent-textarea"
                    rows="7"
                    required
                    minLength="3"
                    value={agentTask}
                    onChange={(e) => setAgentTask(e.target.value)}
                    placeholder="Describe your goal, target channel, tone, and deliverables in detail..."
                  />
                </label>

                <div className="agent-form-footer">
                  <small className="muted">Brand profile voice and audience guidelines are included automatically.</small>
                  <button type="submit" className="primary" disabled={!agentTask.trim()}>
                    <Sparkles size={16} /> Run agent
                  </button>
                </div>
              </form>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <h3>Intelligence outputs</h3>
                  <p>{runList.length} run{runList.length === 1 ? "" : "s"} in workspace history</p>
                </div>
              </div>

              {runList.length ? (
                <div className="agent-runs-list">
                  {runList.map((run) => (
                    <div className="agent-run-card" key={run.id}>
                      <div className="agent-run-head">
                        <div className="agent-run-title">
                          <div className="agent-avatar"><Sparkles size={16} /></div>
                          <div>
                            <b>{run.agent}</b>
                            {run.createdAt && <small>{new Date(run.createdAt).toLocaleString()}</small>}
                          </div>
                        </div>
                        <div className="heading-actions">
                          {run.result && (
                            <button
                              type="button"
                              className="secondary small"
                              onClick={() => {
                                navigator.clipboard?.writeText(run.result);
                                flash("Output copied to clipboard.");
                              }}
                            >
                              Copy output
                            </button>
                          )}
                          <Status value={run.status} />
                        </div>
                      </div>

                      <div className="agent-prompt-box">
                        <span>PROMPT</span>
                        <p>{run.task}</p>
                      </div>

                      {run.result && (
                        <div className="agent-output-box">
                          <span>RESPONSE</span>
                          <div className="agent-output-text">{run.result}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No agent outputs yet"
                  text="Write a brief above to generate content plans, hooks, or campaign strategies."
                />
              )}
            </article>
          </div>
        )}

        {page === "Analytics" && (() => {
          const filteredMetrics = analyticsPlatformFilter === "ALL"
            ? analyticsList
            : analyticsList.filter((m) => (m.platform || "WORKSPACE") === analyticsPlatformFilter);

          return (
            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-head">
                  <div><h3>Record performance metric</h3><p>Log channel snapshots or metrics from connected accounts</p></div>
                  <Activity size={19} />
                </div>
                <form className="brand-form" onSubmit={recordMetric}>
                  <label>
                    Channel
                    <select value={metricForm.platform} onChange={(e) => setMetricForm({ ...metricForm, platform: e.target.value })}>
                      <option value="">Workspace-wide</option>
                      {platforms.map((p) => <option key={p} value={p}>{prettyPlatform(p)}</option>)}
                    </select>
                  </label>
                  <label>
                    Metric name
                    <input
                      required
                      value={metricForm.metric}
                      onChange={(e) => setMetricForm({ ...metricForm, metric: e.target.value })}
                      placeholder="e.g. Impressions, Reach, Engagement Rate"
                    />
                  </label>
                  <label>
                    Value
                    <input
                      type="number"
                      step="any"
                      required
                      value={metricForm.value}
                      onChange={(e) => setMetricForm({ ...metricForm, value: e.target.value })}
                      placeholder="e.g. 12450"
                    />
                  </label>
                  <button type="submit" className="primary"><Plus size={15} /> Save metric</button>
                </form>
              </article>

              <article className="panel">
                <div className="panel-head">
                  <div><h3>Performance overview</h3><p>Platform metrics collected in workspace</p></div>
                  <select value={analyticsPlatformFilter} onChange={(e) => setAnalyticsPlatformFilter(e.target.value)}>
                    <option value="ALL">All channels</option>
                    <option value="WORKSPACE">Workspace-wide</option>
                    {platforms.map((p) => <option key={p} value={p}>{prettyPlatform(p)}</option>)}
                  </select>
                </div>

                {filteredMetrics.length ? (
                  <div className="analytics-grid">
                    {filteredMetrics.map((metric) => (
                      <article key={metric.id}>
                        <small>{metric.metric}</small>
                        <b>{Number(metric.value).toLocaleString()}</b>
                        <span>
                          {metric.platform ? prettyPlatform(metric.platform) : "Workspace"}
                          {metric.capturedAt ? ` · ${new Date(metric.capturedAt).toLocaleDateString()}` : ""}
                        </span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Activity}
                    title="No analytics data yet"
                    text="Record a metric snapshot on the left to view performance."
                  />
                )}
              </article>
            </section>
          );
        })()}

        {page === "Competitor Research" && (
          <section className="dashboard-grid">
            <article className="panel">
              <div className="panel-head">
                <div><h3>Track competitor</h3><p>Add competitor channels and positioning notes for your workspace</p></div>
                <Target size={19} />
              </div>
              <form className="brand-form" onSubmit={saveCompetitor}>
                <label>
                  Competitor / brand name
                  <input
                    required
                    value={competitorForm.name}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, name: e.target.value })}
                    placeholder="e.g. Acme Social"
                  />
                </label>
                <label>
                  Channel
                  <select value={competitorForm.platform} onChange={(e) => setCompetitorForm({ ...competitorForm, platform: e.target.value })}>
                    {platforms.map((p) => <option key={p} value={p}>{prettyPlatform(p)}</option>)}
                  </select>
                </label>
                <label>
                  Handle
                  <input
                    required
                    value={competitorForm.handle}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, handle: e.target.value })}
                    placeholder="e.g. acmesocial"
                  />
                </label>
                <label>
                  Profile URL (optional)
                  <input
                    type="url"
                    value={competitorForm.profileUrl}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, profileUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </label>
                <label>
                  Reported followers (optional)
                  <input
                    type="number"
                    min="0"
                    value={competitorForm.followers}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, followers: e.target.value })}
                    placeholder="e.g. 25000"
                  />
                </label>
                <label>
                  Content & positioning notes
                  <textarea
                    rows="4"
                    value={competitorForm.notes}
                    onChange={(e) => setCompetitorForm({ ...competitorForm, notes: e.target.value })}
                    placeholder="Posting cadence, hooks, formats, and campaign angles..."
                  />
                </label>
                <button type="submit" className="primary"><Plus size={15} /> Save competitor</button>
              </form>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div><h3>Tracked competitors</h3><p>{competitorList.length} saved in workspace</p></div>
              </div>
              {competitorList.length ? (
                competitorList.map((comp) => (
                  <div className="list-row" key={comp.id}>
                    <div className="agent-avatar"><Target size={16} /></div>
                    <div className="row-main">
                      <b>{comp.name} <small>· {prettyPlatform(comp.platform)} · @{comp.handle}</small></b>
                      <small>
                        {comp.followers != null ? `${Number(comp.followers).toLocaleString()} followers · ` : ""}
                        {comp.notes || "No notes recorded"}
                      </small>
                      {comp.profileUrl && <small className="muted">{comp.profileUrl}</small>}
                    </div>
                    <button type="button" className="icon-button" title="Remove competitor" onClick={() => removeCompetitor(comp.id)}>
                      <X size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Target}
                  title="No competitors tracked yet"
                  text="Add competitor profiles on the left to build your workspace research log."
                />
              )}
            </article>
          </section>
        )}

        {page === "Social Listening" && (() => {
          const matches = inboxList.filter((item) => {
            const matchesPlatform = listeningPlatform === "ALL" || item.platform === listeningPlatform;
            const matchesText = !listeningQuery.trim()
              || `${item.author || ""} ${item.message || ""}`.toLowerCase().includes(listeningQuery.toLowerCase());
            return matchesPlatform && matchesText;
          });
          return (
            <section className="panel">
              <div className="panel-head">
                <div><h3>Social listening</h3><p>Monitor keywords, handles, and mentions across workspace streams</p></div>
                <div className="heading-actions">
                  <select value={listeningPlatform} onChange={(e) => setListeningPlatform(e.target.value)}>
                    <option value="ALL">All channels</option>
                    {platforms.map((p) => <option key={p} value={p}>{prettyPlatform(p)}</option>)}
                  </select>
                </div>
              </div>
              <div className="toolbar">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    placeholder="Filter mentions, keywords, or authors..."
                    value={listeningQuery}
                    onChange={(e) => setListeningQuery(e.target.value)}
                  />
                </div>
                <span className="muted">{matches.length} matches</span>
              </div>
              {matches.length ? (
                matches.map((item) => (
                  <div className="list-row" key={item.id}>
                    <div className="message-avatar"><Search size={16} /></div>
                    <div className="row-main">
                      <b>{item.author} <small>· {prettyPlatform(item.platform)}</small></b>
                      <small>{item.message}</small>
                    </div>
                    {item.receivedAt && <span className="pill">{new Date(item.receivedAt).toLocaleDateString()}</span>}
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Search}
                  title="No matching mentions"
                  text="Messages ingested in Unified Inbox appear here for keyword and channel filtering."
                />
              )}
            </section>
          );
        })()}

        {page === "Campaigns" && (
          <section className="dashboard-grid">
            <article className="panel">
              <div className="panel-head">
                <div><h3>Create campaign</h3><p>Group goals, primary channels, and campaign status</p></div>
                <Layers3 size={19} />
              </div>
              <form className="brand-form" onSubmit={addCampaign}>
                <label>
                  Campaign name
                  <input
                    required
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                    placeholder="e.g. Q4 Product Launch"
                  />
                </label>
                <label>
                  Primary channel
                  <select value={campaignForm.channel} onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })}>
                    {platforms.map((p) => <option key={p} value={p}>{prettyPlatform(p)}</option>)}
                  </select>
                </label>
                <label>
                  Objective & notes
                  <textarea
                    rows="3"
                    value={campaignForm.objective}
                    onChange={(e) => setCampaignForm({ ...campaignForm, objective: e.target.value })}
                    placeholder="Target audience, CTA, or KPI goal..."
                  />
                </label>
                <button type="submit" className="primary"><Plus size={15} /> Save campaign</button>
              </form>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div><h3>Campaigns</h3><p>{campaigns.length} active in workspace</p></div>
              </div>
              {campaigns.length ? (
                campaigns.map((camp) => (
                  <div className="list-row" key={camp.id}>
                    <div className="agent-avatar"><Layers3 size={16} /></div>
                    <div className="row-main">
                      <b>{camp.name} <small>· {prettyPlatform(camp.channel)}</small></b>
                      <small>{camp.objective || "No objective specified"}</small>
                    </div>
                    <Status value={camp.status} />
                    <button
                      type="button"
                      className="icon-button"
                      title="Delete campaign"
                      onClick={() => setCampaigns((prev) => prev.filter((c) => c.id !== camp.id))}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Layers3}
                  title="No campaigns yet"
                  text="Create a campaign on the left to organize your social initiatives."
                />
              )}
            </article>
          </section>
        )}

        {page === "Automations" && (
          <section className="dashboard-grid">
            <article className="panel">
              <div className="panel-head">
                <div><h3>Create automation</h3><p>Automatically run actions when workspace events occur</p></div>
                <WandSparkles size={19} />
              </div>
              <form className="brand-form" onSubmit={createAutomation}>
                <label>
                  Rule name
                  <input
                    required
                    minLength="2"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                    placeholder="e.g. Auto-submit new drafts for review"
                  />
                </label>
                <label>
                  When this happens (Trigger)
                  <select value={ruleForm.trigger} onChange={(e) => setRuleForm({ ...ruleForm, trigger: e.target.value })}>
                    <option value="CONTENT_CREATED">Draft created</option>
                    <option value="APPROVAL_REQUESTED">Approval requested</option>
                    <option value="CONTENT_APPROVED">Content approved</option>
                  </select>
                </label>
                <label>
                  Do this (Action)
                  <select value={ruleForm.action} onChange={(e) => setRuleForm({ ...ruleForm, action: e.target.value })}>
                    <option value="REQUEST_APPROVAL">Send to approval queue</option>
                    <option value="RUN_AGENT">Queue agent task</option>
                  </select>
                </label>
                {ruleForm.action === "RUN_AGENT" && (
                  <label>
                    Agent prompt (supports {"{{title}}"} and {"{{body}}"})
                    <textarea
                      rows="3"
                      value={ruleForm.agentTask}
                      onChange={(e) => setRuleForm({ ...ruleForm, agentTask: e.target.value })}
                      placeholder="Write 3 social captions for: {{title}}"
                    />
                  </label>
                )}
                <button type="submit" className="primary"><Plus size={15} /> Save automation</button>
              </form>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div><h3>Active rules</h3><p>{automationList.length} configured in workspace</p></div>
              </div>
              {automationList.length ? (
                automationList.map((rule) => (
                  <div className="list-row" key={rule.id}>
                    <div className="agent-avatar"><WandSparkles size={16} /></div>
                    <div className="row-main">
                      <b>{rule.name}</b>
                      <small>{rule.trigger} → {rule.action} · Runs: {rule.runCount || 0}</small>
                    </div>
                    <Status value={rule.enabled ? "ACTIVE" : "PAUSED"} />
                    <button type="button" className="secondary small" onClick={() => toggleAutomation(rule)}>
                      {rule.enabled ? "Pause" : "Enable"}
                    </button>
                    <button type="button" className="icon-button" title="Delete rule" onClick={() => deleteAutomation(rule.id)}>
                      <X size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={WandSparkles}
                  title="No automations yet"
                  text="Create a rule on the left to automate reviews or agent tasks."
                />
              )}
            </article>
          </section>
        )}

        {page === "Approvals" && (
          <section className="panel">
            <div className="panel-head">
              <div><h3>Approval queue</h3><p>Review content before it enters the publishing queue</p></div>
              <span className="pill">{approvalList.length} pending</span>
            </div>
            {approvalList.length ? (
              approvalList.map((approval) => (
                <div className="list-row" key={approval.id}>
                  <div className="approval-icon"><ShieldCheck size={18} /></div>
                  <div className="row-main">
                    <b>Content review request</b>
                    <small>Submitted {approval.createdAt ? new Date(approval.createdAt).toLocaleString() : ""}</small>
                  </div>
                  <button type="button" className="secondary small" onClick={() => approvalDecision(approval.id, "REJECTED")}>Reject</button>
                  <button type="button" className="primary small" onClick={() => approvalDecision(approval.id, "APPROVED")}>Approve</button>
                </div>
              ))
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="All caught up"
                text="Content submitted for review will appear here."
              />
            )}
          </section>
        )}

        {page === "Unified Inbox" && (() => {
          const items = inboxFilter === "UNREAD"
            ? inboxList.filter((item) => !item.isRead)
            : inboxList;

          return (
            <section className="dashboard-grid">
              <article className="panel">
                <div className="panel-head">
                  <div><h3>Log / test incoming message</h3><p>Record a DM, comment, or mention into the workspace inbox</p></div>
                  <Inbox size={19} />
                </div>
                <form className="brand-form" onSubmit={createInboxMessage}>
                  <label>
                    Channel
                    <select value={inboxForm.platform} onChange={(e) => setInboxForm({ ...inboxForm, platform: e.target.value })}>
                      {platforms.map((p) => <option key={p} value={p}>{prettyPlatform(p)}</option>)}
                    </select>
                  </label>
                  <label>
                    Sender / handle
                    <input
                      required
                      value={inboxForm.author}
                      onChange={(e) => setInboxForm({ ...inboxForm, author: e.target.value })}
                      placeholder="e.g. @alex_dev"
                    />
                  </label>
                  <label>
                    Message
                    <textarea
                      required
                      rows="3"
                      value={inboxForm.message}
                      onChange={(e) => setInboxForm({ ...inboxForm, message: e.target.value })}
                      placeholder="Incoming comment or direct message..."
                    />
                  </label>
                  <button type="submit" className="primary"><Plus size={15} /> Add message</button>
                </form>
              </article>

              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Unified inbox</h3>
                    <p>{inboxList.filter((i) => !i.isRead).length} unread · {inboxList.length} total</p>
                  </div>
                  <div className="heading-actions">
                    <button
                      type="button"
                      className={inboxFilter === "ALL" ? "primary small" : "secondary small"}
                      onClick={() => setInboxFilter("ALL")}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={inboxFilter === "UNREAD" ? "primary small" : "secondary small"}
                      onClick={() => setInboxFilter("UNREAD")}
                    >
                      Unread
                    </button>
                  </div>
                </div>

                {items.length ? (
                  items.map((item) => (
                    <div className="list-row" key={item.id}>
                      <div className="message-avatar"><MessageSquare size={16} /></div>
                      <div className="row-main">
                        <b>{item.author} <small>· {prettyPlatform(item.platform)}</small></b>
                        <small>{item.message}</small>
                        {item.receivedAt && <small className="muted">{new Date(item.receivedAt).toLocaleString()}</small>}
                      </div>
                      <span className={`pill ${item.isRead ? "" : "pill-new"}`}>{item.isRead ? "Read" : "New"}</span>
                      {!item.isRead && (
                        <button type="button" className="secondary small" onClick={() => markInboxRead(item.id)}>
                          Mark read
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={Inbox}
                    title={inboxFilter === "UNREAD" ? "No unread messages" : "Your inbox is waiting"}
                    text="Add a message on the left or connect webhook integrations to collect conversations here."
                  />
                )}
              </article>
            </section>
          );
        })()}

        {page === "Team" && (
          <section className="dashboard-grid">
            <article className="panel">
              <div className="panel-head">
                <div><h3>Add team member</h3><p>Assign workspace roles for content and review</p></div>
                <Users size={19} />
              </div>
              <form className="brand-form" onSubmit={addTeamMember}>
                <label>
                  Name
                  <input
                    required
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    placeholder="e.g. Jane Doe"
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={teamForm.email}
                    onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                    placeholder="jane@example.com"
                  />
                </label>
                <label>
                  Role
                  <select value={teamForm.role} onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value })}>
                    <option value="Admin">Admin</option>
                    <option value="Editor">Editor</option>
                    <option value="Reviewer">Reviewer</option>
                  </select>
                </label>
                <button type="submit" className="primary"><Plus size={15} /> Add member</button>
              </form>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div><h3>Workspace team</h3><p>{teamMembers.length} member{teamMembers.length === 1 ? "" : "s"}</p></div>
              </div>
              {teamMembers.length ? (
                teamMembers.map((member) => (
                  <div className="list-row" key={member.id}>
                    <div className="agent-avatar"><Users size={16} /></div>
                    <div className="row-main">
                      <b>{member.name}</b>
                      <small>{member.email}</small>
                    </div>
                    <span className="pill">{member.role}</span>
                    <button
                      type="button"
                      className="icon-button"
                      title="Remove member"
                      onClick={() => setTeamMembers((prev) => prev.filter((m) => m.id !== member.id))}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Users}
                  title="No team members added yet"
                  text="Add collaborators on the left to track workspace responsibilities."
                />
              )}
            </article>
          </section>
        )}

        {page === "Brand Profile" && (
          <section className="panel">
            <div className="panel-head">
              <div><h3>Brand identity</h3><p>Give your content and agents a consistent foundation</p></div>
              <Hash size={18} />
            </div>
            <form className="brand-form" onSubmit={saveBrand}>
              <label>
                Brand voice
                <textarea
                  rows="3"
                  value={brand.voice}
                  onChange={(e) => setBrand({ ...brand, voice: e.target.value })}
                  placeholder="e.g. Confident, helpful, optimistic and direct"
                />
              </label>
              <label>
                Target audience
                <textarea
                  rows="3"
                  value={brand.audience}
                  onChange={(e) => setBrand({ ...brand, audience: e.target.value })}
                  placeholder="Who are you creating content for?"
                />
              </label>
              <label>
                Brand guidelines
                <textarea
                  rows="5"
                  value={brand.guidelines}
                  onChange={(e) => setBrand({ ...brand, guidelines: e.target.value })}
                  placeholder="Key messages, words to use or avoid, visual direction..."
                />
              </label>
              <button type="submit" className="primary">Save brand profile</button>
            </form>
          </section>
        )}

        {page === "Settings" && (
          <section className="panel">
            <div className="panel-head">
              <div><h3>Workspace settings</h3><p>Manage workspace labels, API target, and session</p></div>
              <Settings2 size={18} />
            </div>
            <form className="brand-form" onSubmit={saveWorkspacePreferences}>
              <label>
                Organization name
                <input
                  required
                  minLength="2"
                  value={workspaceSettings.organizationName}
                  onChange={(e) => setWorkspaceSettings({ ...workspaceSettings, organizationName: e.target.value })}
                />
              </label>
              <label>
                Workspace name
                <input
                  required
                  minLength="2"
                  value={workspaceSettings.workspaceName}
                  onChange={(e) => setWorkspaceSettings({ ...workspaceSettings, workspaceName: e.target.value })}
                />
              </label>
              <label>
                API endpoint
                <input readOnly value={workspaceSettings.apiUrl} />
              </label>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={resetWorkspaceSession}>Switch / reset workspace</button>
                <button type="submit" className="primary">Save settings</button>
              </div>
            </form>
          </section>
        )}

        <footer>
          <span>◈ SOCIALOPS AI</span>
          <span>Independent social media operations platform</span>
          <span>Workspace: {workspaceId}</span>
        </footer>
      </main>
    </div>
  );
}

function pageDescription(page) {
  return ({
    Overview: "Your command center for everything social.",
    "Content Studio": "Create, organize and prepare content for every channel.",
    "Publishing Calendar": "Keep your publishing workflow organized.",
    "Social Accounts": "Manage the channels connected to your workspace.",
    "AI Agents": "Coordinate intelligent workflows for your social operation.",
    Approvals: "Keep your brand safe with a review process.",
    "Unified Inbox": "Bring your social conversations into one place.",
    Analytics: "Understand what is working across your channels.",
    "Competitor Research": "Track competitor accounts, audiences, and content angles.",
    "Social Listening": "Filter conversations and mentions across channels.",
    Campaigns: "Organize campaigns and objectives across channels.",
    Automations: "Automate repetitive content and review workflows.",
    Team: "Manage workspace collaborators and roles.",
    "Brand Profile": "Define the voice and guidelines behind your brand.",
    Settings: "Configure workspace preferences and connection details.",
  })[page] || "Manage this part of your social media operation.";
}

function prettyPlatform(value = "") {
  return value === "X" ? "X" : value.charAt(0) + value.slice(1).toLowerCase();
}

function Status({ value }) {
  return <span className={`status status-${String(value || "draft").toLowerCase()}`}>{String(value || "DRAFT").replaceAll("_", " ")}</span>;
}

function ContentRow({ item, onReview }) {
  return (
    <div className="content-row">
      <div className="content-type"><FileText size={17} /></div>
      <div className="row-main">
        <b>{item.title}</b>
        <small>{item.body || "No caption added"}</small>
      </div>
      {item.platform && <span className="platform-tag">{prettyPlatform(item.platform)}</span>}
      <Status value={item.status} />
      {onReview && <button type="button" className="secondary small" onClick={onReview}>Request review</button>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, action, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={21} /></div>
      <b>{title}</b>
      <p>{text}</p>
      {action && <button type="button" className="secondary" onClick={onAction}>{action} <ChevronRight size={14} /></button>}
    </div>
  );
}

function Checklist({ rows }) {
  return (
    <div className="checklist">
      {rows.map(([label, done, action]) => (
        <button type="button" key={label} onClick={action} className="check-row">
          <span className={done ? "check done" : "check"}>{done && <Check size={12} />}</span>
          <span className={done ? "completed" : ""}>{label}</span>
          <ChevronRight size={15} />
        </button>
      ))}
    </div>
  );
}

function RouterRoot() {
  const [pathname, navigate] = usePathname();
  const hasWorkspace = Boolean(localStorage.getItem("socialops.workspace"));

  if (pathname.startsWith("/app")) {
    return <App onBackToSite={() => navigate("/")} />;
  }

  return (
    <PublicSite
      pathname={pathname}
      navigate={navigate}
      hasWorkspace={hasWorkspace}
    />
  );
}

export default function Root() {
  return (
    <AppBoundary>
      <RouterRoot />
    </AppBoundary>
  );
}