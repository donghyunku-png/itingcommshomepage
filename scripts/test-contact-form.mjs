import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  classifyHttpStatus,
  createSubmissionGuard,
  isFormspreeEndpoint,
  sendToFormspree,
  validateInquiry,
} from '../js/contact-form.mjs';

const endpoint = 'https://formspree.io/f/abc123xy';
const data = new FormData();
data.set('name', 'Synthetic Test');

assert.equal(isFormspreeEndpoint(endpoint), true);
for (const unsafe of [
  '',
  'http://formspree.io/f/abc123xy',
  'https://formspree.io/forms/abc123xy',
  'https://formspree.io/f/abc123xy?redirect=evil',
  'https://formspree.io.evil.example/f/abc123xy',
  'javascript:alert(1)',
]) assert.equal(isFormspreeEndpoint(unsafe), false, `endpoint should be rejected: ${unsafe}`);

assert.deepEqual(validateInquiry({
  name: 'Test', email: 'test@example.com', topic: 'GEO Inside', message: 'Hello', consent: 'agreed',
}), { ok: true });
assert.deepEqual(validateInquiry({
  name: '', email: 'test@example.com', topic: 'GEO Inside', message: 'Hello', consent: 'agreed',
}), { ok: false, code: 'missing', field: 'name' });
assert.deepEqual(validateInquiry({
  name: 'Test', email: 'not-an-email', topic: 'GEO Inside', message: 'Hello', consent: 'agreed',
}), { ok: false, code: 'email', field: 'email' });

for (const consent of ['', undefined, '   ']) {
  assert.deepEqual(validateInquiry({
    name: 'Test', email: 'test@example.com', topic: 'GEO Inside', message: 'Hello', consent,
  }), { ok: false, code: 'missing', field: 'consent' }, 'unchecked consent must block submission');
}

for (const [file, policy] of [['index.html', '/privacy.html'], ['en/index.html', '/en/privacy.html']]) {
  const html = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.match(html, /id="cf-consent"[^>]*name="consent"[^>]*required[^>]*aria-describedby="cf-consent-details cf-consent-provider"/);
  assert.match(html, /for="cf-consent"/);
  assert.match(html, /id="cf-consent-details"/);
  assert.match(html, /id="cf-consent-provider"/);
  assert.ok(html.includes(`href="${policy}" data-en="View Privacy Policy"`));
  assert.match(html, /action="https:\/\/formspree\.io\/f\/xzeeyvwo" method="POST"/);
  assert.match(html, /name="_gotcha"/);
  assert.ok(!/href="https:\/\/geoinside\.ai\/?"/.test(html), 'product links must go to the public introduction');
  assert.equal([...html.matchAll(/href="https:\/\/geoinside\.ai\/landing"/g)].length, 2);
  assert.ok(!html.includes('Access may require signing in.'), 'outdated login notice must be removed');
}

assert.equal(classifyHttpStatus(200), 'accepted');
assert.equal(classifyHttpStatus(204), 'accepted');
assert.equal(classifyHttpStatus(422), 'rejected');
assert.equal(classifyHttpStatus(429), 'rate-limited');
assert.equal(classifyHttpStatus(500), 'uncertain-server');

const guard = createSubmissionGuard();
assert.equal(guard.begin(), true);
assert.equal(guard.begin(), false, 'double submit must be blocked while a request is active');
guard.finish('rejected');
assert.equal(guard.begin(), true, 'an explicit rejection may be corrected and retried manually');
guard.finish('uncertain-network');
assert.equal(guard.begin(), false, 'an uncertain request must remain locked to avoid duplicates');

const accepted = await sendToFormspree({
  endpoint, data, fetchImpl: async () => ({ status: 200, json: async () => ({ ok: true }) }),
});
assert.deepEqual(accepted, { outcome: 'accepted', status: 200 });

const providerRejected = await sendToFormspree({
  endpoint, data, fetchImpl: async () => ({ status: 200, json: async () => ({ ok: false }) }),
});
assert.deepEqual(providerRejected, { outcome: 'rejected', status: 200 });

const rateLimited = await sendToFormspree({
  endpoint, data, fetchImpl: async () => ({ status: 429, json: async () => ({}) }),
});
assert.deepEqual(rateLimited, { outcome: 'rate-limited', status: 429 });

const rejected = await sendToFormspree({
  endpoint, data, fetchImpl: async () => ({ status: 422, json: async () => ({}) }),
});
assert.deepEqual(rejected, { outcome: 'rejected', status: 422 });

const uncertainServer = await sendToFormspree({
  endpoint, data, fetchImpl: async () => ({ status: 503, json: async () => ({}) }),
});
assert.deepEqual(uncertainServer, { outcome: 'uncertain-server', status: 503 });

const uncertainNetwork = await sendToFormspree({
  endpoint, data, fetchImpl: async () => { throw new TypeError('network unavailable'); },
});
assert.deepEqual(uncertainNetwork, { outcome: 'uncertain-network' });

const uncertainTimeout = await sendToFormspree({
  endpoint,
  data,
  timeoutMs: 5,
  fetchImpl: async (_url, { signal }) => new Promise((_resolve, rejectPromise) => {
    signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      rejectPromise(error);
    }, { once: true });
  }),
});
assert.deepEqual(uncertainTimeout, { outcome: 'uncertain-timeout' });

assert.deepEqual(await sendToFormspree({ endpoint: '', data }), { outcome: 'not-configured' });

console.log('Contact form unit tests passed.');
