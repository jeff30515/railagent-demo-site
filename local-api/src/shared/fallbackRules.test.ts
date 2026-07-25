import { describe, expect, it } from 'vitest';
import { dataGuideSources, officialDataGuideUrl } from './dataGuideMapping.js';
import { analyzeLogs, classifyServiceCase, matchLostItems } from './fallbackRules.js';
import type { LostItemRecord, NormalizedLogRecord } from './schemas.js';

describe('fallback rules', () => {
  it('flags repeated DOOR_FAIL events as high risk with red asset health', () => {
    const logs: NormalizedLogRecord[] = [
      makeLog('2026-05-01T08:00:00+08:00', 'DOOR_FAIL', 'error', 1),
      makeLog('2026-05-01T08:10:00+08:00', 'DOOR_FAIL', 'error', 1),
      makeLog('2026-05-01T08:20:00+08:00', 'DOOR_FAIL', 'error', 1),
      makeLog('2026-05-01T08:30:00+08:00', 'DOOR_FAIL', 'error', 1)
    ];

    const result = analyzeLogs(logs);

    expect(result.events[0]).toMatchObject({
      severity: 'high',
      eventCode: 'DOOR_FAIL',
      title: '車門故障門檻已達高風險',
      sourceDataset: 'new-taipei-ats-log'
    });
    expect(result.healthScores[0]).toMatchObject({
      assetId: 'NT-101:1:door',
      riskLevel: 'red'
    });
    expect(result.summary).toContain('DOOR_FAIL');
  });

  it('flags repeated DOOR_RETRY events as medium risk', () => {
    const logs = Array.from({ length: 8 }, (_, index) =>
      makeLog(`2026-05-01T09:${String(index).padStart(2, '0')}:00+08:00`, 'DOOR_RETRY', 'warning', 1)
    );

    const result = analyzeLogs(logs);

    expect(result.events[0]).toMatchObject({
      severity: 'medium',
      eventCode: 'DOOR_RETRY',
      title: '車門重試次數偏高'
    });
    expect(result.healthScores[0].riskLevel).toBe('amber');
  });

  it('flags air-conditioning temperature and power voltage telemetry anomalies', () => {
    const result = analyzeLogs([
      makeLog('2026-05-01T10:00:00+08:00', 'HVAC_TEMP', 'warning', 30, 'hvac'),
      makeLog('2026-05-01T10:03:00+08:00', 'POWER_VOLTAGE', 'warning', 520, 'traction-power')
    ]);

    expect(result.events.map((event) => event.eventCode)).toEqual(['HVAC_TEMP', 'POWER_VOLTAGE']);
    expect(result.events.map((event) => event.severity)).toEqual(['medium', 'high']);
    expect(result.recommendedActions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('空調'),
        expect.stringContaining('電壓')
      ])
    );
  });

  it('classifies a lost black backpack case and matches candidates', () => {
    const caseResult = classifyServiceCase('旅客表示在板橋站遺失黑色背包，內有筆記本，請協助找回。');
    const items: LostItemRecord[] = [
      {
        itemId: 'LF-001',
        foundTime: '2026-05-31T18:00:00+08:00',
        station: '板橋',
        itemType: '背包',
        color: '黑色',
        description: '黑色背包，內有筆記本',
        status: 'found',
        sourceDataset: 'ntmetro-lost-items'
      },
      {
        itemId: 'LF-002',
        foundTime: '2026-05-31T19:00:00+08:00',
        station: '新埔',
        itemType: '雨傘',
        color: '藍色',
        description: '藍色雨傘',
        status: 'found',
        sourceDataset: 'ntmetro-lost-items'
      }
    ];

    const matches = matchLostItems(caseResult, items);

    expect(caseResult).toMatchObject({
      category: 'lost_item',
      urgency: 'high',
      assignment: '車站客服與遺失物服務台',
      extractedItem: {
        itemType: '背包',
        color: '黑色',
        station: '板橋'
      }
    });
    expect(matches[0]).toMatchObject({
      itemId: 'LF-001',
      sourceDataset: 'ntmetro-lost-items'
    });
    expect(matches[0].similarity).toBeGreaterThanOrEqual(80);
  });
});

describe('official data guide mapping', () => {
  it('covers all first-priority official datasets with sample/live status metadata', () => {
    expect(officialDataGuideUrl).toBe('https://www.hackrail.tw/info/dataguide');
    expect(dataGuideSources.map((source) => source.datasetId)).toEqual(
      expect.arrayContaining([
        'new-taipei-ats-log',
        'tymetro-train-telemetry',
        'ntmetro-lost-items',
        'ntmetro-service-cases',
        'sop-chunks'
      ])
    );
    for (const source of dataGuideSources) {
      expect(source.mode).toBe('sample');
      expect(source.officialPriority).toBe('first');
      expect(source.officialReferenceUrl).toBe(officialDataGuideUrl);
      expect(source.fields.length).toBeGreaterThan(0);
      expect(source.agentUses.length).toBeGreaterThan(0);
    }
  });
});

function makeLog(
  timestamp: string,
  eventCode: string,
  status: NormalizedLogRecord['status'],
  value: number,
  deviceId = 'door'
): NormalizedLogRecord {
  return {
    timestamp,
    trainId: 'NT-101',
    carId: '1',
    deviceId,
    eventCode,
    status,
    value,
    unit: eventCode === 'HVAC_TEMP' ? 'celsius' : eventCode === 'POWER_VOLTAGE' ? 'volt' : 'count',
    sourceDataset: deviceId === 'door' ? 'new-taipei-ats-log' : 'tymetro-train-telemetry'
  };
}
