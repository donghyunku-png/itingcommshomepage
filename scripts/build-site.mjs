import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderInline } from './markdown-inline.mjs';

const root = process.cwd();
const siteUrl = 'https://www.itingcomms.com';
const contentDir = path.join(root, 'content', 'blog');
const englishContentDir = path.join(contentDir, 'en');
const draftDir = path.join(contentDir, 'drafts');
const reviewFlag = process.argv.includes('--include-drafts');
const outputArg = process.argv.indexOf('--output-root');
const outputRoot = outputArg >= 0 ? path.resolve(process.argv[outputArg + 1] || '') : root;
if (outputArg >= 0 && !process.argv[outputArg + 1]) throw new Error('--output-root requires a directory');
const manifestPath = path.join(outputRoot, '.generated-blog.json');

const categories = [
  { name: '회사 소식', enName: 'Company News', slug: 'company-news', description: '아이팅커뮤니케이션즈의 공지와 업데이트', enDescription: 'News and updates from ITING Communications' },
  { name: 'GEO', enName: 'GEO', slug: 'geo', description: '생성형 엔진 최적화와 AI 답변 관측 방법', enDescription: 'Methods for generative engine optimization and observing AI answers' },
  { name: 'AX', enName: 'AX', slug: 'ax', description: '업무와 고객 경험을 바꾸는 AI 전환 사례와 방법', enDescription: 'Approaches to AI transformation in work and customer experience' },
  { name: 'AI 동향', enName: 'AI Trends', slug: 'ai-trends', description: '확인 가능한 출처를 바탕으로 정리한 AI 동향', enDescription: 'AI trends explained with verifiable sources' },
];
const allowedCategories = new Set(categories.map(({ name }) => name));
const allowedEnglishCategories = new Set(categories.map(({ enName }) => enName));

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const inline = renderInline;

function parseFrontMatter(source, filename) {
  const lines = source.replaceAll('\r\n', '\n').split('\n');
  if (lines[0] !== '---') throw new Error(`${filename}: front matter must start with ---`);
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error(`${filename}: front matter is not closed`);
  const meta = { sources: [] };
  let activeList = null;
  for (const line of lines.slice(1, end)) {
    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && activeList) {
      meta[activeList].push(listMatch[1].trim());
      continue;
    }
    const pair = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!pair) continue;
    const [, key, raw] = pair;
    const value = raw.trim().replace(/^(?:["'])(.*)(?:["'])$/, '$1');
    if (key === 'sources') {
      activeList = 'sources';
      continue;
    }
    activeList = null;
    meta[key] = value;
  }
  return { meta, body: lines.slice(end + 1).join('\n').trim(), filename };
}

function validateArticle(article, { draft = false, categoryNames = allowedCategories } = {}) {
  const { meta, body, filename } = article;
  const required = draft
    ? ['title', 'slug', 'category', 'description', 'author']
    : ['title', 'slug', 'category', 'description', 'author', 'published'];
  for (const key of required) if (!meta[key]) throw new Error(`${filename}: ${key} is required`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) throw new Error(`${filename}: slug must be lowercase kebab-case`);
  if (!categoryNames.has(meta.category)) throw new Error(`${filename}: unsupported category ${meta.category}`);
  for (const key of ['published', 'updated']) {
    if (meta[key] && !/^\d{4}-\d{2}-\d{2}$/.test(meta[key])) throw new Error(`${filename}: ${key} must use YYYY-MM-DD`);
  }
  if (meta.updated && meta.published && meta.updated < meta.published) throw new Error(`${filename}: updated cannot precede published`);
  if (!draft && meta.published > new Date().toISOString().slice(0, 10)) throw new Error(`${filename}: future publication dates are not supported`);
  if (!body) throw new Error(`${filename}: body is empty`);
  for (const source of meta.sources) {
    if (!/^.+\s\|\shttps?:\/\/.+/.test(source)) throw new Error(`${filename}: sources must use "title | https://..."`);
  }
}

function renderMarkdown(markdown) {
  const lines = markdown.split('\n');
  const output = [];
  let paragraph = [];
  let list = [];
  let listType = null;
  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    const tag = listType === 'ol' ? 'ol' : 'ul';
    output.push(`<${tag}>${list.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`);
    list = [];
    listType = null;
  };
  for (const line of lines) {
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) { flushParagraph(); flushList(); const level = heading[1].length; output.push(`<h${level}>${inline(heading[2])}</h${level}>`); continue; }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (bullet || ordered) {
      flushParagraph();
      const nextType = ordered ? 'ol' : 'ul';
      if (list.length && listType !== nextType) flushList();
      listType = nextType;
      list.push((ordered || bullet)[1]);
      continue;
    }
    const quote = line.match(/^>\s?(.+)$/);
    if (quote) { flushParagraph(); flushList(); output.push(`<blockquote>${inline(quote[1])}</blockquote>`); continue; }
    if (/^#\s+/.test(line)) continue;
    paragraph.push(line.trim());
  }
  flushParagraph(); flushList();
  return output.join('\n');
}

function siteHeader(locale = 'ko', alternatePath = '') {
  const english = locale === 'en';
  const prefix = english ? '/en' : '';
  const languageHref = alternatePath || (english ? '/' : '/en/');
  return `<header class="site-header"><div class="container header-inner"><a class="brand" href="${prefix}/"><img src="/assets/logo.png" alt="${english ? 'ITING Communications logo' : '아이팅커뮤니케이션즈 로고'}" width="40" height="40"><span class="brand-name">ITING Communications</span></a><nav class="primary-nav" aria-label="Primary"><a href="${prefix}/#geo">GEO Inside</a><a href="${prefix}/#packages">${english ? 'Packages' : '패키지'}</a><a href="${prefix}/blog/">${english ? 'Insights' : '인사이트'}</a><a href="${prefix}/#contact">${english ? 'Contact' : '문의'}</a></nav><div class="header-actions"><a class="lang-toggle" href="${languageHref}" hreflang="${english ? 'ko' : 'en'}" lang="${english ? 'ko' : 'en'}" aria-label="${english ? '이 페이지를 한국어로 보기' : 'View this page in English'}">${english ? 'KO' : 'EN'}</a></div></div></header>`;
}

function siteFooter(locale = 'ko') {
  const english = locale === 'en';
  return `<footer class="site-footer"><div class="footer-bottom container"><p>© 2026 ITING Communications Inc.</p><p><a href="${english ? '/en/privacy.html' : '/privacy.html'}">${english ? 'Privacy Policy' : '개인정보처리방침'}</a> · <a href="${english ? '/en/terms.html' : '/terms.html'}">${english ? 'Terms of Use' : '이용약관'}</a></p></div></footer>`;
}

const articlePath = (article, locale = 'ko') => {
  const prefix = locale === 'en' ? '/en' : '';
  return article.isDraft ? `${prefix}/blog/review/${article.meta.slug}/` : `${prefix}/blog/${article.meta.slug}/`;
};

function articlePage(article, locale = 'ko') {
  const { meta, body, isDraft } = article;
  const english = locale === 'en';
  const canonical = `${siteUrl}${english ? '/en' : ''}/blog/${meta.slug}/`;
  const koreanUrl = `${siteUrl}/blog/${meta.slug}/`;
  const englishUrl = `${siteUrl}/en/blog/${meta.slug}/`;
  const modified = meta.updated || meta.published;
  const sources = meta.sources.map((entry) => {
    const [label, url] = entry.split(/\s\|\s/, 2);
    return `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></li>`;
  }).join('');
  const schema = isDraft ? '' : `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: meta.title,
    description: meta.description, datePublished: meta.published, dateModified: modified,
    inLanguage: english ? 'en' : 'ko-KR', mainEntityOfPage: canonical,
    author: { '@type': 'Organization', name: meta.author, url: siteUrl },
    publisher: { '@type': 'Organization', name: 'ITING Communications Inc.', logo: { '@type': 'ImageObject', url: `${siteUrl}/assets/logo.png` } },
  }).replaceAll('<', '\\u003c')}</script>`;
  const robots = isDraft ? 'noindex,nofollow,noarchive' : 'index,follow,max-snippet:-1,max-image-preview:large';
  const canonicalLink = isDraft ? '' : `<link rel="canonical" href="${canonical}">`;
  const articleMeta = isDraft
    ? `<span class="review-badge">${english ? 'Review draft · Do not publish' : '검토용 초안 · 공개 금지'}</span>`
    : `<time datetime="${meta.published}">${meta.published}</time>${meta.updated ? `<span>${english ? 'Updated' : '업데이트'} <time datetime="${meta.updated}">${meta.updated}</time></span>` : ''}`;
  const alternates = isDraft ? '' : `<link rel="alternate" hreflang="ko" href="${koreanUrl}"><link rel="alternate" hreflang="en" href="${englishUrl}"><link rel="alternate" hreflang="x-default" href="${koreanUrl}">`;
  return `<!doctype html><html lang="${english ? 'en' : 'ko'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#02103a"><title>${escapeHtml(meta.title)} | ITING Insights</title><meta name="description" content="${escapeHtml(meta.description)}"><meta name="author" content="${escapeHtml(meta.author)}"><meta name="robots" content="${robots}">${canonicalLink}${alternates}<link rel="alternate" type="application/rss+xml" title="ITING Insights" href="${english ? '/en/feed.xml' : '/feed.xml'}"><meta property="og:type" content="article"><meta property="og:site_name" content="ITING Communications"><meta property="og:locale" content="${english ? 'en_US' : 'ko_KR'}"><meta property="og:title" content="${escapeHtml(meta.title)}"><meta property="og:description" content="${escapeHtml(meta.description)}"><meta property="og:image" content="${siteUrl}/assets/logo.png">${isDraft ? '' : `<meta property="og:url" content="${canonical}"><meta property="article:published_time" content="${meta.published}"><meta property="article:modified_time" content="${modified}">`}<meta property="article:section" content="${escapeHtml(meta.category)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@Itingcomms"><link rel="icon" href="/favicon.png"><link rel="stylesheet" href="/css/styles.css">${schema}</head><body>${siteHeader(locale, english ? `/blog/${meta.slug}/` : `/en/blog/${meta.slug}/`)}<main class="article container"><a class="svc-link" href="${english ? '/en/blog/' : '/blog/'}">← ${english ? 'Insights' : '인사이트'}</a><p class="kicker">${escapeHtml(meta.category)}</p><h1>${escapeHtml(meta.title)}</h1><p class="article-dek">${escapeHtml(meta.description)}</p><div class="blog-meta"><span>${escapeHtml(meta.author)}</span>${articleMeta}</div><article class="article-body">${renderMarkdown(body)}</article>${sources ? `<section class="article-sources"><h2>${english ? 'Sources' : '출처'}</h2><ol>${sources}</ol></section>` : ''}</main>${siteFooter(locale)}</body></html>`;
}

function filterNav(active = 'all', locale = 'ko') {
  const english = locale === 'en';
  const items = [{ name: english ? 'All' : '전체', slug: 'all' }, ...categories.map((category) => ({ ...category, name: english ? category.enName : category.name }))];
  return `<nav class="blog-filters" aria-label="${english ? 'Insight categories' : '인사이트 카테고리'}">${items.map((item) => {
    const prefix = english ? '/en' : '';
    const href = item.slug === 'all' ? `${prefix}/blog/` : `${prefix}/blog/category/${item.slug}/`;
    return `<a class="blog-filter${active === item.slug ? ' is-active' : ''}" href="${href}"${active === item.slug ? ' aria-current="page"' : ''}>${escapeHtml(item.name)}</a>`;
  }).join('')}</nav>`;
}

function articleList(articles, locale = 'ko') {
  const english = locale === 'en';
  if (!articles.length) return `<div class="blog-empty"><strong>${english ? 'No published articles yet.' : '아직 공개된 글이 없습니다.'}</strong><p>${english ? 'Articles appear here after editorial and source review.' : '검토와 출처 확인을 마친 글부터 게시합니다.'}</p></div>`;
  return `<div class="blog-list">${articles.map((article) => {
    const { meta, isDraft } = article;
    return `<article class="blog-row"><div class="blog-row-copy"><div class="blog-meta"><span>${escapeHtml(meta.category)}</span>${isDraft ? `<span class="review-badge">${english ? 'Review draft' : '검토용 초안'}</span>` : `<time datetime="${meta.published}">${meta.published}</time>`}</div><h2><a href="${articlePath(article, locale)}">${escapeHtml(meta.title)}</a></h2><p>${escapeHtml(meta.description)}</p><a class="svc-link" href="${articlePath(article, locale)}">${english ? 'Read article' : '글 읽기'} →</a></div><div class="blog-row-mark" aria-hidden="true"><span>ITING</span><strong>INSIGHT</strong></div></article>`;
  }).join('')}</div>`;
}

function blogShell({ articles, active = 'all', title, description, isReview = false, locale = 'ko' }) {
  const english = locale === 'en';
  const robots = isReview ? '<meta name="robots" content="noindex,nofollow,noarchive">' : '<meta name="robots" content="index,follow">';
  const localPath = active === 'all' ? '/blog/' : `/blog/category/${active}/`;
  const canonicalPath = `${english ? '/en' : ''}${localPath}`;
  const koreanUrl = `${siteUrl}${localPath}`;
  const englishUrl = `${siteUrl}/en${localPath}`;
  const alternates = isReview ? '' : `<link rel="alternate" hreflang="ko" href="${koreanUrl}"><link rel="alternate" hreflang="en" href="${englishUrl}"><link rel="alternate" hreflang="x-default" href="${koreanUrl}">`;
  return `<!doctype html><html lang="${english ? 'en' : 'ko'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#02103a"><title>${escapeHtml(title)} | ITING Insights</title><meta name="description" content="${escapeHtml(description)}">${robots}${isReview ? '' : `<link rel="canonical" href="${siteUrl}${canonicalPath}">${alternates}`}<link rel="alternate" type="application/rss+xml" title="ITING Insights" href="${english ? '/en/feed.xml' : '/feed.xml'}"><meta property="og:type" content="website"><meta property="og:locale" content="${english ? 'en_US' : 'ko_KR'}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">${isReview ? '' : `<meta property="og:url" content="${siteUrl}${canonicalPath}">`}<meta property="og:image" content="${siteUrl}/assets/logo.png"><link rel="icon" href="/favicon.png"><link rel="stylesheet" href="/css/styles.css"></head><body>${siteHeader(locale, english ? localPath : `/en${localPath}`)}${isReview ? '<div class="review-ribbon">PRIVATE REVIEW · 공개 전 초안 포함</div>' : ''}<section class="blog-profile"><div class="container blog-profile-inner"><div><p class="kicker">ITING INSIGHTS</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div><div class="blog-profile-seal" aria-hidden="true">ITING</div></div></section><main class="container blog-shell">${filterNav(active, locale)}${articleList(articles, locale)}</main>${siteFooter(locale)}</body></html>`;
}

function latestSection(articles, locale = 'ko') {
  const english = locale === 'en';
  const latest = articles.slice(0, 3);
  const body = latest.length ? `<div class="home-insight-list">${latest.map((article) => `<article class="home-insight-card"><div class="blog-meta"><span>${escapeHtml(article.meta.category)}</span>${article.isDraft ? `<span class="review-badge">${english ? 'Review draft' : '검토용 초안'}</span>` : `<time datetime="${article.meta.published}">${article.meta.published}</time>`}</div><h3><a href="${articlePath(article, locale)}">${escapeHtml(article.meta.title)}</a></h3><p>${escapeHtml(article.meta.description)}</p><a class="svc-link" href="${articlePath(article, locale)}">${english ? 'Read article' : '글 읽기'} →</a></article>`).join('')}</div>` : `<div class="blog-empty"><strong>${english ? 'No published articles yet.' : '아직 공개된 글이 없습니다.'}</strong><p>${english ? 'Articles appear here after editorial and source review.' : '검토와 출처 확인을 마친 글부터 게시합니다.'}</p></div>`;
  return `<!-- BLOG_LATEST_START -->\n<section class="section home-insights" id="insights" aria-labelledby="insights-h2"><div class="container"><p class="kicker">ITING INSIGHTS</p><h2 id="insights-h2">${english ? 'Latest insights' : '최신 인사이트'}</h2>${body}<p class="home-insights-more"><a class="svc-link" href="${english ? '/en/blog/' : '/blog/'}">${english ? 'View all insights' : '모든 인사이트 보기'} →</a></p></div></section>\n<!-- BLOG_LATEST_END -->`;
}

function renderEnglish(source, file) {
  let html = source.replace(/<html lang="ko"[^>]*>/, '<html lang="en">');
  html = html.replace(/<([a-z][a-z0-9]*)([^>]*\sdata-en="([^"]*)"[^>]*)>[\s\S]*?<\/\1>/gi, (_, tag, attrs, english) => `<${tag}${attrs}>${english}</${tag}>`);
  html = html.replace(/<meta([^>]*?)data-en="([^"]*)"([^>]*?)>/gi, (_, before, english, after) => {
    const attrs = `${before}${after}`.replace(/\scontent="[^"]*"/i, '');
    return `<meta${attrs} content="${english}">`;
  });
  html = html.replace(/alt="[^"]*"\s+data-en-alt="([^"]*)"/g, 'alt="$1" data-en-alt="$1"');
  html = html.replace(/aria-label="[^"]*"\s+data-en-label="([^"]*)"/g, 'aria-label="$1" data-en-label="$1"');
  html = html.replace('content="ko_KR"', 'content="en_US"');
  if (file === 'index.html') {
    html = html.replace('<link rel="canonical" href="https://www.itingcomms.com/">', '<link rel="canonical" href="https://www.itingcomms.com/en/">');
    html = html.replace('<meta property="og:url" content="https://www.itingcomms.com/">', '<meta property="og:url" content="https://www.itingcomms.com/en/">');
    html = html.replace('href="/en/" hreflang="en" lang="en" aria-label="View this page in English">EN</a>', 'href="/" hreflang="ko" lang="ko" aria-label="이 페이지를 한국어로 보기">KO</a>');
    html = html.replaceAll('href="/privacy.html"', 'href="/en/privacy.html"').replaceAll('href="/terms.html"', 'href="/en/terms.html"');
    html = html.replaceAll('href="/blog/', 'href="/en/blog/').replaceAll('href="/feed.xml"', 'href="/en/feed.xml"');
  } else {
    html = html.replace(`<link rel="canonical" href="https://www.itingcomms.com/${file}">`, `<link rel="canonical" href="https://www.itingcomms.com/en/${file}">`);
    html = html.replace(`<meta property="og:url" content="https://www.itingcomms.com/${file}">`, `<meta property="og:url" content="https://www.itingcomms.com/en/${file}">`);
    html = html.replace(`"item":"https://www.itingcomms.com/${file}"`, `"item":"https://www.itingcomms.com/en/${file}"`);
    html = html.replace(`href="/en/${file}" hreflang="en" lang="en">EN</a>`, `href="/${file}" hreflang="ko" lang="ko">KO</a>`);
  }
  return html;
}

async function copyReviewBase() {
  if (outputRoot === root) return;
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  for (const directory of ['assets', 'css', 'js']) await cp(path.join(root, directory), path.join(outputRoot, directory), { recursive: true });
  for (const file of ['favicon.png', 'index.html', 'privacy.html', 'terms.html', 'robots.txt', 'llms.txt']) await cp(path.join(root, file), path.join(outputRoot, file));
  const reviewIndexPath = path.join(outputRoot, 'index.html');
  const reviewIndex = await readFile(reviewIndexPath, 'utf8');
  await writeFile(reviewIndexPath, reviewIndex
    .replace('id="contactForm"', 'id="contactFormReview"')
    .replace('<button type="submit" class="btn primary block" data-en="Open email application">이메일 앱 열기</button>', '<button type="button" class="btn primary block" data-en="Review only — sending disabled">검토용 · 전송 비활성화</button>'));
}

async function buildLocales() {
  await mkdir(path.join(outputRoot, 'en'), { recursive: true });
  for (const file of ['index.html', 'privacy.html', 'terms.html']) {
    const source = await readFile(path.join(outputRoot, file), 'utf8');
    await writeFile(path.join(outputRoot, 'en', file), renderEnglish(source, file));
  }
}

async function readArticles() {
  const published = [];
  const entries = (await readdir(contentDir)).filter((file) => file.endsWith('.md') && !file.startsWith('_') && file !== 'README.md');
  for (const filename of entries) {
    const article = parseFrontMatter(await readFile(path.join(contentDir, filename), 'utf8'), filename);
    if (String(article.meta.draft).toLowerCase() !== 'false') continue;
    validateArticle(article);
    published.push({ ...article, isDraft: false });
  }
  published.sort((a, b) => b.meta.published.localeCompare(a.meta.published));

  const drafts = [];
  if (reviewFlag) {
    let draftEntries = [];
    try { draftEntries = (await readdir(draftDir)).filter((file) => file.endsWith('.md') && !file.startsWith('_')); } catch {}
    for (const filename of draftEntries) {
      const article = parseFrontMatter(await readFile(path.join(draftDir, filename), 'utf8'), `drafts/${filename}`);
      validateArticle(article, { draft: true });
      drafts.push({ ...article, isDraft: true });
    }
  }
  const all = [...drafts, ...published];
  const slugs = all.map(({ meta }) => meta.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error('Duplicate blog slugs are not allowed');

  const englishPublished = [];
  let englishEntries = [];
  try { englishEntries = (await readdir(englishContentDir)).filter((file) => file.endsWith('.md') && !file.startsWith('_') && file !== 'README.md'); } catch {}
  for (const filename of englishEntries) {
    const article = parseFrontMatter(await readFile(path.join(englishContentDir, filename), 'utf8'), `en/${filename}`);
    if (String(article.meta.draft).toLowerCase() !== 'false') continue;
    validateArticle(article, { categoryNames: allowedEnglishCategories });
    englishPublished.push({ ...article, isDraft: false });
  }
  englishPublished.sort((a, b) => b.meta.published.localeCompare(a.meta.published));
  const englishBySlug = new Map(englishPublished.map((article) => [article.meta.slug, article]));
  for (const article of published) {
    const translation = englishBySlug.get(article.meta.slug);
    if (!translation) throw new Error(`${article.filename}: published article is missing an English translation`);
    if (translation.meta.published !== article.meta.published || translation.meta.updated !== article.meta.updated) throw new Error(`${article.filename}: Korean and English dates must match`);
    const category = categories.find(({ name }) => name === article.meta.category);
    if (translation.meta.category !== category?.enName) throw new Error(`${article.filename}: Korean and English categories do not match`);
  }
  if (new Set(englishPublished.map(({ meta }) => meta.slug)).size !== englishPublished.length) throw new Error('Duplicate English blog slugs are not allowed');
  return { published, drafts, all, englishPublished };
}

async function buildBlog({ published, drafts, all, englishPublished }) {
  const blogDir = path.join(outputRoot, 'blog');
  const englishBlogDir = path.join(outputRoot, 'en', 'blog');
  let previous = [];
  let previousEnglish = [];
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    previous = manifest.slugs || [];
    previousEnglish = manifest.englishSlugs || [];
  } catch {}
  const publishedSlugs = published.map(({ meta }) => meta.slug);
  const englishSlugs = englishPublished.map(({ meta }) => meta.slug);
  for (const slug of previous) if (!publishedSlugs.includes(slug)) await rm(path.join(blogDir, slug), { recursive: true, force: true });
  for (const slug of previousEnglish) if (!englishSlugs.includes(slug)) await rm(path.join(englishBlogDir, slug), { recursive: true, force: true });

  await mkdir(blogDir, { recursive: true });
  await writeFile(path.join(blogDir, 'index.html'), blogShell({
    articles: all,
    title: '회사 소식과 GEO·AX·AI 동향',
    description: reviewFlag ? '검토용 초안을 포함한 비공개 프리뷰입니다.' : '직접 확인한 자료와 실무 경험을 바탕으로, 출처와 업데이트 날짜가 분명한 글을 게시합니다.',
    isReview: reviewFlag,
  }));

  for (const article of published) {
    const directory = path.join(blogDir, article.meta.slug);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), articlePage(article));
  }
  if (reviewFlag) {
    for (const article of drafts) {
      const directory = path.join(blogDir, 'review', article.meta.slug);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, 'index.html'), articlePage(article));
    }
  }

  for (const category of categories) {
    const directory = path.join(blogDir, 'category', category.slug);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), blogShell({
      articles: all.filter(({ meta }) => meta.category === category.name),
      active: category.slug,
      title: `${category.name} 인사이트`,
      description: category.description,
      isReview: reviewFlag,
    }));
  }

  await mkdir(englishBlogDir, { recursive: true });
  await writeFile(path.join(englishBlogDir, 'index.html'), blogShell({
    articles: englishPublished,
    title: 'Company News and GEO, AX & AI Trends',
    description: 'Source-checked articles with clear publication and update dates, grounded in primary materials and practical experience.',
    locale: 'en',
  }));
  for (const article of englishPublished) {
    const directory = path.join(englishBlogDir, article.meta.slug);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), articlePage(article, 'en'));
  }
  for (const category of categories) {
    const directory = path.join(englishBlogDir, 'category', category.slug);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), blogShell({
      articles: englishPublished.filter(({ meta }) => meta.category === category.enName),
      active: category.slug,
      title: `${category.enName} Insights`,
      description: category.enDescription,
      locale: 'en',
    }));
  }
  await writeFile(manifestPath, JSON.stringify({ slugs: publishedSlugs, englishSlugs }, null, 2) + '\n');
}

async function injectHomepage(articles, locale = 'ko') {
  const indexPath = path.join(outputRoot, locale === 'en' ? 'en' : '', 'index.html');
  const source = await readFile(indexPath, 'utf8');
  if (!source.includes('<!-- BLOG_LATEST_START -->')) throw new Error('Homepage blog markers are missing');
  await writeFile(indexPath, source.replace(/<!-- BLOG_LATEST_START -->[\s\S]*?<!-- BLOG_LATEST_END -->/, latestSection(articles, locale)));
}

async function buildDiscovery(published, englishPublished) {
  const today = new Date().toISOString().slice(0, 10);
  const staticUrls = ['/', '/en/', '/blog/', '/en/blog/', ...categories.flatMap(({ slug }) => [`/blog/category/${slug}/`, `/en/blog/category/${slug}/`]), '/privacy.html', '/en/privacy.html', '/terms.html', '/en/terms.html'];
  const urls = staticUrls.map((url) => `  <url><loc>${siteUrl}${url}</loc><lastmod>${today}</lastmod></url>`);
  for (const { meta } of published) urls.push(`  <url><loc>${siteUrl}/blog/${meta.slug}/</loc><lastmod>${meta.updated || meta.published}</lastmod></url>`);
  for (const { meta } of englishPublished) urls.push(`  <url><loc>${siteUrl}/en/blog/${meta.slug}/</loc><lastmod>${meta.updated || meta.published}</lastmod></url>`);
  await writeFile(path.join(outputRoot, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

  const items = published.map(({ meta }) => `<item><title>${escapeHtml(meta.title)}</title><link>${siteUrl}/blog/${meta.slug}/</link><guid isPermaLink="true">${siteUrl}/blog/${meta.slug}/</guid><pubDate>${new Date(`${meta.published}T00:00:00+09:00`).toUTCString()}</pubDate><description>${escapeHtml(meta.description)}</description><category>${escapeHtml(meta.category)}</category></item>`).join('\n');
  await writeFile(path.join(outputRoot, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>ITING Insights</title><link>${siteUrl}/blog/</link><atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/><description>ITING Communications company news, GEO, AX, and AI trends.</description><language>ko-KR</language>${items}</channel></rss>\n`);
  const englishItems = englishPublished.map(({ meta }) => `<item><title>${escapeHtml(meta.title)}</title><link>${siteUrl}/en/blog/${meta.slug}/</link><guid isPermaLink="true">${siteUrl}/en/blog/${meta.slug}/</guid><pubDate>${new Date(`${meta.published}T00:00:00+09:00`).toUTCString()}</pubDate><description>${escapeHtml(meta.description)}</description><category>${escapeHtml(meta.category)}</category></item>`).join('\n');
  await writeFile(path.join(outputRoot, 'en', 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>ITING Insights</title><link>${siteUrl}/en/blog/</link><atom:link href="${siteUrl}/en/feed.xml" rel="self" type="application/rss+xml"/><description>Source-checked company news, GEO, AX, and AI trends from ITING Communications.</description><language>en</language>${englishItems}</channel></rss>\n`);
}

await copyReviewBase();
const articles = await readArticles();
await buildBlog(articles);
await injectHomepage(reviewFlag ? articles.all : articles.published);
await buildLocales();
await injectHomepage(articles.englishPublished, 'en');
await buildDiscovery(articles.published, articles.englishPublished);
console.log(`Built ${reviewFlag ? 'private review' : 'public'} site with ${articles.published.length} Korean, ${articles.englishPublished.length} English, and ${articles.drafts.length} draft post(s) at ${outputRoot}.`);
