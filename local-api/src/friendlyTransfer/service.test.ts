import { describe, expect, it } from 'vitest';
import { createFriendlyTransferService } from './service.js';

describe('friendly transfer service', () => {
  it('resolves a spoken Taipei station alias to the local service phone', () => {
    const service = createFriendlyTransferService({ chat: async () => 'unused' });

    expect(service.findStation('\u6211\u5728\u53f0\u5317\u8eca\u7ad9')).toMatchObject({
      station: '\u81fa\u5317\u8eca\u7ad9',
      phone: expect.stringMatching(/^02-/),
      confirmation: expect.stringContaining('\u81fa\u5317\u8eca\u7ad9')
    });
  });

  it('does not return a phone number for an unknown station', () => {
    const service = createFriendlyTransferService({ chat: async () => 'unused' });

    expect(() => service.findStation('\u6708\u7403\u7ad9')).toThrow('Station could not be resolved.');
  });

  it('asks Ollama for an accessible route using both supplied locations', async () => {
    const chat = async (prompt: string) => {
      expect(prompt).toContain('\u81fa\u5317\u8eca\u7ad9');
      expect(prompt).toContain('\u5357\u6e2f\u8eca\u7ad9');
      return '\u8acb\u4f9d\u73fe\u5834\u6307\u793a\u524d\u5f80\u8f49\u4e58\u6708\u53f0\u3002';
    };
    const service = createFriendlyTransferService({ chat });

    await expect(service.route('\u81fa\u5317\u8eca\u7ad9', '\u5357\u6e2f\u8eca\u7ad9')).resolves.toBe('\u8acb\u4f9d\u73fe\u5834\u6307\u793a\u524d\u5f80\u8f49\u4e58\u6708\u53f0\u3002');
  });
});
