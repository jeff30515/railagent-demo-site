import type { CatalogEntry, SnapshotFile, TransportCatalog } from './contracts.js';

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface DownloadOptions {
  fetch: FetchLike;
  now: () => Date;
}

interface SourceDefinition {
  id: string;
  title: string;
  sourceUrl: string;
  provider: string;
  format: CatalogEntry['format'];
}

const publicSources: SourceDefinition[] = [
  {
    id: 'taipei-metro-od-stations',
    title: 'Taipei Open Data metro monthly OD manifest',
    sourceUrl:
      'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=eb481f58-1238-4cff-8caa-fa7bb20cb4f4',
    provider: 'taipei-metro',
    format: 'csv',
  },
  {
    id: 'tra-official-accessibility',
    title: 'TRA official station accessibility services',
    sourceUrl:
      'https://www.railway.gov.tw/tra-tip-web/tip/tip00C/tipC21/view?subCode=8ae4cac38c017e9f018c243d8ce93354',
    provider: 'tra',
    format: 'html',
  },
  {
    id: 'thsr-official-station-services',
    title: 'THSR official station passenger services',
    sourceUrl: 'https://www.thsrc.com.tw/ArticleContent/2f940836-cedc-41ef-8e28-c2336ac8fe68',
    provider: 'thsr',
    format: 'html',
  },
  {
    id: 'trtc-official-lost-property',
    title: 'Taipei Metro official lost property service',
    sourceUrl: 'https://english.metro.taipei/cp.aspx?n=1BE0AF76C79F9A38',
    provider: 'trtc',
    format: 'html',
  },
];

export async function downloadSources(options: DownloadOptions): Promise<{
  catalog: TransportCatalog;
  files: SnapshotFile[];
}> {
  const downloadedAt = options.now().toISOString();
  const catalog: TransportCatalog = {
    generatedAt: downloadedAt,
    entries: [],
  };
  const files: SnapshotFile[] = [];

  for (const source of publicSources) {
    await downloadOne(options.fetch, source, downloadedAt, files, catalog.entries);
  }

  return { catalog, files };
}

async function downloadOne(
  fetch: FetchLike,
  source: SourceDefinition,
  downloadedAt: string,
  files: SnapshotFile[],
  entries: CatalogEntry[],
  headers?: Record<string, string>
): Promise<void> {
  try {
    const response = await fetch(source.sourceUrl, headers ? { headers } : undefined);
    if (!response.ok) {
      entries.push(failedEntry(source, downloadedAt, httpError(response)));
      return;
    }

    const contents = await response.text();
    const relativePath = relativePathFor(source);
    files.push({ relativePath, contents });
    entries.push({
      id: source.id,
      title: source.title,
      sourceUrl: source.sourceUrl,
      downloadedAt,
      format: source.format,
      relativePath,
      status: 'downloaded',
    });
  } catch (error) {
    entries.push(failedEntry(source, downloadedAt, errorMessage(error)));
  }
}

function failedEntry(source: SourceDefinition, downloadedAt: string, error: string): CatalogEntry {
  return {
    id: source.id,
    title: source.title,
    sourceUrl: source.sourceUrl,
    downloadedAt,
    format: source.format,
    status: 'failed',
    error,
  };
}

function relativePathFor(source: SourceDefinition): string {
  return `transport-raw/${source.provider}/${source.id}.${source.format}`;
}

function httpError(response: Response): string {
  const statusText = response.statusText ? ` ${response.statusText}` : '';
  return `HTTP ${response.status}${statusText}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
