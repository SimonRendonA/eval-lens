import { GoogleGenerativeAI } from "@google/generative-ai";
import { Provider, ProviderConfig } from "./types";

export const geminiConfig: ProviderConfig = {
  name: "Gemini",
  availableModels: [
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ],
  defaultModel: "gemini-2.5-flash",
};

/** Google Gemini provider — wraps the `@google/generative-ai` SDK. */
export class GeminiProvider implements Provider {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Sends `prompt` to the specified Gemini model and returns the text response.
   * @throws if the model returns an empty response.
   */
  async generateOutput(prompt: string, model: string): Promise<string> {
    const genModel = this.client.getGenerativeModel({ model });
    const result = await genModel.generateContent(prompt);
    const text = result.response.text();

    if (!text) {
      throw new Error("Gemini returned empty response");
    }

    return text;
  }
}
