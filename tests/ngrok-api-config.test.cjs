const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('public app defaults to the assigned ngrok development domain', () => {
  const config = read('assets/railagent-api-config.js');
  const html = read('index.html');

  assert.match(config, /https:\/\/detergent-mower-squirt\.ngrok-free\.dev/);
  assert.match(config, /function resolveApiBaseUrl\(search\)/);
  assert.match(html, /railagent-api-config\.js\?v=20260727-ngrok-default-1/);
  assert.ok(html.indexOf('railagent-api-config.js') < html.indexOf('lost-found-local-api.js'));
});

test('all browser API clients use the shared endpoint resolver and ngrok warning bypass header', () => {
  for (const file of [
    'assets/lost-found-local-api.js',
    'assets/staff-lost-found-enhancer.js',
    'assets/staff-lost-found-runtime.js',
    'assets/supervisor-dashboard-enhancer.js',
  ]) {
    const source = read(file);
    assert.match(source, /RailAgentApiConfig/);
    assert.match(source, /withApiHeaders/);
  }
});

test('the local API permits the ngrok warning bypass header from GitHub Pages', () => {
  const localServer = read('local-api/src/localServer.ts');
  const functionApi = read('local-api/src/functions/matchLostFound.ts');

  assert.match(localServer, /Content-Type, x-demo-user-id, ngrok-skip-browser-warning/);
  assert.match(functionApi, /Content-Type, ngrok-skip-browser-warning/);
});
