import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const rootArg = process.argv.indexOf('--root');
const root = rootArg >= 0 ? path.resolve(process.argv[rootArg + 1] || '') : process.cwd();
if (rootArg >= 0 && !process.argv[rootArg + 1]) throw new Error('--root requires a directory');
const errors = [];

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
  [/\b(?:490,000|1,490,000)\b/, 'obsolete public price'],
  [/\+(?:115(?:\.1)?|41|28)%|3\.2\s*[×x배]|검색의\s*40%/i, 'unsupported performance statistic'],
  [/100건\s*이상|ARR\s*\d+/i, 'unsupported company performance claim'],
];

for (const file of publicFiles) {
  const source = await readFile(file, 'utf8');
  for (const [pattern, label] of forbidden) if (pattern.test(source)) errors.push(`${path.relative(root, file)}: ${label}`);
  if (file.endsWith('.html')) {
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
