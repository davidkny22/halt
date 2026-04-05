import type { KeywordConfig } from "@clawnitor/shared";
import type { ClawnitorEvent } from "@clawnitor/shared";

export interface EvalResult {
  triggered: boolean;
  context?: string;
}

export function evaluateKeyword(
  events: ClawnitorEvent[],
  config: KeywordConfig
): EvalResult {
  const matchedKeywords = new Set<string>();

  for (const event of events) {
    const searchable = [
      event.action,
      event.target,
      (event.metadata as Record<string, unknown>).raw_snippet as string,
    ]
      .filter(Boolean)
      .join(" ");

    const text = config.caseSensitive ? searchable : searchable.toLowerCase();

    for (const keyword of config.keywords) {
      const kw = config.caseSensitive ? keyword : keyword.toLowerCase();
      if (text.includes(kw)) {
        matchedKeywords.add(keyword);
      }
    }
  }

  const triggered =
    config.matchMode === "any"
      ? matchedKeywords.size > 0
      : matchedKeywords.size === config.keywords.length;

  return {
    triggered,
    context: triggered
      ? `Matched keywords: ${[...matchedKeywords].join(", ")}`
      : undefined,
  };
}
