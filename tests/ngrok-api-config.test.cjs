const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('public app defaults to the assigned ngrok development domain', () => {
  const config = read('assets/railagent-api-config.js');
  const html = read('index.html');

  assert.match(config, /https:\/\/detergent-mower-squirt\.ngrok-free\.dev/);
  assert.match(config, /function resolveApiBaseUrl\(search\)/);
  assert.match(html, /railagent-api-config\.js\?v=20260727-ngrok-default-2/);
  assert.ok(html.indexOf('railagent-api-config.js') < html.indexOf('lost-found-local-api.js'));
});

test('stale public tunnel overrides cannot replace the fixed competition API', () => {
  const context = { URL, URLSearchParams, window: {} };
  vm.runInNewContext(read('assets/railagent-api-config.js'), context);

  assert.equal(
    context.window.RailAgentApiConfig.resolveApiBaseUrl('?apiBaseUrl=https%3A%2F%2Fexpired-demo.trycloudflare.com'),
    'https://detergent-mower-squirt.ngrok-free.dev/',
  );
  assert.equal(
    context.window.RailAgentApiConfig.resolveApiBaseUrl('?apiBaseUrl=http%3A%2F%2F127.0.0.1%3A7071'),
    'http://127.0.0.1:7071/',
  );
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

test('tracked-case changes refresh supervisor totals and invalidate stale staff clients', () => {
  const passenger = read('assets/lost-found-local-api.js');
  const unfollow = read('assets/passenger-case-unfollow.js');
  const supervisor = read('assets/supervisor-dashboard-enhancer.js');
  const html = read('index.html');

  assert.match(passenger, /railagent:tracked-cases-changed/);
  assert.match(passenger, /function restoreTrackedCasesToApi\(\)/);
  assert.match(passenger, /restoreTrackedCasesToApi\(\);/);
  assert.match(unfollow, /\/api\/lost-found\/cases\/untrack/);
  assert.match(unfollow, /railagent:tracked-cases-changed/);
  assert.doesNotMatch(supervisor, /if \(trackedRequest\) return trackedRequest/);
  assert.match(supervisor, /railagent:tracked-cases-changed/);
  assert.match(html, /staff-lost-found-enhancer\.js\?v=20260727-live-tasks-1/);
});

test('the local API permits the ngrok warning bypass header from GitHub Pages', () => {
  const localServer = read('local-api/src/localServer.ts');
  const functionApi = read('local-api/src/functions/matchLostFound.ts');

  assert.match(localServer, /Content-Type, x-demo-user-id, ngrok-skip-browser-warning/);
  assert.match(functionApi, /Content-Type, ngrok-skip-browser-warning/);
});
