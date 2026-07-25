import type { LostFoundSearchInput } from './contracts.js';

const fields = ['itemType', 'color', 'brand', 'features', 'lostDate', 'stationName', 'trainNumber'] as const;

const limits: Record<(typeof fields)[number], number> = {
  itemType: 80,
  color: 40,
  brand: 80,
  features: 500,
  lostDate: 10,
  stationName: 80,
  trainNumber: 20
};

export class InvalidLostFoundRequest extends Error {}

export function normalizeLostFoundRequest(value: unknown): LostFoundSearchInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidLostFoundRequest('隢?靘憭梁??甈???');
  }

  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !fields.includes(key as (typeof fields)[number]))) {
    throw new InvalidLostFoundRequest('隢??銝?渡?甈???');
  }

  const result = Object.fromEntries(fields.map((field) => {
    const raw = body[field] ?? '';
    if (typeof raw !== 'string') {
      throw new InvalidLostFoundRequest(`${field} 敹??舀?摮`);
    }
    const text = raw.trim();
    if (text.length > limits[field]) {
      throw new InvalidLostFoundRequest(`${field} 頞??瑕漲??`);
    }
    return [field, text];
  })) as unknown as LostFoundSearchInput;

  if (!result.itemType && !result.features) {
    throw new InvalidLostFoundRequest('?拙?蝔桅???閫?孵噩?喳?憛怠神銝??');
  }

  if (result.lostDate) {
    const parsed = new Date(`${result.lostDate}T00:00:00+08:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result.lostDate) ||
        Number.isNaN(parsed.valueOf()) ||
        parsed.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' }) !== result.lostDate) {
      throw new InvalidLostFoundRequest('?箏仃?交??澆?銝迤蝣箝?');
    }
  }

  return result;
}
