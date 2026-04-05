import { z } from "zod";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  PORT: z.coerce.number().int().default(3001),
  RESEND_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(["anthropic", "openai", "gemini", "groq"]).optional(),
  AI_MODEL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  AUTH_SECRET: process.env.NODE_ENV === "production"
    ? z.string().min(16)
    : z.string().optional(),
  INTERNAL_API_SECRET: z.string().min(16),
});

export type Env = z.infer<typeof envSchema>;

let _config: Env | undefined;

export function getConfig(): Env {
  if (!_config) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error("Invalid environment variables:", result.error.format());
      process.exit(1);
    }
    _config = result.data;
  }
  return _config;
}
