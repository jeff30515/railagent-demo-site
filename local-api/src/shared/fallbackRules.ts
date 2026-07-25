import type {
  AnalyzeLogsResult,
  AnomalyEvent,
  AssetHealthScore,
  ClassifiedServiceCase,
  ExtractedLostItem,
  LostItemMatch,
  LostItemRecord,
  NormalizedLogRecord,
  RiskLevel,
  Severity
} from './schemas.js';

const DOOR_FAIL_HIGH_THRESHOLD = 3;
const DOOR_RETRY_MEDIUM_THRESHOLD = 7;
const HVAC_TEMP_MEDIUM_THRESHOLD = 28;
const POWER_VOLTAGE_HIGH_THRESHOLD = 500;

export function analyzeLogs(logs: NormalizedLogRecord[]): AnalyzeLogsResult {
  const events: AnomalyEvent[] = [];
  const grouped = groupByAssetAndCode(logs);

  for (const [key, group] of grouped) {
    const { assetId, eventCode } = parseGroupKey(key);

    if (eventCode === 'DOOR_FAIL' && group.length >= DOOR_FAIL_HIGH_THRESHOLD) {
      events.push(
        createEvent(
          'high',
          assetId,
          eventCode,
          group,
          '車門故障門檻已達高風險',
          '檢查車門控制器、門機感測器與月台門連動紀錄，完成後由維修主管確認。'
        )
      );
    }

    if (eventCode === 'DOOR_RETRY' && group.length >= DOOR_RETRY_MEDIUM_THRESHOLD) {
      events.push(
        createEvent(
          'medium',
          assetId,
          eventCode,
          group,
          '車門重試次數偏高',
          '檢查門機滑軌與感測器回饋，安排回庫前巡檢。'
        )
      );
    }
  }

  for (const log of logs) {
    const assetId = makeAssetId(log);
    if (log.eventCode === 'HVAC_TEMP' && typeof log.value === 'number' && log.value > HVAC_TEMP_MEDIUM_THRESHOLD) {
      events.push(
        createEvent(
          'medium',
          assetId,
          log.eventCode,
          [log],
          '空調溫度高於舒適範圍',
          '檢查空調溫控與通風狀態，必要時調度備援車組。'
        )
      );
    }

    if (log.eventCode === 'POWER_VOLTAGE' && typeof log.value === 'number' && Math.abs(log.value) >= POWER_VOLTAGE_HIGH_THRESHOLD) {
      events.push(
        createEvent(
          'high',
          assetId,
          log.eventCode,
          [log],
          '牽引電力電壓異常',
          '檢查牽引供電電壓與逆變器紀錄，若持續異常則降載檢修。'
        )
      );
    }
  }

  const healthScores = buildHealthScores(logs, events);
  const recommendedActions = [...new Set(events.map((event) => event.recommendedAction))];

  return {
    aiMode: 'fallback',
    summary:
      events.length > 0
        ? `確定性備援找到 ${events.length} 個異常事件：${events.map((event) => event.eventCode).join(', ')}。`
        : '確定性備援未找到達到門檻的異常事件。',
    events,
    healthScores,
    recommendedActions
  };
}

export function classifyServiceCase(description: string): ClassifiedServiceCase {
  const normalized = description.toLowerCase();
  const evidence: string[] = [];

  if (containsAny(normalized, ['遺失', '遺落', '掉了', '拾獲', 'lost', 'missing', '背包', '包包', 'backpack', 'bag'])) {
    const extractedItem = extractLostItem(description);
    evidence.push('偵測到遺失物相關字詞。');
    if (extractedItem.color === '黑色') {
      evidence.push('偵測到黑色物品描述。');
    }
    if (extractedItem.itemType === '背包') {
      evidence.push('偵測到背包類型。');
    }
    if (extractedItem.station) {
      evidence.push(`車站線索符合${extractedItem.station}。`);
    }

    return {
      aiMode: 'fallback',
      category: 'lost_item',
      urgency: extractedItem.itemType === '背包' && extractedItem.color === '黑色' ? 'high' : 'medium',
      assignment: '車站客服與遺失物服務台',
      draftReply:
        '您好，已收到您的遺失物協尋需求。我們會依照您提供的車站、物品與顏色資訊進行比對，候選結果仍需由站務人員確認後再回覆。',
      extractedItem,
      sourceDataset: 'ntmetro-service-cases',
      evidence
    };
  }

  return {
    aiMode: 'fallback',
    category: 'general',
    urgency: 'low',
    assignment: '客服初步分流',
    draftReply: '您好，已收到您的服務案件，將由客服人員確認內容後回覆。',
    sourceDataset: 'ntmetro-service-cases',
    evidence: ['未偵測到特定高風險或遺失物線索，先列入一般服務案件。']
  };
}

export function matchLostItems(caseResult: ClassifiedServiceCase, items: LostItemRecord[]): LostItemMatch[] {
  const extracted = caseResult.extractedItem;
  if (!extracted) {
    return [];
  }

  return items
    .filter((item) => item.status === 'found')
    .map((item) => scoreLostItem(item, extracted))
    .filter((match) => match.similarity > 0)
    .sort((left, right) => right.similarity - left.similarity);
}

function groupByAssetAndCode(logs: NormalizedLogRecord[]): Map<string, NormalizedLogRecord[]> {
  const groups = new Map<string, NormalizedLogRecord[]>();
  for (const log of logs) {
    const key = `${makeAssetId(log)}|${log.eventCode}`;
    groups.set(key, [...(groups.get(key) ?? []), log]);
  }
  return groups;
}

function parseGroupKey(key: string): { assetId: string; eventCode: string } {
  const [assetId, eventCode] = key.split('|');
  return { assetId, eventCode };
}

function makeAssetId(log: NormalizedLogRecord): string {
  return [log.trainId, log.carId, log.deviceId].filter(Boolean).join(':');
}

function createEvent(
  severity: Severity,
  assetId: string,
  eventCode: string,
  logs: NormalizedLogRecord[],
  title: string,
  recommendedAction: string
): AnomalyEvent {
  const firstLog = logs[0];
  return {
    eventId: `${assetId}:${eventCode}:${firstLog.timestamp}`,
    eventCode,
    severity,
    title,
    description: `${eventCode} 符合備援規則門檻，並有 ${logs.length} 筆佐證紀錄。`,
    assetId,
    sourceDataset: firstLog.sourceDataset,
    evidence: logs.map((log) => ({
      timestamp: log.timestamp,
      trainId: log.trainId,
      carId: log.carId,
      deviceId: log.deviceId,
      value: log.value,
      unit: log.unit,
      sourceDataset: log.sourceDataset
    })),
    recommendedAction
  };
}

function buildHealthScores(logs: NormalizedLogRecord[], events: AnomalyEvent[]): AssetHealthScore[] {
  const assetIds = [...new Set(logs.map(makeAssetId))];
  return assetIds.map((assetId) => {
    const assetLogs = logs.filter((log) => makeAssetId(log) === assetId);
    const assetEvents = events.filter((event) => event.assetId === assetId);
    const highCount = assetEvents.filter((event) => event.severity === 'high').length;
    const mediumCount = assetEvents.filter((event) => event.severity === 'medium').length;
    const score = clamp(100 - highCount * 20 - mediumCount * 10 - Math.max(0, assetLogs.length - 1) * 2, 0, 100);
    const riskLevel = toRiskLevel(score, highCount, mediumCount);
    const first = assetLogs[0];

    return {
      assetId,
      trainId: first.trainId,
      carId: first.carId,
      deviceId: first.deviceId,
      score,
      riskLevel,
      reasonCodes: assetEvents.map((event) => event.eventCode),
      sourceDatasets: [...new Set(assetLogs.map((log) => log.sourceDataset))]
    };
  });
}

function toRiskLevel(score: number, highCount: number, mediumCount: number): RiskLevel {
  if (highCount > 0 || score < 60) {
    return 'red';
  }
  if (mediumCount > 0 || score < 80) {
    return 'amber';
  }
  return 'green';
}

function extractLostItem(description: string): ExtractedLostItem {
  const normalized = description.toLowerCase();
  const keywords: string[] = [];
  const itemType = toItemType(normalized);
  const color = toColor(normalized);
  const station = toStation(normalized);

  if (itemType) keywords.push(itemType);
  if (color) keywords.push(color);
  if (station) keywords.push(station);

  return { itemType, color, station, keywords };
}

function toItemType(value: string): string | undefined {
  if (containsAny(value, ['背包', '包包', 'backpack', 'bag'])) return '背包';
  if (containsAny(value, ['雨傘', 'umbrella'])) return '雨傘';
  return undefined;
}

function toColor(value: string): string | undefined {
  if (containsAny(value, ['黑色', 'black', 'black-colored'])) return '黑色';
  if (containsAny(value, ['藍色', 'blue'])) return '藍色';
  return undefined;
}

function toStation(value: string): string | undefined {
  const aliases: Array<{ label: string; terms: string[] }> = [
    { label: '板橋', terms: ['板橋', 'banqiao'] },
    { label: '新埔', terms: ['新埔', 'xinpu'] },
    { label: '台北車站', terms: ['台北車站', 'taipei main'] }
  ];
  return aliases.find((alias) => alias.terms.some((term) => value.includes(term)))?.label;
}

function scoreLostItem(item: LostItemRecord, extracted: ExtractedLostItem): LostItemMatch {
  const matchedSignals: string[] = [];
  let score = 0;

  if (extracted.itemType && sameText(item.itemType, extracted.itemType)) {
    score += 40;
    matchedSignals.push('itemType');
  }
  if (extracted.color && sameText(item.color, extracted.color)) {
    score += 25;
    matchedSignals.push('color');
  }
  if (extracted.station && sameText(item.station, extracted.station)) {
    score += 25;
    matchedSignals.push('station');
  }
  for (const keyword of extracted.keywords) {
    if (normalizeMatchValue(item.description).includes(normalizeMatchValue(keyword)) && !matchedSignals.includes(`keyword:${keyword}`)) {
      score += 5;
      matchedSignals.push(`keyword:${keyword}`);
    }
  }

  return {
    ...item,
    similarity: clamp(score, 0, 100),
    matchedSignals
  };
}

function sameText(left: string | undefined, right: string): boolean {
  return normalizeMatchValue(left) === normalizeMatchValue(right);
}

function normalizeMatchValue(value: string | undefined): string {
  const normalized = value?.toLowerCase().replace(/\s+/g, '').replace(/station/g, '').replace(/站/g, '');
  if (!normalized) return '';
  const aliases: Record<string, string> = {
    backpack: '背包',
    bag: '背包',
    black: '黑色',
    'black-colored': '黑色',
    banqiao: '板橋',
    xinpu: '新埔',
    umbrella: '雨傘',
    blue: '藍色'
  };
  return aliases[normalized] ?? normalized;
}

function containsAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term.toLowerCase()));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
