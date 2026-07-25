export interface CatalogEntry {
  id: string;
  title: string;
  sourceUrl: string;
  downloadedAt: string;
  format: 'json' | 'csv' | 'html' | 'text';
  relativePath?: string;
  status: 'downloaded' | 'blocked' | 'failed';
  error?: string;
}

export interface TransportCatalog {
  generatedAt: string;
  entries: CatalogEntry[];
}

export interface KnowledgeDocument {
  id: string;
  topic: 'station' | 'transfer' | 'accessibility' | 'timetable';
  text: string;
  sourceUrl: string;
  downloadedAt: string;
}

export interface SnapshotFile {
  relativePath: string;
  contents: string;
}
