const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test';

const app = require('./server');

test('GET /healthz responds with ok true', async () => {
  const server = app.listen(0);
  const port = server.address().port;
  const result = await new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path: '/healthz' }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
  server.close();
  assert.strictEqual(result.status, 200);
  const json = JSON.parse(result.body);
  assert.strictEqual(json.ok, true);
});
