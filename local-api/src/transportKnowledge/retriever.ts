import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type KnowledgeMode = 'local-sources' | 'model-knowledge';

export interface TransportKnowledgeDocument {
  id?: string;
  title: string;
  text: string;
  sourceUrl: string;
  downloadedAt: string;
}

export interface TransportKnowledgeSource {
  title: string;
  url: string;
  downloadedAt: string;
}

export interface TransportKnowledgeResult {
  knowledgeMode: KnowledgeMode;
  documents: TransportKnowledgeDocument[];
  sources: TransportKnowledgeSource[];
}

interface RankedDocument {
  document: TransportKnowledgeDocument;
  score: number;
}

const MAX_DOCUMENTS = 5;
const MIN_TOKEN_OVERLAP = 2;

export async function retrieveTransportKnowledge(
  question: string,
  root: string
): Promise<TransportKnowledgeResult> {
  const queryTokens = tokenize(question);
  if (queryTokens.size === 0) return emptyResult();

  const documents = await loadDocuments(root);
  const ranked = documents
    .map((document) => ({ document, score: scoreDocument(document, queryTokens) }))
    .filter((entry) => entry.score >= MIN_TOKEN_OVERLAP)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_DOCUMENTS);

  if (ranked.length === 0) return emptyResult();

  const selectedDocuments = ranked.map((entry) => entry.document);
  return {
    knowledgeMode: 'local-sources',
    documents: selectedDocuments,
    sources: selectedDocuments.map((document) => ({
      title: document.title,
      url: document.sourceUrl,
      downloadedAt: document.downloadedAt
    }))
  };
}

async function loadDocuments(root: string): Promise<TransportKnowledgeDocument[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
      .map((entry) => join(root, entry.name));
    const loaded = await Promise.all(files.map((file) => loadJsonlFile(file)));
    return loaded.flat();
  } catch {
    return [];
  }
}

async function loadJsonlFile(path: string): Promise<TransportKnowledgeDocument[]> {
  try {
    const content = await readFile(path, 'utf8');
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap(parseDocument);
  } catch {
    return [];
  }
}

function parseDocument(line: string): TransportKnowledgeDocument[] {
  try {
    const value = JSON.parse(line) as Record<string, unknown>;
    const title = stringField(value.title);
    const text = stringField(value.text) ?? stringField(value.content);
    const sourceUrl = stringField(value.sourceUrl) ?? stringField(value.url);
    const downloadedAt = stringField(value.downloadedAt);
    if (!title || !text || !sourceUrl || !downloadedAt) return [];
    return [{
      id: stringField(value.id),
      title,
      text,
      sourceUrl,
      downloadedAt
    }];
  } catch {
    return [];
  }
}

function scoreDocument(document: TransportKnowledgeDocument, queryTokens: Set<string>): number {
  const documentTokens = tokenize(`${document.title} ${document.text}`);
  let score = 0;
  for (const token of queryTokens) {
    if (documentTokens.has(token)) score += 1;
  }
  return score;
}

function tokenize(value: string): Set<string> {
  const normalized = value.toLocaleLowerCase().normalize('NFKC').replaceAll('台', '臺');
  const tokens = [
    ...cjkBigrams(normalized),
    ...(normalized.match(/[\p{Letter}\p{Number}]{2,}/gu) ?? [])
  ];
  return new Set(tokens);
}

function cjkBigrams(value: string): string[] {
  const segments = value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) ?? [];
  return segments.flatMap((segment) => {
    const chars = Array.from(segment);
    if (chars.length < 2) return [];
    return chars.slice(0, -1).map((char, index) => `${char}${chars[index + 1]}`);
  });
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function emptyResult(): TransportKnowledgeResult {
  return {
    knowledgeMode: 'model-knowledge',
    documents: [],
    sources: []
  };
}
