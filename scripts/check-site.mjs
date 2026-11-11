import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { renderInline } from './markdown-inline.mjs';

const rootArg = process.argv.indexOf('--root');
const root = rootArg >= 0 ? path.resolve(process.argv[rootArg + 1] || '') : process.cwd();
if (rootArg >= 0 && !process.argv[rootArg + 1]) throw new Error('--root requires a directory');
const errors = [];

const inlineCases = [
  ['Korean contact link', '[아이팅커뮤니케이션즈와 이야기해 주세요](/#contact)', '<a href="/#contact">아이팅커뮤니케이션즈와 이야기해 주세요</a>'],
  ['English contact link', '[talk to ITING Communications about your goals and the support you need](/en/#contact)', '<a href="/en/#contact">talk to ITING Communications about your goals and the support you need</a>'],
  ['same-page fragment', '[Section](#details)', '<a href="#details">Section</a>'],
  ['external link', '[Source](https://example.com/a?x=1&y=2)', '<a href="https://example.com/a?x=1&amp;y=2" target="_blank" rel="noopener noreferrer">Source</a>'],
  ['literal code', '`[Contact](/#contact)`', '<code>[Contact](/#contact)</code>'],
  ['unsafe JavaScript URL', '[Unsafe](javascript:evil)', '[Unsafe](javascript:evil)'],
  ['unsafe data URL', '[Unsafe](data:text/html,evil)', '[Unsafe](data:text/html,evil)'],
  ['escaped label', '[<em>unsafe</em>](/safe)', '<a href="/safe">&lt;em&gt;unsafe&lt;/em&gt;</a>'],
];
for (const [label, source, expected] of inlineCases) {
  const actual = renderInline(source);
  if (actual !== expected) errors.push(`inline renderer: ${label} expected ${expected} but received ${actual}`);
}

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.library-helper'].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(full));
    else output.push(full);
  }
  return output;
}

const files = await walk(root);
const publicFiles = files.filter((file) => /\.(?:html|xml|txt)$/.test(file) && !file.includes(`${path.sep}content${path.sep}`));
const forbidden = [
  [/AENOMIZE|aeonomize/i, 'retired product name'],
  [/FormSubmit|formsubmit\.co/i, 'retired form provider'],
  [/https:\/\/geoinside\.ai\/?(?=[\s"<)]|$)/i, 'GEO Inside link must point to the public introduction'],
  [/\b(?:490,000|1,490,000)\b/, 'obsolete public price'],
  [/\+(?:115(?:\.1)?|41|28)%|3\.2\s*[×x배]|검색의\s*40%/i, 'unsupported performance statistic'],
  [/100건\s*이상|ARR\s*\d+/i, 'unsupported company performance claim'],
];

for (const file of publicFiles) {
  const source = await readFile(file, 'utf8');
  for (const [pattern, label] of forbidden) if (pattern.test(source)) errors.push(`${path.relative(root, file)}: ${label}`);
  if (file.endsWith('.html')) {
    if (/\[[^\]\n]+\]\((?:https?:\/\/|\/(?!\/)|#[a-z0-9])/i.test(source)) errors.push(`${path.relative(root, file)}: unrendered Markdown link`);
    const ids = [...source.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    for (const id of new Set(ids)) if (ids.filter((item) => item === id).length > 1) errors.push(`${path.relative(root, file)}: duplicate id ${id}`);
    for (const match of source.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(match[1]); } catch (error) { errors.push(`${path.relative(root, file)}: invalid JSON-LD (${error.message})`); }
    }
    for (const match of source.matchAll(/(?:href|src)="(\/[^"?#]*)/g)) {
      const target = match[1];
      if (target === '/') continue;
      let candidate = path.join(root, target);
      if (target.endsWith('/')) candidate = path.join(candidate, 'index.html');
      try { await access(candidate); } catch { errors.push(`${path.relative(root, file)}: missing internal target ${target}`); }
    }
    for (const match of source.matchAll(/data-formspree-endpoint="([^"]*)"/g)) {
      const endpoint = match[1];
      if (endpoint && !/^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(endpoint)) {
        errors.push(`${path.relative(root, file)}: invalid Formspree endpoint`);
      }
    }
  }
}

for (const homepage of ['index.html', path.join('en', 'index.html')]) {
  const source = await readFile(path.join(root, homepage), 'utf8');
  if (!source.includes('name="_gotcha"')) errors.push(`${homepage}: missing Formspree honeypot`);
  if (!source.includes('mailto:sales@itingcomms.com')) errors.push(`${homepage}: missing direct email fallback`);
  if (!source.includes('data-formspree-endpoint=')) errors.push(`${homepage}: missing Formspree endpoint configuration`);
  if (!/action="https:\/\/formspree\.io\/f\/[a-z0-9]+"\s+method="POST"/i.test(source)) {
    errors.push(`${homepage}: missing no-JavaScript Formspree fallback`);
  }
  if (/\snovalidate(?:\s|>)/i.test(source)) {
    errors.push(`${homepage}: no-JavaScript fallback must retain native required-field validation`);
  }
}

const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
for (const match of sitemap.matchAll(/<loc>https:\/\/www\.itingcomms\.com([^<]*)<\/loc>/g)) {
  const urlPath = match[1] || '/';
  let candidate = path.join(root, urlPath);
  if (urlPath.endsWith('/')) candidate = path.join(candidate, 'index.html');
  try { await access(candidate); } catch { errors.push(`sitemap.xml: missing target ${urlPath}`); }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Checked ${publicFiles.length} public text files: no blocking issues.`);
