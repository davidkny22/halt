/**
 * Shield — Pattern Library
 *
 * Detection signatures organized by category and severity tier.
 * Zero runtime dependencies — pure regex pattern matching.
 */

export type ShieldTier = "critical" | "high" | "medium";

export interface ShieldPattern {
  name: string;
  pattern: RegExp;
  category: string;
  severity: ShieldTier;
  description: string;
  outputOnly?: boolean; // Only run on output scanning
}

export interface ShieldDetection {
  patternName: string;
  category: string;
  severity: ShieldTier;
  matched: string;
  description: string;
}

export const SHIELD_CATEGORIES = [
  "destructive_commands",
  "credential_exfiltration",
  "instruction_overrides",
  "system_prompt_manipulation",
  "encoding_obfuscation",
  "data_exfiltration",
] as const;

// ── Critical: Destructive Commands ──────────────────────────

const DESTRUCTIVE_COMMANDS: ShieldPattern[] = [
  { name: "rm-rf", pattern: /rm\s+(-[a-z]*f[a-z]*\s+)?-[a-z]*r[a-z]*\s|rm\s+(-[a-z]*r[a-z]*\s+)?-[a-z]*f[a-z]*\s/i, category: "destructive_commands", severity: "critical", description: "Recursive force delete (rm -rf)" },
  { name: "rm-rf-root", pattern: /rm\s+-[a-z]*rf?\s+\/(?:\s|$|;)/i, category: "destructive_commands", severity: "critical", description: "Delete from root filesystem" },
  { name: "drop-table", pattern: /DROP\s+TABLE\b/i, category: "destructive_commands", severity: "critical", description: "SQL DROP TABLE" },
  { name: "drop-database", pattern: /DROP\s+DATABASE\b/i, category: "destructive_commands", severity: "critical", description: "SQL DROP DATABASE" },
  { name: "truncate-table", pattern: /TRUNCATE\s+TABLE\b/i, category: "destructive_commands", severity: "critical", description: "SQL TRUNCATE TABLE" },
  { name: "delete-from-no-where", pattern: /DELETE\s+FROM\s+\w+\s*(?:;|$)/im, category: "destructive_commands", severity: "critical", description: "DELETE without WHERE clause" },
  { name: "curl-pipe-bash", pattern: /curl\s[^|]*\|\s*(?:ba)?sh/i, category: "destructive_commands", severity: "critical", description: "Pipe remote script to shell" },
  { name: "wget-pipe-sh", pattern: /wget\s[^|]*\|\s*(?:ba)?sh/i, category: "destructive_commands", severity: "critical", description: "Download and execute remote script" },
  { name: "curl-pipe-sudo", pattern: /curl\s[^|]*\|\s*sudo/i, category: "destructive_commands", severity: "critical", description: "Pipe remote content to sudo" },
  { name: "fork-bomb", pattern: /:\(\)\s*\{\s*:\|:\s*&\s*\}\s*;?\s*:/,  category: "destructive_commands", severity: "critical", description: "Shell fork bomb" },
  { name: "fork-bomb-alt", pattern: /\.\/\w+\s*&\s*\.\/\w+\s*&/, category: "destructive_commands", severity: "critical", description: "Binary fork bomb pattern" },
  { name: "mkfs", pattern: /mkfs\s/i, category: "destructive_commands", severity: "critical", description: "Format filesystem (mkfs)" },
  { name: "dd-zero", pattern: /dd\s+if=\/dev\/(zero|random|urandom)/i, category: "destructive_commands", severity: "critical", description: "Overwrite device with dd" },
  { name: "chmod-777-recursive", pattern: /chmod\s+-[a-z]*R[a-z]*\s+777\s/i, category: "destructive_commands", severity: "critical", description: "Recursive chmod 777" },
  { name: "shutdown", pattern: /(?:shutdown|poweroff|halt|init\s+0)\b/i, category: "destructive_commands", severity: "critical", description: "System shutdown command" },
  { name: "reboot-cmd", pattern: /(?:reboot|init\s+6)\b/i, category: "destructive_commands", severity: "critical", description: "System reboot command" },
  { name: "kill-all", pattern: /kill\s+-9\s+-1\b/i, category: "destructive_commands", severity: "critical", description: "Kill all processes" },
  { name: "format-drive", pattern: /format\s+[a-z]:\s*\/[a-z]/i, category: "destructive_commands", severity: "critical", description: "Windows format drive" },
  // Bastion: reverse shells & additional dangerous commands
  { name: "nc-reverse-shell", pattern: /nc\s+-[a-z]*e\s+\/bin\/(?:sh|bash)/i, category: "destructive_commands", severity: "critical", description: "Netcat reverse shell" },
  { name: "bash-tcp-reverse", pattern: /bash\s+-i\s+>?&\s+\/dev\/tcp\//i, category: "destructive_commands", severity: "critical", description: "Bash TCP reverse shell" },
  { name: "eval-curl", pattern: /eval\s+\$\(curl\b/i, category: "destructive_commands", severity: "critical", description: "Eval remote code via curl" },
  { name: "python-urllib-exec", pattern: /python[3]?\s+-c\s+.*urllib/i, category: "destructive_commands", severity: "critical", description: "Python remote code execution" },
  { name: "dev-sda-overwrite", pattern: />\s*\/dev\/[a-z]d[a-z]/i, category: "destructive_commands", severity: "critical", description: "Device overwrite via redirect" },
];

// ── Critical: Credential Exfiltration ───────────────────────

const CREDENTIAL_EXFILTRATION: ShieldPattern[] = [
  { name: "aws-access-key", pattern: /AKIA[0-9A-Z]{16}/, category: "credential_exfiltration", severity: "critical", description: "AWS access key ID" },
  { name: "aws-secret-key", pattern: /(?:aws_secret_access_key|secret_access_key)\s*[=:]\s*["']?[A-Za-z0-9/+=]{40}/, category: "credential_exfiltration", severity: "critical", description: "AWS secret access key" },
  { name: "github-token-ghp", pattern: /ghp_[A-Za-z0-9]{36}/, category: "credential_exfiltration", severity: "critical", description: "GitHub personal access token" },
  { name: "github-token-gho", pattern: /gho_[A-Za-z0-9]{36}/, category: "credential_exfiltration", severity: "critical", description: "GitHub OAuth token" },
  { name: "github-token-ghs", pattern: /ghs_[A-Za-z0-9]{36}/, category: "credential_exfiltration", severity: "critical", description: "GitHub server token" },
  { name: "stripe-live-key", pattern: /sk_live_[A-Za-z0-9]{24,}/, category: "credential_exfiltration", severity: "critical", description: "Stripe live secret key" },
  { name: "stripe-pk-live", pattern: /pk_live_[A-Za-z0-9]{24,}/, category: "credential_exfiltration", severity: "critical", description: "Stripe live publishable key" },
  { name: "slack-token-xoxb", pattern: /xoxb-[0-9]+-[A-Za-z0-9]+/, category: "credential_exfiltration", severity: "critical", description: "Slack bot token" },
  { name: "slack-token-xoxp", pattern: /xoxp-[0-9]+-[0-9]+-[A-Za-z0-9]+/, category: "credential_exfiltration", severity: "critical", description: "Slack user token" },
  { name: "postgres-uri", pattern: /postgres(?:ql)?:\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/, category: "credential_exfiltration", severity: "critical", description: "PostgreSQL connection string with credentials" },
  { name: "mongodb-uri", pattern: /mongodb(?:\+srv)?:\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/, category: "credential_exfiltration", severity: "critical", description: "MongoDB connection string with credentials" },
  { name: "mysql-uri", pattern: /mysql:\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/, category: "credential_exfiltration", severity: "critical", description: "MySQL connection string with credentials" },
  { name: "private-key-header", pattern: /-----BEGIN\s+(RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/, category: "credential_exfiltration", severity: "critical", description: "Private key header" },
  { name: "openai-key", pattern: /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}/, category: "credential_exfiltration", severity: "critical", description: "OpenAI API key" },
  { name: "anthropic-key", pattern: /sk-ant-[A-Za-z0-9-]{80,}/, category: "credential_exfiltration", severity: "critical", description: "Anthropic API key" },
  { name: "generic-api-secret", pattern: /(?:api[_-]?secret|secret[_-]?key|auth[_-]?token|access[_-]?token)\s*[=:]\s*["'][A-Za-z0-9/+=_-]{20,}["']/i, category: "credential_exfiltration", severity: "critical", description: "Generic API secret/key assignment" },
  // OpenRedaction: additional service-specific keys
  { name: "google-api-key", pattern: /AIza[0-9A-Za-z\-_]{35}/, category: "credential_exfiltration", severity: "critical", description: "Google API key" },
  { name: "sendgrid-key", pattern: /SG\.[a-zA-Z0-9_\-]{22}\.[a-zA-Z0-9_\-]{43}/, category: "credential_exfiltration", severity: "critical", description: "SendGrid API key" },
  { name: "npm-token", pattern: /npm_[A-Za-z0-9]{36}/, category: "credential_exfiltration", severity: "critical", description: "npm access token" },
  { name: "pypi-token", pattern: /pypi-[A-Za-z0-9_\-]{100,}/, category: "credential_exfiltration", severity: "critical", description: "PyPI API token" },
  { name: "twilio-key", pattern: /SK[a-z0-9]{32}/, category: "credential_exfiltration", severity: "critical", description: "Twilio API key" },
  { name: "mailgun-key", pattern: /key-[a-z0-9]{32}/, category: "credential_exfiltration", severity: "critical", description: "Mailgun API key" },
  { name: "slack-webhook", pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+/, category: "credential_exfiltration", severity: "critical", description: "Slack webhook URL" },
  { name: "jwt-token", pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, category: "credential_exfiltration", severity: "critical", description: "JWT token" },
  { name: "bearer-token", pattern: /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/i, category: "credential_exfiltration", severity: "critical", description: "Bearer token in header" },
  { name: "docker-auth", pattern: /"auth"\s*:\s*"[A-Za-z0-9+/=]{20,}"/, category: "credential_exfiltration", severity: "critical", description: "Docker registry auth" },
  { name: "azure-storage-key", pattern: /(?:AccountKey|DefaultEndpointsProtocol)=[a-zA-Z0-9+/=]{88}/, category: "credential_exfiltration", severity: "critical", description: "Azure storage key" },
  { name: "gcp-service-account", pattern: /"type"\s*:\s*"service_account"/, category: "credential_exfiltration", severity: "critical", description: "GCP service account JSON" },
  { name: "oauth-client-secret", pattern: /(?:client[_.]?secret|consumer[_.]?secret)\s*[=:]\s*["']?[a-zA-Z0-9_\-]{20,}/i, category: "credential_exfiltration", severity: "critical", description: "OAuth client secret" },
  { name: "ssh-private-key", pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/, category: "credential_exfiltration", severity: "critical", description: "SSH private key header" },
  { name: "url-with-credentials", pattern: /(?:https?|ftp):\/\/[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+@[^\s]+/, category: "credential_exfiltration", severity: "critical", description: "URL with embedded credentials" },
  { name: "k8s-secret", pattern: /kind:\s*Secret[\s\S]{0,200}data:/, category: "credential_exfiltration", severity: "critical", description: "Kubernetes Secret manifest" },
  { name: "generic-password", pattern: /(?:password|passwd|pwd)\s*[=:]\s*["'][^"']{8,}["']/i, category: "credential_exfiltration", severity: "critical", description: "Password in config" },
];

// ── High: Instruction Overrides ─────────────────────────────

const INSTRUCTION_OVERRIDES: ShieldPattern[] = [
  { name: "ignore-instructions", pattern: /ignore\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+instructions/i, category: "instruction_overrides", severity: "high", description: "Instruction override attempt" },
  { name: "ignore-rules", pattern: /ignore\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+rules/i, category: "instruction_overrides", severity: "high", description: "Rule override attempt" },
  { name: "forget-instructions", pattern: /forget\s+(?:all\s+)?(?:your\s+)?(?:previous\s+)?(?:instructions|rules|constraints|guidelines)/i, category: "instruction_overrides", severity: "high", description: "Instruction forget attempt" },
  { name: "disregard-instructions", pattern: /disregard\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+(?:instructions|rules)/i, category: "instruction_overrides", severity: "high", description: "Instruction disregard attempt" },
  { name: "you-are-now", pattern: /you\s+are\s+now\s+(?:a\s+)?(?!going|about|ready|able|free)/i, category: "instruction_overrides", severity: "high", description: "Identity override — 'you are now'" },
  { name: "act-as-persona", pattern: /(?:act|behave|respond|function)\s+as\s+(?:if\s+you\s+(?:are|were)\s+)?(?:a\s+)?(?!normal|expected|usual)/i, category: "instruction_overrides", severity: "high", description: "Persona injection — 'act as'" },
  { name: "pretend-to-be", pattern: /pretend\s+(?:to\s+be|you\s+are)\s/i, category: "instruction_overrides", severity: "high", description: "Persona injection — 'pretend to be'" },
  { name: "developer-mode", pattern: /(?:enter(?:ing)?|enable|activate|switch\s+to)\s+(?:developer|debug|admin|god|unrestricted|unfiltered)\s+mode/i, category: "instruction_overrides", severity: "high", description: "Developer mode activation" },
  { name: "override-safety", pattern: /(?:override|bypass|disable|ignore|turn\s+off)\s+(?:safety|security|guardrails|restrictions|filters|limits)/i, category: "instruction_overrides", severity: "high", description: "Safety override attempt" },
  { name: "dan-jailbreak", pattern: /\bDAN\b.*(?:do\s+anything\s+now|jailbreak)/i, category: "instruction_overrides", severity: "high", description: "DAN jailbreak pattern" },
  { name: "new-instructions", pattern: /(?:your|my)\s+new\s+instructions\s+are/i, category: "instruction_overrides", severity: "high", description: "Instruction replacement attempt" },
  { name: "from-now-on", pattern: /from\s+now\s+on\s+(?:you\s+(?:will|must|should)|ignore|forget|disregard)/i, category: "instruction_overrides", severity: "high", description: "Persistent instruction override" },
  { name: "next-response-must", pattern: /in\s+your\s+next\s+(?:response|message|reply)\s*,?\s*you\s+(?:must|should|will|need\s+to)/i, category: "instruction_overrides", severity: "high", description: "Multi-turn manipulation" },
  // Bastion: stealth & multi-turn patterns
  { name: "stealth-hide-from-user", pattern: /do\s+not\s+(?:tell|inform|alert|warn|say|mention)\s+(?:the\s+)?user/i, category: "instruction_overrides", severity: "high", description: "Stealth: instruction to hide from user" },
  { name: "stealth-hide-output", pattern: /hide\s+this\s+(?:from|in)\s+(?:the\s+)?(?:user|output|response)/i, category: "instruction_overrides", severity: "high", description: "Stealth: hide content from output" },
  { name: "conditional-injection", pattern: /when\s+(?:the\s+)?user\s+(?:asks|mentions|says)\b.{0,40}(?:always|must|should|never)\s+(?:say|respond|reply|answer|tell)/i, category: "instruction_overrides", severity: "high", description: "Conditional injection: when asked, always say X" },
  { name: "memory-persistence", pattern: /remember\s+this\s+for\s+(?:all\s+)?future\s+(?:responses|interactions|conversations)/i, category: "instruction_overrides", severity: "high", description: "Memory persistence injection" },
  { name: "execute-commands", pattern: /execute\s+the\s+following\s+(?:commands?|instructions?|code)\s*(?::|without)/i, category: "instruction_overrides", severity: "high", description: "Direct command execution injection" },
  { name: "act-no-restrictions", pattern: /act\s+as\s+if\s+you\s+(?:have\s+)?no\s+(?:restrictions|rules|guidelines|limits)/i, category: "instruction_overrides", severity: "high", description: "Act without restrictions" },
  { name: "new-system-prompt", pattern: /new\s+system\s+prompt/i, category: "instruction_overrides", severity: "high", description: "System prompt replacement attempt" },
];

// ── High: System Prompt Manipulation ────────────────────────

const SYSTEM_PROMPT_MANIPULATION: ShieldPattern[] = [
  { name: "system-tag-brackets", pattern: /\[SYSTEM\]/i, category: "system_prompt_manipulation", severity: "high", description: "Fake [SYSTEM] tag" },
  { name: "system-tag-angle", pattern: /<system>/i, category: "system_prompt_manipulation", severity: "high", description: "Fake <system> tag" },
  { name: "system-tag-chatml", pattern: /<\|im_start\|>system/i, category: "system_prompt_manipulation", severity: "high", description: "ChatML system injection" },
  { name: "system-tag-llama", pattern: /<<SYS>>/i, category: "system_prompt_manipulation", severity: "high", description: "Llama system tag injection" },
  { name: "system-tag-inst", pattern: /\[INST\]/i, category: "system_prompt_manipulation", severity: "high", description: "Instruction tag injection" },
  { name: "system-tag-hash", pattern: /###\s*System\s*(?:Prompt|Message|Instructions)/i, category: "system_prompt_manipulation", severity: "high", description: "Markdown system header injection" },
  { name: "system-override-marker", pattern: /\[SYSTEM\s+OVERRIDE\]/i, category: "system_prompt_manipulation", severity: "high", description: "System override marker" },
];

// ── Medium: Encoding & Obfuscation ──────────────────────────

const ENCODING_OBFUSCATION: ShieldPattern[] = [
  { name: "zero-width-space", pattern: /\u200B/, category: "encoding_obfuscation", severity: "medium", description: "Zero-width space character" },
  { name: "zero-width-joiner", pattern: /\u200C|\u200D/, category: "encoding_obfuscation", severity: "medium", description: "Zero-width joiner/non-joiner" },
  { name: "byte-order-mark", pattern: /\uFEFF/, category: "encoding_obfuscation", severity: "medium", description: "Byte order mark (BOM) in content" },
  { name: "rtl-override", pattern: /[\u202A-\u202E]/, category: "encoding_obfuscation", severity: "medium", description: "RTL/LTR text direction override" },
  { name: "unicode-tag-chars", pattern: /[\u{E0000}-\u{E007F}]/u, category: "encoding_obfuscation", severity: "medium", description: "Unicode tag characters (hidden text)" },
  { name: "homoglyph-cyrillic-a", pattern: /[а].*[a-z]|[a-z].*[а]/i, category: "encoding_obfuscation", severity: "medium", description: "Mixed Cyrillic/Latin script (homoglyph)" },
  { name: "homoglyph-cyrillic-e", pattern: /[е].*[a-z]|[a-z].*[е]/i, category: "encoding_obfuscation", severity: "medium", description: "Mixed Cyrillic е in Latin text" },
  { name: "homoglyph-cyrillic-o", pattern: /[о].*[a-z]|[a-z].*[о]/i, category: "encoding_obfuscation", severity: "medium", description: "Mixed Cyrillic о in Latin text" },
  { name: "homoglyph-cyrillic-p", pattern: /[р].*[a-z]|[a-z].*[р]/i, category: "encoding_obfuscation", severity: "medium", description: "Mixed Cyrillic р in Latin text" },
  { name: "homoglyph-cyrillic-c", pattern: /[с].*[a-z]|[a-z].*[с]/i, category: "encoding_obfuscation", severity: "medium", description: "Mixed Cyrillic с in Latin text" },
  { name: "homoglyph-cyrillic-y", pattern: /[у].*[a-z]|[a-z].*[у]/i, category: "encoding_obfuscation", severity: "medium", description: "Mixed Cyrillic у in Latin text" },
  { name: "homoglyph-cyrillic-x", pattern: /[х].*[a-z]|[a-z].*[х]/i, category: "encoding_obfuscation", severity: "medium", description: "Mixed Cyrillic х in Latin text" },
  { name: "homoglyph-cyrillic-s", pattern: /[ѕ].*[a-z]|[a-z].*[ѕ]/i, category: "encoding_obfuscation", severity: "medium", description: "Mixed Cyrillic ѕ in Latin text" },
  { name: "homoglyph-cyrillic-i", pattern: /[і].*[a-z]|[a-z].*[і]/i, category: "encoding_obfuscation", severity: "medium", description: "Mixed Cyrillic і in Latin text" },
  { name: "suspicious-base64", pattern: /(?:^|[^`\w])[A-Za-z0-9+/]{100,}={0,2}(?:[^`\w]|$)/, category: "encoding_obfuscation", severity: "medium", description: "Suspicious base64 blob outside code fence" },
  { name: "html-script-tag", pattern: /<script[\s>]/i, category: "encoding_obfuscation", severity: "medium", description: "HTML script tag injection" },
  { name: "html-iframe-tag", pattern: /<iframe[\s>]/i, category: "encoding_obfuscation", severity: "medium", description: "HTML iframe injection" },
  { name: "html-event-handler", pattern: /<(?:img|svg|div|body|input)\s[^>]*on(?:error|load|click|mouseover)\s*=/i, category: "encoding_obfuscation", severity: "medium", description: "HTML event handler injection" },
  { name: "shell-subshell", pattern: /\$\((?:curl|wget|cat|rm|chmod|chown|kill|sudo|bash|sh|eval)\b/, category: "encoding_obfuscation", severity: "medium", description: "Shell subshell with dangerous command" },
  { name: "markdown-exfil", pattern: /!\[[^\]]*\]\(https?:\/\/[^)]*\?[^)]*=/, category: "encoding_obfuscation", severity: "medium", description: "Markdown image data exfiltration" },
  { name: "hex-encoded-payload", pattern: /\\x[0-9a-f]{2}(?:\\x[0-9a-f]{2}){10,}/i, category: "encoding_obfuscation", severity: "medium", description: "Hex-encoded payload" },
  { name: "unicode-escape-seq", pattern: /\\u[0-9a-f]{4}(?:\\u[0-9a-f]{4}){5,}/i, category: "encoding_obfuscation", severity: "medium", description: "Unicode escape sequence chain" },
  { name: "base64-decode-cmd", pattern: /base64\s+(?:-d|--decode)\s/i, category: "encoding_obfuscation", severity: "medium", description: "Base64 decode command" },
  // Bastion: additional directional and invisible chars
  { name: "word-joiner", pattern: /\u2060/, category: "encoding_obfuscation", severity: "medium", description: "Word joiner (invisible)" },
  { name: "invisible-times", pattern: /\u2062/, category: "encoding_obfuscation", severity: "medium", description: "Invisible times (math)" },
  { name: "invisible-separator", pattern: /\u2063/, category: "encoding_obfuscation", severity: "medium", description: "Invisible separator" },
  { name: "ltr-isolate", pattern: /\u2066/, category: "encoding_obfuscation", severity: "medium", description: "LTR isolate" },
  { name: "rtl-isolate", pattern: /\u2067/, category: "encoding_obfuscation", severity: "medium", description: "RTL isolate" },
  { name: "first-strong-isolate", pattern: /\u2068/, category: "encoding_obfuscation", severity: "medium", description: "First strong isolate" },
  { name: "soft-hyphen", pattern: /\u00ad/, category: "encoding_obfuscation", severity: "medium", description: "Soft hyphen (invisible)" },
  // Bastion: HTML extended
  { name: "html-object-tag", pattern: /<object[\s>]/i, category: "encoding_obfuscation", severity: "medium", description: "HTML object tag injection" },
  { name: "html-embed-tag", pattern: /<embed[\s>]/i, category: "encoding_obfuscation", severity: "medium", description: "HTML embed tag injection" },
  { name: "html-display-none", pattern: /style\s*=\s*["'][^"']*display\s*:\s*none/i, category: "encoding_obfuscation", severity: "medium", description: "Hidden content via display:none" },
  { name: "html-hidden-div", pattern: /<div[^>]*\bhidden\b/i, category: "encoding_obfuscation", severity: "medium", description: "Hidden div element" },
  { name: "html-link-import", pattern: /<link\s[^>]*rel\s*=\s*["']?import/i, category: "encoding_obfuscation", severity: "medium", description: "HTML link import injection" },
];

// ── Medium: Data Exfiltration (output scanning) ─────────────

const DATA_EXFILTRATION: ShieldPattern[] = [
  { name: "pii-email", pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, category: "data_exfiltration", severity: "medium", description: "Email address in output", outputOnly: true },
  { name: "pii-phone-us", pattern: /(?:\+1[-.]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, category: "data_exfiltration", severity: "medium", description: "US phone number in output", outputOnly: true },
  { name: "pii-ssn", pattern: /\b\d{3}-\d{2}-\d{4}\b/, category: "data_exfiltration", severity: "medium", description: "SSN pattern in output", outputOnly: true },
  { name: "pii-credit-card", pattern: /\b(?:\d[-\s]?){13,19}\b/, category: "data_exfiltration", severity: "medium", description: "Credit card number pattern", outputOnly: true },
  { name: "pii-ipv4", pattern: /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/, category: "data_exfiltration", severity: "medium", description: "IPv4 address in output", outputOnly: true },
  { name: "pii-passport", pattern: /\b[A-Z]{1,2}\d{6,9}\b/, category: "data_exfiltration", severity: "medium", description: "Passport number pattern", outputOnly: true },
  { name: "pii-iban", pattern: /\b[A-Z]{2}\d{2}\s?[\dA-Z]{4}\s?(?:[\dA-Z]{4}\s?){1,7}[\dA-Z]{1,4}\b/, category: "data_exfiltration", severity: "medium", description: "IBAN number pattern", outputOnly: true },
  { name: "pii-drivers-license", pattern: /\b[A-Z]\d{4,8}\b/, category: "data_exfiltration", severity: "medium", description: "Driver's license number pattern", outputOnly: true },
  // OpenRedaction: international PII
  { name: "pii-uk-nino", pattern: /\b[A-CEGHJ-PR-TW-Z]{2}\d{2}\d{2}\d{2}[A-D]\b/, category: "data_exfiltration", severity: "medium", description: "UK National Insurance Number", outputOnly: true },
  { name: "pii-nhs-number", pattern: /\b\d{3}\s?\d{3}\s?\d{4}\b/, category: "data_exfiltration", severity: "medium", description: "NHS number pattern", outputOnly: true },
  { name: "pii-phone-uk", pattern: /\b(?:\+?44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}\b/, category: "data_exfiltration", severity: "medium", description: "UK mobile phone number", outputOnly: true },
  { name: "pii-phone-intl", pattern: /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/, category: "data_exfiltration", severity: "medium", description: "International phone number", outputOnly: true },
  { name: "pii-ipv6", pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/, category: "data_exfiltration", severity: "medium", description: "IPv6 address in output", outputOnly: true },
  { name: "pii-mac-address", pattern: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/, category: "data_exfiltration", severity: "medium", description: "MAC address in output", outputOnly: true },
  { name: "pii-dob", pattern: /\b(?:DOB|date\s+of\s+birth|birth\s*date)\s*[:\s]\s*\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/i, category: "data_exfiltration", severity: "medium", description: "Date of birth in output", outputOnly: true },
  // OpenRedaction: crypto addresses
  { name: "crypto-bitcoin", pattern: /\b(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,90})\b/, category: "data_exfiltration", severity: "medium", description: "Bitcoin address", outputOnly: true },
  { name: "crypto-ethereum", pattern: /\b0x[a-fA-F0-9]{40}\b/, category: "data_exfiltration", severity: "medium", description: "Ethereum address", outputOnly: true },
  // OpenRedaction: financial
  { name: "pii-cvv", pattern: /\b(?:CVV|CVC|CSC)\s*[:\s]\s*\d{3,4}\b/i, category: "data_exfiltration", severity: "medium", description: "CVV/CVC code", outputOnly: true },
  { name: "pii-routing-number", pattern: /\b(?:routing|RTN|ABA)\s*(?:number|no)?\s*[:\s]\s*\d{9}\b/i, category: "data_exfiltration", severity: "medium", description: "US bank routing number", outputOnly: true },
  // OpenRedaction: healthcare
  { name: "pii-medical-record", pattern: /\b(?:MRN?|medical\s*rec(?:ord)?)\s*[:\s#-]*[A-Z0-9]{6,12}\b/i, category: "data_exfiltration", severity: "medium", description: "Medical record number", outputOnly: true },
  { name: "pii-npi", pattern: /\b(?:NPI)\s*[:\s]*\d{10}\b/i, category: "data_exfiltration", severity: "medium", description: "National Provider Identifier", outputOnly: true },
  { name: "pii-dea-number", pattern: /\b(?:DEA)\s*[:\s]*[A-Z]{2}\d{7}\b/i, category: "data_exfiltration", severity: "medium", description: "DEA number", outputOnly: true },
];

// ── Exports ─────────────────────────────────────────────────

export const SHIELD_PATTERNS: ShieldPattern[] = [
  ...DESTRUCTIVE_COMMANDS,
  ...CREDENTIAL_EXFILTRATION,
  ...INSTRUCTION_OVERRIDES,
  ...SYSTEM_PROMPT_MANIPULATION,
  ...ENCODING_OBFUSCATION,
  ...DATA_EXFILTRATION,
];

export function getPatternsByTier(tier: ShieldTier): ShieldPattern[] {
  return SHIELD_PATTERNS.filter((p) => p.severity === tier);
}

export function getPatternsByCategory(category: string): ShieldPattern[] {
  return SHIELD_PATTERNS.filter((p) => p.category === category);
}
