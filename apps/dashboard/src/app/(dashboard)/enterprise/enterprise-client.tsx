"use client";

import { useState, useEffect } from "react";

type Tab = "audit" | "webhooks" | "sso";

const SSO_PROVIDERS = ["okta", "azure_ad", "google", "onelogin", "custom"];

export function EnterpriseClient({ tier }: { tier: string }) {
  const isEnterprise = tier === "enterprise";
  const [activeTab, setActiveTab] = useState<Tab>("audit");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [ssoConfig, setSsoConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState("alert.elevated,alert.critical");
  const [savingWebhook, setSavingWebhook] = useState(false);

  const [showSsoForm, setShowSsoForm] = useState(false);
  const [ssoProvider, setSsoProvider] = useState("okta");
  const [ssoIssuerUrl, setSsoIssuerUrl] = useState("");
  const [ssoClientId, setSsoClientId] = useState("");
  const [ssoClientSecret, setSsoClientSecret] = useState("");
  const [savingSso, setSavingSso] = useState(false);

  useEffect(() => {
    if (!isEnterprise) { setLoading(false); return; }
    loadData();
  }, [isEnterprise]);

  async function callAction(action: string, data: Record<string, any> = {}) {
    const res = await fetch("/api/enterprise-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...data }),
    });
    return res.json();
  }

  async function loadData() {
    setLoading(true);
    try {
      const [auditRes, webhookRes, ssoRes] = await Promise.all([
        callAction("get-audit-logs"),
        callAction("get-webhooks"),
        callAction("get-sso"),
      ]);
      setAuditLogs(auditRes.audit_logs || []);
      setWebhooks(webhookRes.webhooks || []);
      setSsoConfig(ssoRes.sso || null);
    } catch {} finally { setLoading(false); }
  }

  async function handleCreateWebhook() {
    setSavingWebhook(true);
    const result = await callAction("create-webhook", {
      name: webhookName, url: webhookUrl,
      events: webhookEvents.split(",").map((e: string) => e.trim()),
    });
    if (result.id) {
      setWebhooks((prev) => [...prev, result]);
      setShowWebhookForm(false);
      setWebhookName(""); setWebhookUrl("");
    }
    setSavingWebhook(false);
  }

  async function handleDeleteWebhook(id: string) {
    if (!confirm("Delete this webhook?")) return;
    await callAction("delete-webhook", { webhookId: id });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleConfigureSso() {
    setSavingSso(true);
    const result = await callAction("configure-sso", {
      provider: ssoProvider, issuerUrl: ssoIssuerUrl,
      clientId: ssoClientId, clientSecret: ssoClientSecret,
    });
    if (result.provider || result.message) {
      setSsoConfig({ provider: ssoProvider, issuer_url: ssoIssuerUrl, client_id: ssoClientId, enabled: false });
      setShowSsoForm(false);
    }
    setSavingSso(false);
  }

  async function handleToggleSso() {
    const newEnabled = !ssoConfig?.enabled;
    await callAction("toggle-sso", { enabled: newEnabled });
    setSsoConfig((prev: any) => ({ ...prev, enabled: newEnabled }));
  }

  if (!isEnterprise) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Enterprise</h1>
        <div className="rounded-lg p-8 text-center max-w-lg mx-auto" style={{ border: "1px solid var(--color-border)" }}>
          <h2 className="text-lg font-semibold mb-2">Enterprise Features</h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
            Audit logs, custom webhooks, SSO/SAML, custom roles, and unlimited everything. Contact us for custom pricing.
          </p>
          <a href="mailto:david@halt.dev" className="inline-block px-6 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-coral)" }}>
            Contact Sales
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Enterprise</h1>
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ backgroundColor: "var(--color-surface)" }}>
        {(["audit", "webhooks", "sso"] as Tab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer" style={{ backgroundColor: activeTab === tab ? "var(--color-bg)" : "transparent", color: activeTab === tab ? "var(--color-text)" : "var(--color-text-secondary)" }}>
            {tab === "audit" ? "Audit Logs" : tab === "webhooks" ? "Webhooks" : "SSO / SAML"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading...</div>
      ) : (
        <>
          {activeTab === "audit" && (
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>No audit log entries yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Time</th>
                    <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Action</th>
                    <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Resource</th>
                    <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>IP</th>
                  </tr></thead>
                  <tbody>{auditLogs.map((log: any) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs font-medium">{log.action}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>{log.resource_type}{log.resource_id ? ` (${log.resource_id.slice(0, 8)}...)` : ""}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>{log.ip_address || "\u2014"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "webhooks" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>HMAC-signed HTTP POST payloads on alert events.</p>
                <button onClick={() => setShowWebhookForm(true)} className="px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer" style={{ backgroundColor: "var(--color-coral)" }}>+ Add Webhook</button>
              </div>
              {showWebhookForm && (
                <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>Name</label>
                      <input value={webhookName} onChange={(e) => setWebhookName(e.target.value)} placeholder="My webhook" className="w-full px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>URL</label>
                      <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-server.com/webhook" className="w-full px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontFamily: "var(--font-mono)" }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>Events</label>
                      <input value={webhookEvents} onChange={(e) => setWebhookEvents(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontFamily: "var(--font-mono)" }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCreateWebhook} disabled={savingWebhook || !webhookName || !webhookUrl} className="text-xs px-4 py-2 rounded-lg font-semibold text-white cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--color-coral)" }}>{savingWebhook ? "Creating..." : "Create"}</button>
                      <button onClick={() => setShowWebhookForm(false)} className="text-xs px-4 py-2 rounded-lg font-medium cursor-pointer" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                {webhooks.length === 0 ? (
                  <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>No webhooks configured.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Name</th>
                      <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>URL</th>
                      <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Status</th>
                      <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: "var(--color-text-secondary)" }}>Actions</th>
                    </tr></thead>
                    <tbody>{webhooks.map((wh: any) => (
                      <tr key={wh.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td className="px-4 py-3 font-medium">{wh.name}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>{wh.url.length > 40 ? wh.url.slice(0, 40) + "..." : wh.url}</td>
                        <td className="px-4 py-3">{wh.last_status ? (<span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: wh.last_status < 300 ? "rgba(74, 222, 128, 0.15)" : "var(--color-coral-soft)", color: wh.last_status < 300 ? "var(--color-green)" : "var(--color-coral)" }}>{wh.last_status}</span>) : (<span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Never fired</span>)}</td>
                        <td className="px-4 py-3 text-right"><button onClick={() => handleDeleteWebhook(wh.id)} className="text-xs px-3 py-1 rounded cursor-pointer" style={{ color: "#ef4444" }}>Delete</button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === "sso" && (
            <div className="max-w-lg">
              {ssoConfig && !showSsoForm ? (
                <div className="p-6 rounded-lg" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">SSO Configuration</h3>
                    <button onClick={handleToggleSso} className="text-xs px-3 py-1 rounded-full font-medium cursor-pointer" style={{ backgroundColor: ssoConfig.enabled ? "rgba(74, 222, 128, 0.15)" : "var(--color-coral-soft)", color: ssoConfig.enabled ? "var(--color-green)" : "var(--color-coral)" }}>
                      {ssoConfig.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    <div><span style={{ color: "var(--color-text-secondary)" }}>Provider: </span><span className="font-medium">{ssoConfig.provider}</span></div>
                    <div><span style={{ color: "var(--color-text-secondary)" }}>Issuer: </span><span className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>{ssoConfig.issuer_url}</span></div>
                    <div><span style={{ color: "var(--color-text-secondary)" }}>Client ID: </span><span className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>{ssoConfig.client_id}</span></div>
                  </div>
                  <button onClick={() => { setShowSsoForm(true); setSsoProvider(ssoConfig.provider); setSsoIssuerUrl(ssoConfig.issuer_url); setSsoClientId(ssoConfig.client_id); }} className="mt-4 text-xs px-4 py-2 rounded-lg font-medium cursor-pointer" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>Reconfigure</button>
                </div>
              ) : !showSsoForm ? (
                <div className="p-8 rounded-lg text-center" style={{ border: "1px solid var(--color-border)" }}>
                  <h3 className="font-semibold mb-2">Configure SSO</h3>
                  <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>Supports Okta, Azure AD, Google Workspace, OneLogin, and custom OIDC.</p>
                  <button onClick={() => setShowSsoForm(true)} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ backgroundColor: "var(--color-coral)" }}>Configure SSO</button>
                </div>
              ) : null}

              {showSsoForm && (
                <div className="p-6 rounded-lg mt-4" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <h3 className="font-semibold mb-4">SSO Configuration</h3>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>Provider</label>
                      <select value={ssoProvider} onChange={(e) => setSsoProvider(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                        {SSO_PROVIDERS.map((p) => <option key={p} value={p}>{p === "azure_ad" ? "Azure AD" : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>Issuer URL</label>
                      <input value={ssoIssuerUrl} onChange={(e) => setSsoIssuerUrl(e.target.value)} placeholder="https://your-org.okta.com" className="w-full px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontFamily: "var(--font-mono)" }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>Client ID</label>
                      <input value={ssoClientId} onChange={(e) => setSsoClientId(e.target.value)} placeholder="0oa1bcdef..." className="w-full px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontFamily: "var(--font-mono)" }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>Client Secret</label>
                      <input type="password" value={ssoClientSecret} onChange={(e) => setSsoClientSecret(e.target.value)} placeholder="Your client secret" className="w-full px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontFamily: "var(--font-mono)" }} />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={handleConfigureSso} disabled={savingSso || !ssoIssuerUrl || !ssoClientId || !ssoClientSecret} className="text-xs px-4 py-2 rounded-lg font-semibold text-white cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--color-coral)" }}>{savingSso ? "Saving..." : "Save"}</button>
                      <button onClick={() => setShowSsoForm(false)} className="text-xs px-4 py-2 rounded-lg font-medium cursor-pointer" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
