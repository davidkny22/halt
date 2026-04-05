"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CopyBlock } from "@/components/copy-block";
import { KeyManager } from "@/components/key-manager";

interface ChannelConfig {
  channel: string;
  config: Record<string, string>;
  enabled: boolean;
}

const CHANNEL_FIELDS: Record<string, { label: string; fields: { key: string; label: string; placeholder: string; type?: string }[] }> = {
  telegram: {
    label: "Telegram",
    fields: [
      { key: "botToken", label: "Bot Token", placeholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" },
      { key: "chatId", label: "Chat ID", placeholder: "-1001234567890" },
    ],
  },
  discord: {
    label: "Discord",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/..." },
    ],
  },
  sms: {
    label: "SMS",
    fields: [
      { key: "accountSid", label: "Twilio Account SID", placeholder: "AC..." },
      { key: "authToken", label: "Twilio Auth Token", placeholder: "your_auth_token", type: "password" },
      { key: "from", label: "From Number", placeholder: "+15551234567" },
      { key: "to", label: "To Number", placeholder: "+15559876543" },
    ],
  },
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [dataSharing, setDataSharing] = useState(false);
  const [savingSharing, setSavingSharing] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [betaCode, setBetaCode] = useState("");
  const [betaResult, setBetaResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [redeemingBeta, setRedeemingBeta] = useState(false);

  // Alert channel state
  const [channels, setChannels] = useState<Record<string, ChannelConfig>>({});
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [channelForm, setChannelForm] = useState<Record<string, string>>({});
  const [savingChannel, setSavingChannel] = useState(false);

  const tier = (session as any)?.tier || "free";
  const keyPrefix = (session as any)?.apiKeyPrefix || "clw_live_";
  const betaExpiresAt = (session as any)?.betaExpiresAt;
  const isPaid = tier !== "free";

  // Load alert channels on mount
  useEffect(() => {
    if (isPaid) {
      fetch("/api/account-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-alert-channels" }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.channels) {
            const map: Record<string, ChannelConfig> = {};
            for (const ch of data.channels) {
              map[ch.channel] = ch;
            }
            setChannels(map);
          }
        })
        .catch(() => {});
    }
  }, [isPaid]);

  async function callAction(action: string, data: Record<string, any> = {}) {
    const res = await fetch("/api/account-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...data }),
    });
    return res.json();
  }

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const result = await callAction("checkout", { plan: "pro" });
      if (result.url) {
        window.location.href = result.url;
      } else {
        alert("Billing is being configured. Please try again shortly.");
      }
    } finally {
      setUpgrading(false);
    }
  }

  async function handleRedeemBeta() {
    if (!betaCode.trim()) return;
    setRedeemingBeta(true);
    setBetaResult(null);
    try {
      const result = await callAction("redeem-beta-code", { code: betaCode.trim() });
      setBetaResult(result);
      if (result.success) {
        setBetaCode("");
        window.location.reload();
        return;
      }
    } catch {
      setBetaResult({ message: "Something went wrong. Try again." });
    } finally {
      setRedeemingBeta(false);
    }
  }

  async function handleToggleDataSharing() {
    setSavingSharing(true);
    const newValue = !dataSharing;
    setDataSharing(newValue);
    await callAction("toggle-data-sharing", { enabled: newValue });
    setSavingSharing(false);
  }

  async function handleRotateKey() {
    if (!confirm("Are you sure? Your current API key will stop working in 24 hours. You'll need to update your plugin configuration.")) {
      return;
    }
    setRotatingKey(true);
    const result = await callAction("rotate-key");
    if (result.api_key) {
      setNewKey(result.api_key);
    }
    setRotatingKey(false);
  }

  async function handleDeleteAccount() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (!confirm("This will permanently delete your account, all agents, rules, alerts, and event history. This cannot be undone.")) {
      setConfirmDelete(false);
      return;
    }
    await callAction("delete-account");
    signOut({ callbackUrl: "/" });
  }

  async function handleStartTrial() {
    try {
      const result = await callAction("start-trial");
      if (result.tier === "trial") {
        router.refresh();
      } else if (result.error) {
        alert(result.error === "Trial already used" ? "You've already used your free trial." : result.error);
      }
    } catch {
      alert("Failed to start trial. Please try again.");
    }
  }

  function startEditChannel(channel: string) {
    const existing = channels[channel];
    setChannelForm(existing?.config || {});
    setEditingChannel(channel);
  }

  async function handleSaveChannel(channel: string) {
    setSavingChannel(true);
    const result = await callAction("save-alert-channel", { channel, config: channelForm, enabled: true });
    if (result.configured) {
      setChannels((prev) => ({
        ...prev,
        [channel]: { channel, config: channelForm, enabled: true },
      }));
      setEditingChannel(null);
    }
    setSavingChannel(false);
  }

  async function handleRemoveChannel(channel: string) {
    await callAction("remove-alert-channel", { channel });
    setChannels((prev) => {
      const next = { ...prev };
      delete next[channel];
      return next;
    });
    setEditingChannel(null);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Trial banner for free users */}
      {tier === "free" && (
        <div
          className="p-4 rounded-lg mb-6 flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, rgba(255, 107, 74, 0.1) 0%, rgba(255, 107, 74, 0.02) 100%)",
            border: "1px solid rgba(255, 107, 74, 0.2)",
          }}
        >
          <div>
            <p className="text-sm font-semibold">Try Pro free for 14 days</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Kill switch, AI anomaly detection, unlimited rules. No credit card required.
            </p>
          </div>
          <button
            onClick={handleStartTrial}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer shrink-0"
            style={{ backgroundColor: "var(--color-coral)" }}
          >
            Start Trial
          </button>
        </div>
      )}

      {/* Alert Channels */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Alert Channels</h2>
        <div className="flex flex-col gap-3">
          {/* Email — always active */}
          <div
            className="flex items-center justify-between p-4 rounded-lg"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {session?.user?.email || "Not configured"}
              </p>
            </div>
            <span style={{ color: "var(--color-green)" }} className="text-sm">Active</span>
          </div>

          {/* Telegram, Discord, SMS */}
          {Object.entries(CHANNEL_FIELDS).map(([key, channel]) => {
            const configured = channels[key];
            const isEditing = editingChannel === key;

            return (
              <div
                key={key}
                className="p-4 rounded-lg"
                style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{channel.label}</p>
                    {!isPaid ? (
                      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        Requires Pro plan
                      </p>
                    ) : configured && !isEditing ? (
                      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        Configured
                      </p>
                    ) : !isEditing ? (
                      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        Not configured
                      </p>
                    ) : null}
                  </div>
                  {!isPaid ? (
                    <button
                      onClick={handleUpgrade}
                      className="text-xs px-3 py-1 rounded-full font-medium cursor-pointer"
                      style={{ backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }}
                    >
                      Upgrade
                    </button>
                  ) : !isEditing ? (
                    <div className="flex items-center gap-2">
                      {configured && (
                        <span style={{ color: "var(--color-green)" }} className="text-xs">Active</span>
                      )}
                      <button
                        onClick={() => startEditChannel(key)}
                        className="text-xs px-3 py-1 rounded-full font-medium cursor-pointer"
                        style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                      >
                        {configured ? "Edit" : "Configure"}
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Edit form */}
                {isEditing && (
                  <div className="mt-3 flex flex-col gap-2">
                    {channel.fields.map((field) => (
                      <div key={field.key}>
                        <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-secondary)" }}>
                          {field.label}
                        </label>
                        <input
                          type={field.type || "text"}
                          value={channelForm[field.key] || ""}
                          onChange={(e) => setChannelForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 rounded-lg text-xs"
                          style={{
                            backgroundColor: "var(--color-bg)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text)",
                            fontFamily: "var(--font-mono)",
                          }}
                        />
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSaveChannel(key)}
                        disabled={savingChannel}
                        className="text-xs px-4 py-2 rounded-lg font-semibold text-white cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-coral)" }}
                      >
                        {savingChannel ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingChannel(null)}
                        className="text-xs px-4 py-2 rounded-lg font-medium cursor-pointer"
                        style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                      >
                        Cancel
                      </button>
                      {configured && (
                        <button
                          onClick={() => handleRemoveChannel(key)}
                          className="text-xs px-4 py-2 rounded-lg font-medium cursor-pointer ml-auto"
                          style={{ color: "#ef4444" }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Privacy */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Privacy</h2>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Share anonymized usage patterns
                {savingSharing && <span className="ml-2 text-xs" style={{ color: "var(--color-text-tertiary)" }}>Saving...</span>}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                Help improve Clawnitor for everyone. We never share raw events, message content, or agent outputs.
              </p>
            </div>
            <button
              onClick={handleToggleDataSharing}
              className="w-12 h-6 rounded-full relative transition-colors cursor-pointer"
              style={{ backgroundColor: dataSharing ? "var(--color-coral)" : "var(--color-border)" }}
            >
              <span
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: dataSharing ? "26px" : "4px" }}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Billing */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Billing</h2>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Current plan:{" "}
                <span style={{ color: "var(--color-coral)" }}>
                  {tier === "paid" ? "Pro" : tier === "trial" ? "Pro (Trial)" : tier.charAt(0).toUpperCase() + tier.slice(1)}
                </span>
                {betaExpiresAt && tier === "paid" && (
                  <span className="text-xs ml-2" style={{ color: "var(--color-text-tertiary)" }}>
                    (free until {new Date(betaExpiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
                  </span>
                )}
                {tier === "paid" && !betaExpiresAt && (
                  <span className="text-xs ml-2" style={{ color: "var(--color-text-tertiary)" }}>
                    (renews monthly)
                  </span>
                )}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                {tier === "free" ? "Upgrade to Pro for kill switch, AI detection, and more." : tier === "trial" ? "Your trial gives you full Pro access." : betaExpiresAt ? "You're a founding beta tester. When your beta ends, lock in $5/mo forever." : "Manage your subscription via Stripe."}
              </p>
            </div>
            {tier === "free" && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="text-sm px-4 py-2 rounded-lg font-semibold text-white cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: "var(--color-coral)" }}
              >
                {upgrading ? "..." : "Upgrade to Pro"}
              </button>
            )}
          </div>

          {/* Beta code redemption */}
          {(tier === "free" || tier === "trial") && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
              <p className="text-xs font-medium mb-2">Have a beta invite code?</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={betaCode}
                  onChange={(e) => setBetaCode(e.target.value.toUpperCase())}
                  placeholder="CLAW-XXXX-XXXX"
                  maxLength={14}
                  className="flex-1 px-3 py-2 rounded-lg text-xs"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.05em",
                  }}
                />
                <button
                  onClick={handleRedeemBeta}
                  disabled={redeemingBeta || !betaCode.trim()}
                  className="text-xs px-4 py-2 rounded-lg font-semibold text-white cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-green)" }}
                >
                  {redeemingBeta ? "..." : "Redeem"}
                </button>
              </div>
              {betaResult && (
                <p
                  className="text-xs mt-2"
                  style={{ color: betaResult.success ? "var(--color-green)" : "var(--color-coral)" }}
                >
                  {betaResult.message}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Account */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <div className="flex flex-col gap-3">
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <p className="text-sm font-medium mb-1">Email</p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {session?.user?.email || "Not signed in"}
            </p>
          </div>
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <KeyManager />
          </div>
          <button
            onClick={handleDeleteAccount}
            className="p-4 rounded-lg text-sm text-left cursor-pointer transition-colors"
            style={{
              backgroundColor: confirmDelete ? "rgba(239, 68, 68, 0.1)" : "var(--color-surface)",
              border: confirmDelete ? "1px solid #ef4444" : "1px solid var(--color-border)",
              color: "#ef4444",
            }}
          >
            {confirmDelete ? "Click again to confirm deletion" : "Delete Account"}
          </button>
        </div>
      </section>
    </div>
  );
}
