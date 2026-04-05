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
  key_hash: text("key_hash").notNull(),
  prefix: varchar("prefix", { length: 16 }).notNull(),
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
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
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
