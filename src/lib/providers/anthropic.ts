import Anthropic from "@anthropic-ai/sdk";
import { Provider, ProviderConfig } from "./types";

export const anthropicConfig: ProviderConfig = {
  name: "Anthropic",
  availableModels: [
    "claude-opus-4-6",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
  ],
  defaultModel: "claude-sonnet-4-6",
};

/** Anthropic provider — wraps the official `@anthropic-ai/sdk`. */
export class AnthropicProvider implements Provider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Sends `prompt` as a user message and returns the first text block.
   * @throws if the API returns an empty response or a non-text content block.
   */
  async generateOutput(prompt: string, model: string): Promise<string> {
    const response = await this.client.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    if (!block || block.type !== "text") {
      throw new Error("Anthropic returned empty response");
    }

    return block.text;
  }
}
