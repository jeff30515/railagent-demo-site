import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

import type { KnowledgeDocument } from './contracts.js';
import { deriveKnowledge } from './deriveKnowledge.js';
import { downloadSources } from './downloader.js';
import { writeSnapshot } from './storage.js';

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface RefreshTransportKnowledgeOptions {
  root: string;
  fetch: FetchLike;
  now: () => Date;
  tdxClientId?: string;
  tdxClientSecret?: string;
}

export async function refreshTransportKnowledge(options: RefreshTransportKnowledgeOptions): Promise<void> {
  const { catalog, files } = await downloadSources(options);
  const documentsByTopic = deriveKnowledge(files, catalog.entries);

  await writeSnapshot(options.root, catalog, [
    ...files,
    ...Object.entries(documentsByTopic).map(([topic, documents]) => ({
      relativePath: `transport-knowledge/${topic}-documents.jsonl`,
      contents: toJsonLines(documents),
    })),
  ]);
}

function toJsonLines(documents: KnowledgeDocument[]): string {
  return documents.length > 0 ? `${documents.map((document) => JSON.stringify(document)).join('\n')}\n` : '';
}

async function main(): Promise<void> {
  await refreshTransportKnowledge({
    root: process.env.TRANSPORT_DATA_ROOT
      ? resolve(process.env.TRANSPORT_DATA_ROOT)
      : resolve(process.cwd(), 'data'),
    fetch: globalThis.fetch,
    now: () => new Date(),
    tdxClientId: process.env.TDX_CLIENT_ID || undefined,
    tdxClientSecret: process.env.TDX_CLIENT_SECRET || undefined,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Transport knowledge refresh failed: ${message}`);
    process.exitCode = 1;
  });
}
