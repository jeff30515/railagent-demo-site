import type { CatalogEntry, SnapshotFile, TransportCatalog } from './contracts.js';

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface DownloadOptions {
  fetch: FetchLike;
  now: () => Date;
  tdxClientId?: string;
  tdxClientSecret?: string;
}

interface SourceDefinition {
  id: string;
  title: string;
  sourceUrl: string;
  provider: string;
  format: CatalogEntry['format'];
}

const tdxTokenUrl = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const tdxTokenRequestFailed = 'TDX OAuth request failed';

const publicSources: SourceDefinition[] = [
  {
    id: 'taipei-metro-od-stations',
    title: 'Taipei Open Data metro station facilities',
    sourceUrl: 'https://data.taipei/api/v1/dataset/metro-station-facilities?scope=resourceAquire',
    provider: 'taipei-metro',
    format: 'json',
  },
  {
    id: 'tra-official-accessibility',
    title: 'TRA official station accessibility services',
    sourceUrl: 'https://www.railway.gov.tw/tra-tip-web/tip/tip00H/tipH41/view',
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

const tdxSources: SourceDefinition[] = [
  {
    id: 'tdx-tra-stations',
    title: 'TDX TRA stations',
    sourceUrl: 'https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/Station',
    provider: 'tdx-tra',
    format: 'json',
  },
  {
    id: 'tdx-tra-timetables',
    title: 'TDX TRA station timetables',
    sourceUrl: 'https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/DailyTimetable/Today',
    provider: 'tdx-tra',
    format: 'json',
  },
  {
    id: 'tdx-thsr-stations',
    title: 'TDX THSR stations',
    sourceUrl: 'https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/Station',
    provider: 'tdx-thsr',
    format: 'json',
  },
  {
    id: 'tdx-thsr-timetables',
    title: 'TDX THSR station timetables',
    sourceUrl: 'https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/Today',
    provider: 'tdx-thsr',
    format: 'json',
  },
  {
    id: 'tdx-trtc-stations',
    title: 'TDX TRTC stations',
    sourceUrl: 'https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/Station/TRTC',
    provider: 'tdx-trtc',
    format: 'json',
  },
  {
    id: 'tdx-trtc-lines-transfers',
    title: 'TDX TRTC lines and transfers',
    sourceUrl: 'https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LineTransfer/TRTC',
    provider: 'tdx-trtc',
    format: 'json',
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

  if (!options.tdxClientId || !options.tdxClientSecret) {
    for (const source of tdxSources) {
      catalog.entries.push(blockedEntry(source, downloadedAt, 'Missing TDX credentials'));
    }
    return { catalog, files };
  }

  const tokenResult = await requestTdxToken(options.fetch, options.tdxClientId, options.tdxClientSecret);
  if (!tokenResult.ok) {
    for (const source of tdxSources) {
      catalog.entries.push(failedEntry(source, downloadedAt, tokenResult.error));
    }
    return { catalog, files };
  }

  for (const source of tdxSources) {
    await downloadOne(options.fetch, source, downloadedAt, files, catalog.entries, {
      Authorization: `Bearer ${tokenResult.token}`,
    });
  }

  return { catalog, files };
}

async function requestTdxToken(
  fetch: FetchLike,
  clientId: string,
  clientSecret: string
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    const response = await fetch(tdxTokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: httpError(response) };
    }

    const body = (await response.json()) as { access_token?: unknown };
    if (typeof body.access_token !== 'string' || body.access_token.length === 0) {
      return { ok: false, error: 'TDX OAuth response missing access_token' };
    }

    return { ok: true, token: body.access_token };
  } catch {
    return { ok: false, error: tdxTokenRequestFailed };
  }
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

function blockedEntry(source: SourceDefinition, downloadedAt: string, error: string): CatalogEntry {
  return {
    id: source.id,
    title: source.title,
    sourceUrl: source.sourceUrl,
    downloadedAt,
    format: source.format,
    status: 'blocked',
    error,
  };
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
