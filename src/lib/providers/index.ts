import { Provider, AvailableProvider } from "./types";
import { OpenAIProvider, openaiConfig } from "./openai";
import { AnthropicProvider, anthropicConfig } from "./anthropic";
import { GeminiProvider, geminiConfig } from "./gemini";

export type { Provider, ProviderConfig, AvailableProvider } from "./types";

/**
 * Instantiates a provider implementation for the given id.
 *
 * @throws {Error} (via TypeScript exhaustiveness) if an unknown id is passed
 */
export function createProvider(
  id: "openai" | "anthropic" | "gemini",
  apiKey: string,
): Provider {
  switch (id) {
    case "openai":
      return new OpenAIProvider(apiKey);
    case "anthropic":
      return new AnthropicProvider(apiKey);
    case "gemini":
      return new GeminiProvider(apiKey);
  }
}

/**
 * Returns the list of providers that have an API key present in `env`.
 * Typically called with `process.env` on the server side.
 *
 * Checks: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
 */
export function getAvailableProviders(
  env: Record<string, string | undefined>,
): AvailableProvider[] {
  const providers: AvailableProvider[] = [];

  if (env.OPENAI_API_KEY) {
    providers.push({ id: "openai", config: openaiConfig });
  }
  if (env.ANTHROPIC_API_KEY) {
    providers.push({ id: "anthropic", config: anthropicConfig });
  }
  if (env.GEMINI_API_KEY) {
    providers.push({ id: "gemini", config: geminiConfig });
  }

  return providers;
}
