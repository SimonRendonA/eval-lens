import OpenAI from "openai";
import { Provider, ProviderConfig } from "./types";

export const openaiConfig: ProviderConfig = {
  name: "OpenAI",
  availableModels: ["gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-4o", "gpt-4.1-mini"],
  defaultModel: "gpt-5.4-mini",
};

/** OpenAI provider — wraps the official `openai` SDK. */
export class OpenAIProvider implements Provider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Sends `prompt` as a user message and returns the assistant's text response.
   * @throws if the API returns an empty or missing content block.
   */
  async generateOutput(prompt: string, model: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }

    return content;
  }
}
