export const TIERS = ["free", "trial", "paid"] as const;
export type Tier = (typeof TIERS)[number];

export interface TierFeatures {
  maxRules: number;
  nlRules: boolean;
  killSwitch: boolean;
  anomalyDetection: boolean;
  alertChannels: string[];
  retentionDays: number;
  priorityProcessing: boolean;
}

export const TIER_FEATURES: Record<Tier, TierFeatures> = {
  free: {
    maxRules: 3,
    nlRules: false,
    killSwitch: false,
    anomalyDetection: false,
    alertChannels: ["email"],
    retentionDays: 7,
    priorityProcessing: false,
  },
  trial: {
    maxRules: Infinity,
    nlRules: true,
    killSwitch: true,
    anomalyDetection: true,
    alertChannels: ["email", "telegram", "discord", "sms"],
    retentionDays: 90,
    priorityProcessing: true,
  },
  paid: {
    maxRules: Infinity,
    nlRules: true,
    killSwitch: true,
    anomalyDetection: true,
    alertChannels: ["email", "telegram", "discord", "sms"],
    retentionDays: 90,
    priorityProcessing: true,
  },
};
