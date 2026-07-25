import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const clientScriptPath = new URL('../../../assets/lost-found-local-api.js', import.meta.url);

describe('friendly transfer client integration', () => {
  it('removes the injected transfer tools when leaving the transfer page', async () => {
    const clientScript = await readFile(clientScriptPath, 'utf8');

    expect(clientScript).toContain("document.getElementById('railagent-friendly-transfer-tools')?.remove()");
  });

  it('marks transfer controls so the existing talkback controller can announce them', async () => {
    const clientScript = await readFile(clientScriptPath, 'utf8');

    expect(clientScript).toContain('data-railagent-transfer-control');
  });

  it('removes the legacy transfer preference tag strip', async () => {
    const clientScript = await readFile(clientScriptPath, 'utf8');

    expect(clientScript).toContain("panel.querySelectorAll('.mp-tags')");
    expect(clientScript).toContain("tagList.setAttribute('data-railagent-local-hidden', 'true')");
  });
});
