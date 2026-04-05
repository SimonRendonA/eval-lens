/** Contract that every AI provider implementation must satisfy. */
export interface Provider {
  /**
   * Sends `prompt` to the model and returns the raw text response.
   * @throws if the provider returns an empty response.
   */
  generateOutput(prompt: string, model: string): Promise<string>;
}

/** Static metadata for a provider: display name and supported models. */
export type ProviderConfig = {
  name: string;
  availableModels: string[];
  defaultModel: string;
};

/** A provider that is configured and ready to use (API key is present). */
export type AvailableProvider = {
  id: "openai" | "anthropic" | "gemini";
  config: ProviderConfig;
};
