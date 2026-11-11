import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const arg = process.argv.indexOf('--root');
const root = arg >= 0 ? path.resolve(process.argv[arg + 1]) : process.cwd();
const site = 'https://www.itingcomms.com';
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(urls).size, urls.length, 'sitemap URLs must be unique');
const cache = new Map();
const fileFor = pathname => path.join(root, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
const htmlFor = async pathname => {
  if (!cache.has(pathname)) cache.set(pathname, await readFile(fileFor(pathname),'utf8'));
  return cache.get(pathname);
};
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const decode = s => s.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const text = s => decode(s.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
for (const url of urls) {
  const pathname = new URL(url).pathname;
  const html = await htmlFor(pathname);
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,`${pathname}: exactly one H1`);
  assert.equal((html.match(/<title(?:\s|>)/g)||[]).length,1,`${pathname}: exactly one title`);
  assert.equal((html.match(/name="description"/g)||[]).length,1,`${pathname}: exactly one description`);
  assert(!/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html),`${pathname}: must be indexable`);
  const links = [...html.matchAll(/<link\s[^>]+>/g)].map(m=>attrs(m[0]));
  assert.deepEqual(links.filter(l=>l.rel==='canonical').map(l=>l.href),[url],`${pathname}: self canonical`);
  const en = pathname.startsWith('/en/');
  const koPath = en ? pathname.slice(3) : pathname;
  const expected = {ko:`${site}${koPath}`,en:`${site}/en${koPath}`,'x-default':`${site}${koPath}`};
  for (const [lang,href] of Object.entries(expected)) assert(links.some(l=>l.rel==='alternate'&&l.hreflang===lang&&l.href===href),`${pathname}: ${lang} alternate`);
  assert(html.includes(`<html lang="${en?'en':'ko'}"`),`${pathname}: document language`);
  for (const match of html.matchAll(/href="([^"\s]+)"/g)) {
    const href = decode(match[1]);
    if (!(href.startsWith('/')||href.startsWith('#'))) continue;
    const target = new URL(href, url);
    if (target.origin!==site || !target.hash) continue;
    const targetHtml = await htmlFor(target.pathname);
    assert(targetHtml.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`),`${pathname}: missing fragment ${href}`);
  }
  const body = text(html.slice(html.indexOf('<body')).replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const schema = JSON.parse(match[1]);
    for (const node of schema['@graph'] || [schema]) {
      if (node['@type'] === 'FAQPage') for (const question of node.mainEntity) {
        assert(body.includes(question.name),`${pathname}: FAQ question not visible`);
        assert(body.includes(question.acceptedAnswer.text),`${pathname}: FAQ answer not visible`);
      }
      if (node['@type'] === 'Service' && pathname.includes('/services/')) {
        assert.equal(node.url,url,`${pathname}: service URL`);
        assert.equal(node.provider['@id'],`${site}/#organization`,`${pathname}: service provider`);
      }
    }
  }
}
for (const prefix of ['', '/en']) {
  const homepage = await htmlFor(`${prefix}/`);
  for (const slug of ['geo-marketing','performance-marketing','event-marketing']) assert(homepage.includes(`href="${prefix}/services/${slug}/"`),`homepage links to ${prefix}/${slug}`);
}
assert((await htmlFor('/en/')).includes('property="og:locale:alternate" content="ko_KR"'),'English alternate locale');
console.log(`Discovery tests passed for ${urls.length} sitemap pages: metadata, canonical, hreflang, fragments, visible FAQ, and service links.`);
