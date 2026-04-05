"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [dataSharing, setDataSharing] = useState(false);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Alert Channels */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Alert Channels</h2>
        <div className="flex flex-col gap-3">
          <div
            className="flex items-center justify-between p-4 rounded-lg"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Always enabled</p>
            </div>
            <span style={{ color: "var(--color-green)" }} className="text-sm">Active</span>
          </div>
          {["Telegram", "Discord", "SMS"].map((channel) => (
            <div
              key={channel}
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div>
                <p className="text-sm font-medium">{channel}</p>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Requires Pro plan</p>
              </div>
              <span
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ backgroundColor: "var(--color-coral-soft)", color: "var(--color-coral)" }}
              >
                Upgrade
              </span>
            </div>
          ))}
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
              <p className="text-sm font-medium">Share anonymized usage patterns</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                Help improve Clawnitor for everyone. We never share raw events, message content, or agent outputs.
              </p>
            </div>
            <button
              onClick={() => setDataSharing(!dataSharing)}
              className="w-12 h-6 rounded-full relative transition-colors"
              style={{
                backgroundColor: dataSharing ? "var(--color-coral)" : "var(--color-border)",
              }}
            >
              <span
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: dataSharing ? "26px" : "4px" }}
              />
            </button>
          </div>
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
            <p className="text-sm font-medium mb-2">API Key</p>
            <div className="flex gap-2">
              <code
                className="flex-1 px-3 py-2 rounded text-xs"
                style={{ backgroundColor: "var(--color-bg)", fontFamily: "var(--font-mono)" }}
              >
                clw_live_••••••••••••••••
              </code>
              <button
                className="px-3 py-2 rounded text-xs font-medium"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
              >
                Rotate
              </button>
            </div>
          </div>
          <button
            className="p-4 rounded-lg text-sm text-left"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-red)",
            }}
          >
            Delete Account
          </button>
        </div>
      </section>
    </div>
  );
}
