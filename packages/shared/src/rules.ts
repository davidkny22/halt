import { z } from "zod";

export const RULE_TYPES = ["threshold", "rate", "keyword", "nl"] as const;
export type RuleType = (typeof RULE_TYPES)[number];

export const thresholdConfigSchema = z.object({
  field: z.string(),
  operator: z.enum(["gt", "lt"]),
  value: z.number(),
  windowMinutes: z.number().int().positive(),
});

export type ThresholdConfig = z.infer<typeof thresholdConfigSchema>;

export const rateConfigSchema = z.object({
  eventType: z.string().optional(),
  toolName: z.string().optional(),
  maxCount: z.number().int().positive(),
  windowMinutes: z.number().int().positive(),
});

export type RateConfig = z.infer<typeof rateConfigSchema>;

export const keywordConfigSchema = z.object({
  keywords: z.array(z.string()).min(1),
  matchMode: z.enum(["any", "all"]),
  caseSensitive: z.boolean().default(false),
});

export type KeywordConfig = z.infer<typeof keywordConfigSchema>;

export const nlConfigSchema = z.object({
  promptText: z.string().min(1).max(1000),
});

export type NLConfig = z.infer<typeof nlConfigSchema>;

export const ruleConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("threshold"), ...thresholdConfigSchema.shape }),
  z.object({ type: z.literal("rate"), ...rateConfigSchema.shape }),
  z.object({ type: z.literal("keyword"), ...keywordConfigSchema.shape }),
  z.object({ type: z.literal("nl"), ...nlConfigSchema.shape }),
]);

export type RuleConfig = z.infer<typeof ruleConfigSchema>;

export interface Rule {
  id: string;
  user_id: string;
  name: string;
  rule_type: RuleType;
  config: RuleConfig;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRuleRequest {
  name: string;
  config: RuleConfig;
}

export interface UpdateRuleRequest {
  name?: string;
  config?: RuleConfig;
  enabled?: boolean;
}
