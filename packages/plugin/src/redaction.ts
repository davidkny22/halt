export const DEFAULT_PATTERNS = [
  // OpenAI
  "sk-[a-zA-Z0-9]{20,}",
  "sk-proj-[a-zA-Z0-9]{20,}",
  // Anthropic
  "sk-ant-[a-zA-Z0-9\\-]{20,}",
  // Stripe
  "sk_live_[a-zA-Z0-9]{20,}",
  "sk_test_[a-zA-Z0-9]{20,}",
  "pk_live_[a-zA-Z0-9]{20,}",
  "pk_test_[a-zA-Z0-9]{20,}",
  // Bearer tokens / JWTs
  "Bearer\\s+[a-zA-Z0-9._\\-]{20,}",
  "eyJ[a-zA-Z0-9_\\-]{10,}\\.[a-zA-Z0-9_\\-]{10,}\\.[a-zA-Z0-9_\\-]{10,}",
  // AWS
  "AKIA[0-9A-Z]{16}",
  // GitHub
  "ghp_[a-zA-Z0-9]{36}",
  "gho_[a-zA-Z0-9]{36}",
  "github_pat_[a-zA-Z0-9_]{20,}",
  // Slack
  "xoxb-[a-zA-Z0-9\\-]+",
  "xoxp-[a-zA-Z0-9\\-]+",
  // Private keys
  "-----BEGIN\\s+(RSA\\s+)?PRIVATE\\s+KEY-----",
  // Passwords in URLs/config
  "password\\s*[=:]\\s*\\S+",
  // Database connection strings with passwords
  "(?:postgres|mysql|mongodb)://[^:]+:[^@]+@",
  // Generic secret assignments
  "(?:secret|token|api_key|apikey)\\s*[=:]\\s*\\S{8,}",
];

export function redact(text: string, patterns: string[]): string {
  let result = text;
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, "gi");
      result = result.replace(regex, "[REDACTED]");
    } catch {
      // Skip invalid regex patterns
    }
  }
  return result;
}
