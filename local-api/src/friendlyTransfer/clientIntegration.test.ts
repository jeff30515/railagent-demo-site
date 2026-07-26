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

    expect(clientScript).toContain("panel.querySelectorAll('.mp-card')");
    expect(clientScript).toContain("if (card.querySelector('.mp-tags')) card.dataset.railagentLocalHidden = 'true'");
    expect(clientScript).toContain("document.querySelectorAll('.mp-tags')");
    expect(clientScript).toContain("tagList.closest('.mp-card')?.setAttribute('data-railagent-local-hidden', 'true')");
    expect(clientScript).toContain('String.fromCharCode(0x7e41, 0x9ad4, 0x4e2d, 0x6587)');
  });

  it('pauses talkback until voice recognition finishes', async () => {
    const clientScript = await readFile(clientScriptPath, 'utf8');
    const a11yScript = await readFile(new URL('../../../assets/railagent-a11y.js', import.meta.url), 'utf8');

    expect(clientScript).toContain("new CustomEvent('railagent:pause-talkback')");
    expect(clientScript).toContain("new CustomEvent('railagent:resume-talkback')");
    expect(clientScript).toContain('recognition.onend');
    expect(a11yScript).toContain("window.addEventListener('railagent:pause-talkback'");
    expect(a11yScript).toContain('if (talkbackPaused) return;');
  });
});
