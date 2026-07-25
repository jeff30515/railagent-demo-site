import { describe, expect, it } from 'vitest';

import { deriveKnowledge } from './deriveKnowledge.js';
import type { CatalogEntry, SnapshotFile } from './contracts.js';

describe('transport knowledge derivation', () => {
  it('derives station documents from downloaded TRA station snapshots with source traceability', () => {
    const downloadedAt = '2026-07-25T14:00:00.000Z';
    const sourceUrl = 'https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/Station';
    const files: SnapshotFile[] = [
      {
        relativePath: 'transport-raw/tdx/tra-stations.json',
        contents: JSON.stringify([
          {
            StationID: '1000',
            StationName: { Zh_tw: '?箏?' },
            StationAddress: '?箏?撣?',
          },
        ]),
      },
    ];
    const entries: CatalogEntry[] = [
      {
        id: 'tdx-tra-stations',
        title: 'TRA stations',
        sourceUrl,
        downloadedAt,
        format: 'json',
        relativePath: 'transport-raw/tdx/tra-stations.json',
        status: 'downloaded',
      },
    ];

    const documents = deriveKnowledge(files, entries);

    expect(documents.station).toEqual([
      expect.objectContaining({
        topic: 'station',
        sourceUrl,
        downloadedAt,
      }),
    ]);
    expect(documents.station[0]?.text).toContain('?箏?');
  });

  it('derives line and transfer text from combined TRTC line transfer snapshots', () => {
    const documents = deriveKnowledge(
      [
        {
          relativePath: 'transport-raw/tdx/tdx-trtc-lines-transfers.json',
          contents: JSON.stringify({
            Lines: [{ LineID: 'R', LineName: { Zh_tw: '淡水信義線' } }],
            Transfers: [
              {
                StationName: { Zh_tw: '台北車站' },
                FromLineName: { Zh_tw: '淡水信義線' },
                ToLineName: { Zh_tw: '板南線' },
              },
            ],
          }),
        },
      ],
      [
        {
          id: 'tdx-trtc-lines-transfers',
          title: 'TDX TRTC lines and transfers',
          sourceUrl: 'https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LineTransfer/TRTC',
          downloadedAt: '2026-07-25T15:00:00.000Z',
          format: 'json',
          relativePath: 'transport-raw/tdx/tdx-trtc-lines-transfers.json',
          status: 'downloaded',
        },
      ],
    );

    expect(documents.transfer.map((document) => document.text).join('\n')).toContain('淡水信義線');
    expect(documents.transfer.map((document) => document.text).join('\n')).toContain('台北車站');
  });

  it('marks timetable documents as snapshots and keeps official realtime guidance', () => {
    const documents = deriveKnowledge(
      [
        {
          relativePath: 'transport-raw/tdx/tdx-tra-timetables.json',
          contents: JSON.stringify({
            DailyTimetables: [
              {
                TrainDate: '2026-07-25',
                TrainNo: '1234',
                ServicePeriod: '每日',
                StopTimes: [
                  { StationName: { Zh_tw: '臺北' }, DepartureTime: '09:00' },
                  { StationName: { Zh_tw: '新竹' }, ArrivalTime: '10:10' },
                ],
              },
            ],
          }),
        },
      ],
      [
        {
          id: 'tdx-tra-timetables',
          title: 'TDX TRA station timetables',
          sourceUrl: 'https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/DailyTimetable/Today',
          downloadedAt: '2026-07-25T15:05:00.000Z',
          format: 'json',
          relativePath: 'transport-raw/tdx/tdx-tra-timetables.json',
          status: 'downloaded',
        },
      ],
    );

    expect(documents.timetable[0]?.text).toContain('時刻表快照');
    expect(documents.timetable[0]?.text).toContain('每日');
    expect(documents.timetable[0]?.text).toMatch(/鞈\?敹怎嚗祕\?甈∟\?隞亙\?\?孵\?\?閮皞$/);
  });

  it('preserves only allowlisted official page text and skips blocked failed or unparseable sources', () => {
    const documents = deriveKnowledge(
      [
        {
          relativePath: 'transport-raw/tra/tra-official-accessibility.html',
          contents: '<html><body><h1>無障礙服務</h1><p>電梯與服務鈴資訊</p></body></html>',
        },
        {
          relativePath: 'transport-raw/unknown/promotional.html',
          contents: '<html><body>unrelated campaign text</body></html>',
        },
        {
          relativePath: 'transport-raw/tdx/bad.json',
          contents: '{bad json',
        },
      ],
      [
        {
          id: 'tra-official-accessibility',
          title: 'TRA official station accessibility services',
          sourceUrl: 'https://www.railway.gov.tw/tra-tip-web/tip/tip00H/tipH41/view',
          downloadedAt: '2026-07-25T16:00:00.000Z',
          format: 'html',
          relativePath: 'transport-raw/tra/tra-official-accessibility.html',
          status: 'downloaded',
        },
        {
          id: 'unknown-page',
          title: 'Promotional page',
          sourceUrl: 'https://example.test/promotional',
          downloadedAt: '2026-07-25T16:00:00.000Z',
          format: 'html',
          relativePath: 'transport-raw/unknown/promotional.html',
          status: 'downloaded',
        },
        {
          id: 'tdx-bad-stations',
          title: 'TDX bad stations',
          sourceUrl: 'https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/Station',
          downloadedAt: '2026-07-25T16:00:00.000Z',
          format: 'json',
          relativePath: 'transport-raw/tdx/bad.json',
          status: 'downloaded',
        },
        {
          id: 'tdx-tra-stations',
          title: 'TDX TRA stations',
          sourceUrl: 'https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/Station',
          downloadedAt: '2026-07-25T16:00:00.000Z',
          format: 'json',
          status: 'blocked',
          error: 'Missing TDX credentials',
        },
        {
          id: 'tdx-thsr-stations',
          title: 'TDX THSR stations',
          sourceUrl: 'https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/Station',
          downloadedAt: '2026-07-25T16:00:00.000Z',
          format: 'json',
          status: 'failed',
          error: 'HTTP 503 Service Unavailable',
        },
      ],
    );

    expect(documents.accessibility).toHaveLength(1);
    expect(documents.accessibility[0]?.text).toContain('無障礙服務');
    expect(JSON.stringify(documents)).not.toContain('unrelated campaign text');
    expect(documents.station).toEqual([]);
  });
});
