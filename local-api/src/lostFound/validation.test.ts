import { describe, expect, it } from 'vitest';
import { InvalidLostFoundRequest, normalizeLostFoundRequest } from './validation.js';

describe('normalizeLostFoundRequest', () => {
  it('trims the seven supported fields and rejects client records', () => {
    expect(normalizeLostFoundRequest({
      itemType: ' ?? ',
      color: ' 暺 ',
      brand: '',
      features: ' ?質璅? ',
      lostDate: '2026-07-20',
      stationName: ' ?箏? ',
      trainNumber: ' 123 '
    })).toEqual({
      itemType: '??',
      color: '暺',
      brand: '',
      features: '?質璅?',
      lostDate: '2026-07-20',
      stationName: '?箏?',
      trainNumber: '123'
    });
    expect(() => normalizeLostFoundRequest({ itemType: '??', items: [{}] }))
      .toThrow(InvalidLostFoundRequest);
  });

  it.each([
    {},
    { color: '暺' },
    { itemType: 'x'.repeat(81) },
    { features: '??', lostDate: '2026-02-30' }
  ])('rejects invalid input %#', (value) => {
    expect(() => normalizeLostFoundRequest(value)).toThrow(InvalidLostFoundRequest);
  });
});
