export interface AzureOpenAiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AzureOpenAiJsonOptions {
  system: string;
  user: string;
  temperature?: number;
}

export function getAzureOpenAiStatus(): { configured: boolean; missing: string[] } {
  const required = ['AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_DEPLOYMENT'] as const;
  const missing = required.filter((name) => !process.env[name]);
  return { configured: missing.length === 0, missing };
}

export async function generateAgentJson<T>(options: AzureOpenAiJsonOptions): Promise<T | null> {
  const status = getAzureOpenAiStatus();
  if (!status.configured) {
    return null;
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT as string;
  const apiKey = process.env.AZURE_OPENAI_API_KEY as string;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT as string;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2024-02-15-preview';
  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: options.system },
          { role: 'user', content: options.user }
        ] satisfies AzureOpenAiMessage[],
        temperature: options.temperature ?? 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}
