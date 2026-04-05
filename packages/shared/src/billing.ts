export const TIERS = ["free", "trial", "paid", "team", "enterprise"] as const;
export type Tier = (typeof TIERS)[number];

export interface TierFeatures {
  maxRules: number;
  maxAgents: number;
  maxTeamMembers: number;
  maxTeams: number;
  maxSharedRules: number;
  nlRules: boolean;
  killSwitch: boolean;
  monthlyKills: number;
  anomalyDetection: boolean;
  alertChannels: string[];
  customWebhooks: boolean;
  retentionDays: number;
  priorityProcessing: boolean;
  roleManagement: boolean;
  customRoles: boolean;
  auditLogs: boolean;
  sso: boolean;
}

export const TIER_FEATURES: Record<Tier, TierFeatures> = {
  free: {
    maxRules: 3,
    maxAgents: 1,
    maxTeamMembers: 2,
    maxTeams: 1,
    maxSharedRules: 0,
    nlRules: false,
    killSwitch: true,
    monthlyKills: 1,
    anomalyDetection: false,
    alertChannels: ["email"],
    customWebhooks: false,
    retentionDays: 7,
    priorityProcessing: false,
    roleManagement: false,
    customRoles: false,
    auditLogs: false,
    sso: false,
  },
  trial: {
    maxRules: Infinity,
    maxAgents: 3,
    maxTeamMembers: 3,
    maxTeams: 1,
    maxSharedRules: 10,
    nlRules: true,
    killSwitch: true,
    monthlyKills: Infinity,
    anomalyDetection: true,
    alertChannels: ["email", "telegram", "discord", "sms"],
    customWebhooks: false,
    retentionDays: 90,
    priorityProcessing: true,
    roleManagement: true,
    customRoles: false,
    auditLogs: false,
    sso: false,
  },
  paid: {
    maxRules: Infinity,
    maxAgents: 3,
    maxTeamMembers: 3,
    maxTeams: 1,
    maxSharedRules: 10,
    nlRules: true,
    killSwitch: true,
    monthlyKills: Infinity,
    anomalyDetection: true,
    alertChannels: ["email", "telegram", "discord", "sms"],
    customWebhooks: false,
    retentionDays: 90,
    priorityProcessing: true,
    roleManagement: true,
    customRoles: false,
    auditLogs: false,
    sso: false,
  },
  team: {
    maxRules: Infinity,
    maxAgents: 10,
    maxTeamMembers: 10,
    maxTeams: 1,
    maxSharedRules: Infinity,
    nlRules: true,
    killSwitch: true,
    monthlyKills: Infinity,
    anomalyDetection: true,
    alertChannels: ["email", "telegram", "discord", "sms"],
    customWebhooks: false,
    retentionDays: 365,
    priorityProcessing: true,
    roleManagement: true,
    customRoles: false,
    auditLogs: false,
    sso: false,
  },
  enterprise: {
    maxRules: Infinity,
    maxAgents: Infinity,
    maxTeamMembers: Infinity,
    maxTeams: Infinity,
    maxSharedRules: Infinity,
    nlRules: true,
    killSwitch: true,
    monthlyKills: Infinity,
    anomalyDetection: true,
    alertChannels: ["email", "telegram", "discord", "sms"],
    customWebhooks: true,
    retentionDays: Infinity,
    priorityProcessing: true,
    roleManagement: true,
    customRoles: true,
    auditLogs: true,
    sso: true,
  },
};
