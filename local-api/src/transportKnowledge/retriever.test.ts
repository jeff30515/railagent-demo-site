import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { retrieveTransportKnowledge } from './retriever.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('retrieveTransportKnowledge', () => {
  it('returns local sources for a matching Taipei accessibility document', async () => {
    const root = await createKnowledgeRoot({
      'accessibility-documents.jsonl': [
        JSON.stringify({
          id: 'taipei-main-accessibility',
          title: 'Taipei Main Station accessibility',
          text: 'Taipei Main Station \u81fa\u5317\u8eca\u7ad9 has elevators \u96fb\u68af, accessible restrooms \u7121\u969c\u7919\u5ec1\u6240, and barrier-free transfer routes.',
          sourceUrl: 'https://example.test/taipei-accessibility',
          downloadedAt: '2026-07-25T01:02:03.000Z'
        })
      ].join('\n')
    });

    const result = await retrieveTransportKnowledge('\u81fa\u5317\u8eca\u7ad9\u6709\u7121\u969c\u7919\u96fb\u68af\u55ce?', root);

    expect(result.knowledgeMode).toBe('local-sources');
    expect(result.documents).toHaveLength(1);
    expect(result.sources).toEqual([
      {
        title: 'Taipei Main Station accessibility',
        url: 'https://example.test/taipei-accessibility',
        downloadedAt: '2026-07-25T01:02:03.000Z'
      }
    ]);
  });

  it('falls back to model knowledge when no local document matches', async () => {
    const root = await createKnowledgeRoot({
      'accessibility-documents.jsonl': [
        JSON.stringify({
          id: 'taipei-main-accessibility',
          title: 'Taipei Main Station accessibility',
          text: 'Taipei Main Station has elevators and accessible restrooms.',
          sourceUrl: 'https://example.test/taipei-accessibility',
          downloadedAt: '2026-07-25T01:02:03.000Z'
        })
      ].join('\n')
    });

    const result = await retrieveTransportKnowledge('How do I report lost luggage in Kaohsiung?', root);

    expect(result).toEqual({
      knowledgeMode: 'model-knowledge',
      documents: [],
      sources: []
    });
  });

  it('does not treat generic CJK station character overlap as a local source match', async () => {
    const root = await createKnowledgeRoot({
      'accessibility-documents.jsonl': [
        JSON.stringify({
          id: 'taipei-main-accessibility',
          title: 'Taipei Main Station accessibility',
          text: 'Taipei Main Station \u81fa\u5317\u8eca\u7ad9 has elevators \u96fb\u68af, accessible restrooms \u7121\u969c\u7919\u5ec1\u6240, and barrier-free transfer routes.',
          sourceUrl: 'https://example.test/taipei-accessibility',
          downloadedAt: '2026-07-25T01:02:03.000Z'
        })
      ].join('\n')
    });

    const result = await retrieveTransportKnowledge('\u9ad8\u96c4\u8eca\u7ad9\u907a\u5931\u7269\u600e\u9ebc\u8fa6', root);

    expect(result).toEqual({
      knowledgeMode: 'model-knowledge',
      documents: [],
      sources: []
    });
  });

  it('ignores malformed JSONL lines without dropping valid documents', async () => {
    const root = await createKnowledgeRoot({
      'accessibility-documents.jsonl': [
        '{not valid json',
        JSON.stringify({
          id: 'taipei-main-accessibility',
          title: 'Taipei Main Station accessibility',
          text: 'Taipei Main Station has elevators and accessible restrooms.',
          sourceUrl: 'https://example.test/taipei-accessibility',
          downloadedAt: '2026-07-25T01:02:03.000Z'
        })
      ].join('\n')
    });

    const result = await retrieveTransportKnowledge('Taipei Main Station elevators', root);

    expect(result.knowledgeMode).toBe('local-sources');
    expect(result.documents).toHaveLength(1);
    expect(result.sources).toHaveLength(1);
  });

  it('returns at most five ranked documents', async () => {
    const root = await createKnowledgeRoot({
      'accessibility-documents.jsonl': Array.from({ length: 6 }, (_, index) => JSON.stringify({
        id: `doc-${index + 1}`,
        title: `Taipei accessibility ${index + 1}`,
        text: `Taipei accessibility elevators document ${index + 1}`,
        sourceUrl: `https://example.test/doc-${index + 1}`,
        downloadedAt: '2026-07-25T01:02:03.000Z'
      })).join('\n')
    });

    const result = await retrieveTransportKnowledge('Taipei accessibility elevators', root);

    expect(result.knowledgeMode).toBe('local-sources');
    expect(result.documents).toHaveLength(5);
    expect(result.sources).toHaveLength(5);
  });
});

async function createKnowledgeRoot(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'transport-knowledge-'));
  tempDirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, 'utf8');
  }
  return dir;
}
