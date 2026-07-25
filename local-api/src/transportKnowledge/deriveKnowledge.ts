import type { CatalogEntry, KnowledgeDocument, SnapshotFile } from './contracts.js';

type KnowledgeTopic = KnowledgeDocument['topic'];

const timetableNotice =
  '\u{9788}\u{F2EA}\u{3F}\u{6579}\u{600E}\u{F171}\u{5697}\u{F5FA}\u{7955}\u{3F}' +
  '\u{EB8F}\u{E3F9}\u{7508}\u{221F}\u{3F}\u{969E}\u{4E99}\u{3F}\u{3F}\u{5B75}' +
  '\u{F665}\u{3F}\u{EFDB}\u{3F}\u{95AE}\u{F4C2}\u{EFAD}\u{769E}\u{E87A}\u{80}\u{EF75}';

export function deriveKnowledge(
  files: readonly SnapshotFile[],
  entries: readonly CatalogEntry[]
): Record<KnowledgeTopic, KnowledgeDocument[]> {
  const documents: Record<KnowledgeTopic, KnowledgeDocument[]> = {
    station: [],
    transfer: [],
    accessibility: [],
    timetable: [],
  };
  const filesByPath = new Map(files.map((file) => [file.relativePath, file]));

  for (const entry of entries) {
    if (entry.status !== 'downloaded' || !entry.relativePath) {
      continue;
    }

    const file = filesByPath.get(entry.relativePath);
    if (!file) {
      continue;
    }

    const topic = topicFor(entry);
    if (!topic) {
      continue;
    }

    const texts = textsFor(topic, entry, file.contents);
    for (const [index, text] of texts.entries()) {
      documents[topic].push({
        id: `${topic}:${entry.id}:${index + 1}`,
        topic,
        text,
        sourceUrl: entry.sourceUrl,
        downloadedAt: entry.downloadedAt,
      });
    }
  }

  return documents;
}

function topicFor(entry: CatalogEntry): KnowledgeTopic | undefined {
  const metadata = `${entry.id} ${entry.title} ${entry.relativePath ?? ''} ${entry.sourceUrl}`.toLowerCase();

  if (metadata.includes('timetable')) {
    return 'timetable';
  }

  if (metadata.includes('transfer')) {
    return 'transfer';
  }

  if (
    metadata.includes('accessibility') ||
    metadata.includes('facilities') ||
    metadata.includes('facility') ||
    metadata.includes('passenger services') ||
    metadata.includes('lost property')
  ) {
    return 'accessibility';
  }

  if (metadata.includes('station')) {
    return 'station';
  }

  return undefined;
}

function textsFor(topic: KnowledgeTopic, entry: CatalogEntry, contents: string): string[] {
  if (entry.format === 'html' || entry.format === 'text') {
    return pageTextsFor(topic, entry, contents);
  }

  if (entry.format !== 'json') {
    return [];
  }

  const parsed = parseJson(contents);
  if (!parsed) {
    return [];
  }

  if (topic === 'station') {
    return collectionFrom(parsed).map((item) => stationText(item)).filter(isPresent);
  }

  if (topic === 'transfer') {
    return collectionFrom(parsed).map((item) => transferText(item)).filter(isPresent);
  }

  if (topic === 'accessibility') {
    return collectionFrom(parsed).map((item) => facilityText(item)).filter(isPresent);
  }

  return collectionFrom(parsed)
    .map((item) => timetableText(item))
    .filter(isPresent)
    .map((text) => `${text}\n${timetableNotice}`);
}

function pageTextsFor(topic: KnowledgeTopic, entry: CatalogEntry, contents: string): string[] {
  if (!isAllowlistedOfficialPage(entry)) {
    return [];
  }

  const text = normalizeWhitespace(stripHtml(contents));
  if (!text) {
    return [];
  }

  const heading =
    topic === 'transfer'
      ? '\u{8F49}\u{4E58}\u{5B98}\u{65B9}\u{9801}\u{9762}'
      : '\u{670D}\u{52D9}\u{8207}\u{7121}\u{969C}\u{7919}\u{5B98}\u{65B9}\u{9801}\u{9762}';
  return [`${heading}\u{FF1A}${entry.title}\u{3002}${text}`];
}

function isAllowlistedOfficialPage(entry: CatalogEntry): boolean {
  const metadata = `${entry.id} ${entry.title} ${entry.sourceUrl}`.toLowerCase();
  return (
    (entry.format === 'html' || entry.format === 'text') &&
    (metadata.includes('official') ||
      metadata.includes('railway.gov.tw') ||
      metadata.includes('thsrc.com.tw') ||
      metadata.includes('metro.taipei')) &&
    (metadata.includes('station') ||
      metadata.includes('transfer') ||
      metadata.includes('accessibility') ||
      metadata.includes('passenger service') ||
      metadata.includes('lost property'))
  );
}

function stationText(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const name = firstText(record.StationName, record.StationNameZh, record.Name, record.name);
  if (!name) {
    return undefined;
  }

  const details = compact([
    labelled('\u{8ECA}\u{7AD9}\u{4EE3}\u{78BC}', firstText(record.StationID, record.StationCode, record.id)),
    labelled('\u{8ECA}\u{7AD9}\u{540D}\u{7A31}', name),
    labelled('\u{5730}\u{5740}', firstText(record.StationAddress, record.Address)),
    labelled('\u{8DEF}\u{7DDA}', firstText(record.LineName, record.LineID)),
    labelled('\u{71DF}\u{904B}\u{696D}\u{8005}', firstText(record.OperatorName, record.OperatorID)),
  ]);

  return `\u{8ECA}\u{7AD9}\u{8CC7}\u{8A0A}\u{FF1A}${details.join('\u{FF1B}')}\u{3002}`;
}

function transferText(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const station = firstText(record.StationName, record.TransferStationName, record.StationID);
  const fromLine = firstText(record.FromLineName, record.FromLineID, record.LineName, record.LineID);
  const toLine = firstText(record.ToLineName, record.ToLineID, record.TransferLineName, record.TransferLineID);
  const details = compact([
    labelled('\u{8ECA}\u{7AD9}', station),
    labelled('\u{8DEF}\u{7DDA}', fromLine),
    labelled('\u{8F49}\u{4E58}\u{8DEF}\u{7DDA}', toLine),
    labelled('\u{8F49}\u{4E58}\u{8AAA}\u{660E}', firstText(record.TransferDescription, record.Description, record.Remark)),
  ]);

  return details.length > 0
    ? `\u{8F49}\u{4E58}\u{8CC7}\u{8A0A}\u{FF1A}${details.join('\u{FF1B}')}\u{3002}`
    : undefined;
}

function facilityText(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const station = firstText(record.StationName, record.stationName, record.StationID, record.stationId);
  const facility = firstText(record.FacilityName, record.facilityName, record.Name, record.name, record.Category);
  const details = compact([
    labelled('\u{8ECA}\u{7AD9}', station),
    labelled('\u{8A2D}\u{65BD}', facility),
    labelled('\u{4F4D}\u{7F6E}', firstText(record.Location, record.location, record.Place)),
    labelled('\u{670D}\u{52D9}', firstText(record.Service, record.service, record.Description, record.description)),
  ]);

  return details.length > 0
    ? `\u{8A2D}\u{65BD}\u{8207}\u{670D}\u{52D9}\u{8CC7}\u{8A0A}\u{FF1A}${details.join('\u{FF1B}')}\u{3002}`
    : undefined;
}

function timetableText(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const stopTimes = Array.isArray(record.StopTimes) ? record.StopTimes.map(asRecord).filter(isPresent) : [];
  const firstStop = stopTimes[0];
  const lastStop = stopTimes.at(-1);
  const details = compact([
    labelled('\u{8CC7}\u{6599}\u{5FEB}\u{7167}', '\u{6642}\u{523B}\u{8868}'),
    labelled('\u{65E5}\u{671F}', firstText(record.TrainDate, record.ServiceDay, record.UpdateTime)),
    labelled('\u{8ECA}\u{6B21}', firstText(record.TrainNo, record.TrainNumber)),
    labelled('\u{8D77}\u{7AD9}', firstText(firstStop?.StationName, firstStop?.StationID)),
    labelled('\u{8D77}\u{7AD9}\u{6642}\u{9593}', firstText(firstStop?.DepartureTime, firstStop?.ArrivalTime)),
    labelled('\u{8FC4}\u{7AD9}', firstText(lastStop?.StationName, lastStop?.StationID)),
    labelled('\u{8FC4}\u{7AD9}\u{6642}\u{9593}', firstText(lastStop?.ArrivalTime, lastStop?.DepartureTime)),
    labelled('\u{71DF}\u{904B}\u{671F}\u{9593}', firstText(record.ServicePeriod, record.Period, record.ValidPeriod)),
  ]);

  return details.length > 1
    ? `\u{6642}\u{523B}\u{8868}\u{5FEB}\u{7167}\u{FF1A}${details.join('\u{FF1B}')}\u{3002}`
    : undefined;
}

function collectionFrom(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }

  const nestedItems = Object.values(record).flatMap((candidate) => (Array.isArray(candidate) ? candidate : []));
  if (nestedItems.length > 0) {
    return nestedItems;
  }

  return [record];
}

function parseJson(contents: string): unknown | undefined {
  try {
    return JSON.parse(contents);
  } catch {
    return undefined;
  }
}

function stripHtml(contents: string): string {
  return contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = textFrom(value);
    if (text) {
      return text;
    }
  }

  return undefined;
}

function textFrom(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = normalizeWhitespace(String(value));
    return text.length > 0 ? text : undefined;
  }

  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return firstText(record.Zh_tw, record.ZhTw, record.Zh, record.En, record.Name, record.name);
}

function labelled(label: string, value: string | undefined): string | undefined {
  return value ? `${label}${value}` : undefined;
}

function compact(values: Array<string | undefined>): string[] {
  return values.filter(isPresent);
}

function isPresent<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
