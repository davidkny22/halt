import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  index,
  numeric,
} from "drizzle-orm/pg-core";

export const tierEnum = pgEnum("tier", ["free", "trial", "paid", "team", "enterprise"]);
export const agentStatusEnum = pgEnum("agent_status", [
  "active",
  "learning",
  "paused",
  "discovered",
]);
export const eventTypeEnum = pgEnum("event_type", [
  "tool_use",
  "llm_call",
  "message_sent",
  "message_received",
  "agent_lifecycle",
  "subagent",
]);
export const severityEnum = pgEnum("severity_hint", [
  "normal",
  "elevated",
  "critical",
]);

// ── Users ────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: text("password_hash"),
  github_id: varchar("github_id", { length: 255 }),
  tier: tierEnum("tier").notNull().default("free"),
  email_verified: boolean("email_verified").notNull().default(false),
  data_sharing_enabled: boolean("data_sharing_enabled")
    .notNull()
    .default(false),
  stripe_customer_id: varchar("stripe_customer_id", { length: 255 }),
  trial_started_at: timestamp("trial_started_at", { withTimezone: true }),
  beta_expires_at: timestamp("beta_expires_at", { withTimezone: true }),
  beta_code: varchar("beta_code", { length: 32 }),
  discovered_tools: text("discovered_tools").array(), // tool names from openclaw.json
  rule_visibility: varchar("rule_visibility", { length: 16 }).notNull().default("per_rule"), // "all_visible" | "per_rule" | "all_silent"
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── API Keys ─────────────────────────────────────────────

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 64 }).notNull().default("Default"),
  key_hash: text("key_hash").notNull(),
  prefix: varchar("prefix", { length: 16 }).notNull(),
  last_used_at: timestamp("last_used_at", { withTimezone: true }),
  rotated_at: timestamp("rotated_at", { withTimezone: true }),
  revoked_at: timestamp("revoked_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Agents ───────────────────────────────────────────────

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  agent_id: varchar("agent_id", { length: 255 }).notNull(),
  status: agentStatusEnum("status").notNull().default("active"),
  kill_reason: text("kill_reason"),
  auto_kill_enabled: boolean("auto_kill_enabled").notNull().default(true),
  auto_kill_threshold: integer("auto_kill_threshold").notNull().default(3),
  auto_kill_window_minutes: integer("auto_kill_window_minutes")
    .notNull()
    .default(10),
  version: integer("version").notNull().default(1),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Events ───────────────────────────────────────────────

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agent_id: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    session_id: varchar("session_id", { length: 255 }).notNull(),
    event_type: eventTypeEnum("event_type").notNull(),
    action: text("action").notNull(),
    target: text("target").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    severity_hint: severityEnum("severity_hint").notNull().default("normal"),
    plugin_version: varchar("plugin_version", { length: 32 }),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("events_user_timestamp_idx").on(table.user_id, table.timestamp),
    index("events_agent_timestamp_idx").on(table.agent_id, table.timestamp),
  ]
);

// ── Sessions ─────────────────────────────────────────────

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 255 }).primaryKey(), // session_id from plugin
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agent_id: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull().default("active"), // active, completed, killed
    started_at: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    ended_at: timestamp("ended_at", { withTimezone: true }),
    duration_ms: integer("duration_ms"),
    event_count: integer("event_count").notNull().default(0),
    total_cost: numeric("total_cost", { precision: 12, scale: 6 }).notNull().default("0"),
    total_tokens: integer("total_tokens").notNull().default(0),
    kill_reason: text("kill_reason"),
    metadata: jsonb("metadata").notNull().default({}), // model, plugin_version, etc.
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sessions_user_idx").on(table.user_id),
    index("sessions_agent_idx").on(table.agent_id),
    index("sessions_started_idx").on(table.started_at),
  ]
);

// ── Rules ────────────────────────────────────────────────

export const rules = pgTable("rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  rule_type: varchar("rule_type", { length: 32 }).notNull(),
  config: jsonb("config").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  agent_visible: boolean("agent_visible").notNull().default(true),
  action_mode: varchar("action_mode", { length: 16 }).notNull().default("both"),
  agent_ids: text("agent_ids").array(), // null = all agents, array = scoped
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Rule Templates ──────────────────────────────────────

export const ruleTemplates = pgTable("rule_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  severity: varchar("severity", { length: 16 }).notNull(),
  rule_type: varchar("rule_type", { length: 32 }).notNull(),
  config: jsonb("config").notNull(),
  agent_visible: boolean("agent_visible").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Alerts ───────────────────────────────────────────────

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rule_id: uuid("rule_id").references(() => rules.id, {
    onDelete: "set null",
  }),
  agent_id: uuid("agent_id").references(() => agents.id, {
    onDelete: "set null",
  }),
  severity: severityEnum("severity").notNull(),
  message: text("message").notNull(),
  context: jsonb("context"),
  delivered_channels: text("delivered_channels").array(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Teams ────────────────────────────────────────────────

export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "editor", "viewer"]);

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  owner_id: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tier: tierEnum("tier").notNull().default("free"),
  stripe_customer_id: varchar("stripe_customer_id", { length: 255 }),
  max_agents: integer("max_agents").notNull().default(10),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  team_id: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: memberRoleEnum("role").notNull().default("viewer"),
  joined_at: timestamp("joined_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamInvites = pgTable("team_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  team_id: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: memberRoleEnum("role").notNull().default("viewer"),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  accepted_at: timestamp("accepted_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Shared Rules (team-scoped) ──────────────────────────

export const sharedRules = pgTable("shared_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  team_id: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  rule_type: varchar("rule_type", { length: 32 }).notNull(),
  config: jsonb("config").notNull(),
  scope: text("scope").array(), // agent_ids this rule applies to, null = all
  enabled: boolean("enabled").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Baselines (Phase 5) ─────────────────────────────────

export const baselines = pgTable("baselines", {
  id: uuid("id").primaryKey().defaultRandom(),
  agent_id: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  profile: jsonb("profile").notNull().default({}),
  accumulated_hours: numeric("accumulated_hours", {
    precision: 10,
    scale: 2,
  })
    .notNull()
    .default("0"),
  status: varchar("status", { length: 32 }).notNull().default("learning"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Audit Logs (Enterprise) ─────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    team_id: uuid("team_id").references(() => teams.id, {
      onDelete: "cascade",
    }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 255 }).notNull(),
    resource_type: varchar("resource_type", { length: 64 }).notNull(),
    resource_id: varchar("resource_id", { length: 255 }),
    details: jsonb("details"),
    ip_address: varchar("ip_address", { length: 45 }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_team_idx").on(table.team_id, table.created_at),
    index("audit_logs_user_idx").on(table.user_id, table.created_at),
  ]
);

// ── Custom Webhooks (Enterprise) ─────────────────────────

export const customWebhooks = pgTable("custom_webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  team_id: uuid("team_id").references(() => teams.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  secret: varchar("secret", { length: 255 }),
  events: text("events").array(),
  enabled: boolean("enabled").notNull().default(true),
  last_triggered_at: timestamp("last_triggered_at", { withTimezone: true }),
  last_status: integer("last_status"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Saves (kill switch / rule blocks) ────────────────────

export const saves = pgTable(
  "saves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agent_id: uuid("agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    rule_id: uuid("rule_id").references(() => rules.id, {
      onDelete: "set null",
    }),
    action_blocked: text("action_blocked").notNull(),
    potential_impact: text("potential_impact"),
    source: varchar("source", { length: 32 }).notNull().default("auto-kill"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("saves_user_idx").on(table.user_id, table.created_at),
  ]
);

// ── Alert Channels ──────────────────────────────────────

export const alertChannelEnum = pgEnum("alert_channel", [
  "telegram",
  "discord",
  "sms",
]);

export const alertChannels = pgTable("alert_channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  channel: alertChannelEnum("channel").notNull(),
  config: jsonb("config").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Feedback ─────────────────────────────────────────────

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  user_email: text("user_email"),
  message: text("message").notNull(),
  category: varchar("category", { length: 32 }),
  sentiment: varchar("sentiment", { length: 16 }),
  ai_summary: text("ai_summary"),
  page: text("page"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Page Views (lightweight analytics) ──────────────────

export const pageViews = pgTable("page_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  path: varchar("path", { length: 255 }).notNull(),
  referrer: varchar("referrer", { length: 500 }),
  country: varchar("country", { length: 2 }),
  user_agent: varchar("user_agent", { length: 500 }),
  session_id: varchar("session_id", { length: 36 }),
  device_type: varchar("device_type", { length: 10 }), // mobile, tablet, desktop
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Beta Invite Codes ───────────────────────────────────

export const betaCodes = pgTable("beta_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  channel: varchar("channel", { length: 32 }).notNull(), // "discord" | "reddit"
  max_redemptions: integer("max_redemptions").notNull().default(1),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const betaRedemptions = pgTable("beta_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code_id: uuid("code_id")
    .notNull()
    .references(() => betaCodes.id, { onDelete: "cascade" }),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 32 }).notNull(),
  redeemed_at: timestamp("redeemed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── SSO Configurations (Enterprise) ──────────────────────

export const ssoConfigs = pgTable("sso_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  team_id: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" })
    .unique(),
  provider: varchar("provider", { length: 64 }).notNull(),
  issuer_url: text("issuer_url").notNull(),
  client_id: varchar("client_id", { length: 255 }).notNull(),
  client_secret_encrypted: text("client_secret_encrypted").notNull(),
  metadata_url: text("metadata_url"),
  enabled: boolean("enabled").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
