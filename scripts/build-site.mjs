import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const siteUrl = 'https://www.itingcomms.com';
const contentDir = path.join(root, 'content', 'blog');
const draftDir = path.join(contentDir, 'drafts');
const reviewFlag = process.argv.includes('--include-drafts');
const outputArg = process.argv.indexOf('--output-root');
const outputRoot = outputArg >= 0 ? path.resolve(process.argv[outputArg + 1] || '') : root;
if (outputArg >= 0 && !process.argv[outputArg + 1]) throw new Error('--output-root requires a directory');
const manifestPath = path.join(outputRoot, '.generated-blog.json');

const categories = [
  { name: '회사 소식', slug: 'company-news', description: '아이팅커뮤니케이션즈의 공지와 업데이트' },
  { name: 'GEO', slug: 'geo', description: '생성형 엔진 최적화와 AI 답변 관측 방법' },
  { name: 'AX', slug: 'ax', description: '업무와 고객 경험을 바꾸는 AI 전환 사례와 방법' },
  { name: 'AI 동향', slug: 'ai-trends', description: '확인 가능한 출처를 바탕으로 정리한 AI 동향' },
];
const allowedCategories = new Set(categories.map(({ name }) => name));

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const inline = (value) => escapeHtml(value)
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/`([^`]+)`/g, '<code>$1</code>');

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

function validateArticle(article, { draft = false } = {}) {
  const { meta, body, filename } = article;
  const required = draft
    ? ['title', 'slug', 'category', 'description', 'author']
    : ['title', 'slug', 'category', 'description', 'author', 'published'];
  for (const key of required) if (!meta[key]) throw new Error(`${filename}: ${key} is required`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) throw new Error(`${filename}: slug must be lowercase kebab-case`);
  if (!allowedCategories.has(meta.category)) throw new Error(`${filename}: unsupported category ${meta.category}`);
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

function siteHeader(homeHref = '/') {
  return `<header class="site-header"><div class="container header-inner"><a class="brand" href="${homeHref}"><img src="/assets/logo.png" alt="아이팅커뮤니케이션즈 로고" width="40" height="40"><span class="brand-name">ITING Communications</span></a><nav class="primary-nav" aria-label="Primary"><a href="/#geo">GEO Inside</a><a href="/#packages">패키지</a><a href="/blog/">인사이트</a><a href="/#contact">문의</a></nav></div></header>`;
}

function siteFooter() {
  return `<footer class="site-footer"><div class="footer-bottom container"><p>© 2026 ITING Communications Inc.</p><p><a href="/privacy.html">개인정보처리방침</a> · <a href="/terms.html">이용약관</a></p></div></footer>`;
}

const articlePath = (article) => article.isDraft ? `/blog/review/${article.meta.slug}/` : `/blog/${article.meta.slug}/`;

function articlePage(article) {
  const { meta, body, isDraft } = article;
  const canonical = `${siteUrl}/blog/${meta.slug}/`;
  const modified = meta.updated || meta.published;
  const sources = meta.sources.map((entry) => {
    const [label, url] = entry.split(/\s\|\s/, 2);
    return `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></li>`;
  }).join('');
  const schema = isDraft ? '' : `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: meta.title,
    description: meta.description, datePublished: meta.published, dateModified: modified,
    inLanguage: 'ko-KR', mainEntityOfPage: canonical,
    author: { '@type': 'Organization', name: meta.author, url: siteUrl },
    publisher: { '@type': 'Organization', name: 'ITING Communications Inc.', logo: { '@type': 'ImageObject', url: `${siteUrl}/assets/logo.png` } },
  }).replaceAll('<', '\\u003c')}</script>`;
  const robots = isDraft ? 'noindex,nofollow,noarchive' : 'index,follow,max-snippet:-1,max-image-preview:large';
  const canonicalLink = isDraft ? '' : `<link rel="canonical" href="${canonical}">`;
  const articleMeta = isDraft
    ? '<span class="review-badge">검토용 초안 · 공개 금지</span>'
    : `<time datetime="${meta.published}">${meta.published}</time>${meta.updated ? `<span>업데이트 <time datetime="${meta.updated}">${meta.updated}</time></span>` : ''}`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#02103a"><title>${escapeHtml(meta.title)} | ITING Insights</title><meta name="description" content="${escapeHtml(meta.description)}"><meta name="author" content="${escapeHtml(meta.author)}"><meta name="robots" content="${robots}">${canonicalLink}<meta property="og:type" content="article"><meta property="og:site_name" content="ITING Communications"><meta property="og:title" content="${escapeHtml(meta.title)}"><meta property="og:description" content="${escapeHtml(meta.description)}"><meta property="og:image" content="${siteUrl}/assets/logo.png">${isDraft ? '' : `<meta property="og:url" content="${canonical}"><meta property="article:published_time" content="${meta.published}"><meta property="article:modified_time" content="${modified}">`}<meta property="article:section" content="${escapeHtml(meta.category)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@Itingcomms"><link rel="icon" href="/favicon.png"><link rel="stylesheet" href="/css/styles.css">${schema}</head><body>${siteHeader()}<main class="article container"><a class="svc-link" href="/blog/">← 인사이트</a><p class="kicker">${escapeHtml(meta.category)}</p><h1>${escapeHtml(meta.title)}</h1><p class="article-dek">${escapeHtml(meta.description)}</p><div class="blog-meta"><span>${escapeHtml(meta.author)}</span>${articleMeta}</div><article class="article-body">${renderMarkdown(body)}</article>${sources ? `<section class="article-sources"><h2>출처</h2><ol>${sources}</ol></section>` : ''}</main>${siteFooter()}</body></html>`;
}

function filterNav(active = 'all') {
  const items = [{ name: '전체', slug: 'all' }, ...categories];
  return `<nav class="blog-filters" aria-label="인사이트 카테고리">${items.map((item) => {
    const href = item.slug === 'all' ? '/blog/' : `/blog/category/${item.slug}/`;
    return `<a class="blog-filter${active === item.slug ? ' is-active' : ''}" href="${href}"${active === item.slug ? ' aria-current="page"' : ''}>${escapeHtml(item.name)}</a>`;
  }).join('')}</nav>`;
}

function articleList(articles) {
  if (!articles.length) return '<div class="blog-empty"><strong>아직 공개된 글이 없습니다.</strong><p>검토와 출처 확인을 마친 글부터 게시합니다.</p></div>';
  return `<div class="blog-list">${articles.map((article) => {
    const { meta, isDraft } = article;
    return `<article class="blog-row"><div class="blog-row-copy"><div class="blog-meta"><span>${escapeHtml(meta.category)}</span>${isDraft ? '<span class="review-badge">검토용 초안</span>' : `<time datetime="${meta.published}">${meta.published}</time>`}</div><h2><a href="${articlePath(article)}">${escapeHtml(meta.title)}</a></h2><p>${escapeHtml(meta.description)}</p><a class="svc-link" href="${articlePath(article)}">글 읽기 →</a></div><div class="blog-row-mark" aria-hidden="true"><span>ITING</span><strong>INSIGHT</strong></div></article>`;
  }).join('')}</div>`;
}

function blogShell({ articles, active = 'all', title, description, isReview = false }) {
  const robots = isReview ? '<meta name="robots" content="noindex,nofollow,noarchive">' : '<meta name="robots" content="index,follow">';
  const canonicalPath = active === 'all' ? '/blog/' : `/blog/category/${active}/`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#02103a"><title>${escapeHtml(title)} | ITING Insights</title><meta name="description" content="${escapeHtml(description)}">${robots}${isReview ? '' : `<link rel="canonical" href="${siteUrl}${canonicalPath}">`}<link rel="alternate" type="application/rss+xml" title="ITING Insights" href="/feed.xml"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">${isReview ? '' : `<meta property="og:url" content="${siteUrl}${canonicalPath}">`}<meta property="og:image" content="${siteUrl}/assets/logo.png"><link rel="icon" href="/favicon.png"><link rel="stylesheet" href="/css/styles.css"></head><body>${siteHeader()}${isReview ? '<div class="review-ribbon">PRIVATE REVIEW · 공개 전 초안 포함</div>' : ''}<section class="blog-profile"><div class="container blog-profile-inner"><div><p class="kicker">ITING INSIGHTS</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div><div class="blog-profile-seal" aria-hidden="true">ITING</div></div></section><main class="container blog-shell">${filterNav(active)}${articleList(articles)}</main>${siteFooter()}</body></html>`;
}

function latestSection(articles) {
  const latest = articles.slice(0, 3);
  const body = latest.length ? `<div class="home-insight-list">${latest.map((article) => `<article class="home-insight-card"><div class="blog-meta"><span>${escapeHtml(article.meta.category)}</span>${article.isDraft ? '<span class="review-badge">검토용 초안</span>' : `<time datetime="${article.meta.published}">${article.meta.published}</time>`}</div><h3><a href="${articlePath(article)}">${escapeHtml(article.meta.title)}</a></h3><p>${escapeHtml(article.meta.description)}</p><a class="svc-link" href="${articlePath(article)}">글 읽기 →</a></article>`).join('')}</div>` : '<div class="blog-empty"><strong>아직 공개된 글이 없습니다.</strong><p>검토와 출처 확인을 마친 글부터 게시합니다.</p></div>';
  return `<!-- BLOG_LATEST_START -->\n<section class="section home-insights" id="insights" aria-labelledby="insights-h2"><div class="container"><p class="kicker">ITING INSIGHTS</p><h2 id="insights-h2">최신 인사이트</h2>${body}<p class="home-insights-more"><a class="svc-link" href="/blog/">모든 인사이트 보기 →</a></p></div></section>\n<!-- BLOG_LATEST_END -->`;
}

function renderEnglish(source, file) {
  let html = source.replace(/<html lang="ko"[^>]*>/, '<html lang="en">');
  html = html.replace(/<([a-z][a-z0-9]*)([^>]*\sdata-en="([^"]*)"[^>]*)>[\s\S]*?<\/\1>/gi, (_, tag, attrs, english) => `<${tag}${attrs}>${english}</${tag}>`);
  html = html.replace(/<meta([^>]*?)data-en="([^"]*)"([^>]*?)>/gi, (_, before, english, after) => {
    const attrs = `${before}${after}`.replace(/\scontent="[^"]*"/i, '');
    return `<meta${attrs} content="${english}">`;
  });
  html = html.replace(/alt="[^"]*"\s+data-en-alt="([^"]*)"/g, 'alt="$1" data-en-alt="$1"');
  html = html.replace('content="ko_KR"', 'content="en_US"');
  if (file === 'index.html') {
    html = html.replace('<link rel="canonical" href="https://www.itingcomms.com/">', '<link rel="canonical" href="https://www.itingcomms.com/en/">');
    html = html.replace('<meta property="og:url" content="https://www.itingcomms.com/">', '<meta property="og:url" content="https://www.itingcomms.com/en/">');
    html = html.replace('href="/en/" hreflang="en" lang="en" aria-label="View this page in English">EN</a>', 'href="/" hreflang="ko" lang="ko" aria-label="이 페이지를 한국어로 보기">KO</a>');
    html = html.replaceAll('href="/privacy.html"', 'href="/en/privacy.html"').replaceAll('href="/terms.html"', 'href="/en/terms.html"');
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
  return { published, drafts, all };
}

async function buildBlog({ published, drafts, all }) {
  const blogDir = path.join(outputRoot, 'blog');
  let previous = [];
  try { previous = JSON.parse(await readFile(manifestPath, 'utf8')).slugs || []; } catch {}
  const publishedSlugs = published.map(({ meta }) => meta.slug);
  for (const slug of previous) if (!publishedSlugs.includes(slug)) await rm(path.join(blogDir, slug), { recursive: true, force: true });

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
  await writeFile(manifestPath, JSON.stringify({ slugs: publishedSlugs }, null, 2) + '\n');
}

async function injectHomepage(articles) {
  const indexPath = path.join(outputRoot, 'index.html');
  const source = await readFile(indexPath, 'utf8');
  if (!source.includes('<!-- BLOG_LATEST_START -->')) throw new Error('Homepage blog markers are missing');
  await writeFile(indexPath, source.replace(/<!-- BLOG_LATEST_START -->[\s\S]*?<!-- BLOG_LATEST_END -->/, latestSection(articles)));
}

async function buildDiscovery(published) {
  const today = new Date().toISOString().slice(0, 10);
  const staticUrls = ['/', '/en/', '/blog/', ...categories.map(({ slug }) => `/blog/category/${slug}/`), '/privacy.html', '/en/privacy.html', '/terms.html', '/en/terms.html'];
  const urls = staticUrls.map((url) => `  <url><loc>${siteUrl}${url}</loc><lastmod>${today}</lastmod></url>`);
  for (const { meta } of published) urls.push(`  <url><loc>${siteUrl}/blog/${meta.slug}/</loc><lastmod>${meta.updated || meta.published}</lastmod></url>`);
  await writeFile(path.join(outputRoot, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

  const items = published.map(({ meta }) => `<item><title>${escapeHtml(meta.title)}</title><link>${siteUrl}/blog/${meta.slug}/</link><guid isPermaLink="true">${siteUrl}/blog/${meta.slug}/</guid><pubDate>${new Date(`${meta.published}T00:00:00+09:00`).toUTCString()}</pubDate><description>${escapeHtml(meta.description)}</description><category>${escapeHtml(meta.category)}</category></item>`).join('\n');
  await writeFile(path.join(outputRoot, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>ITING Insights</title><link>${siteUrl}/blog/</link><atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/><description>ITING Communications company news, GEO, AX, and AI trends.</description><language>ko-KR</language>${items}</channel></rss>\n`);
}

await copyReviewBase();
const articles = await readArticles();
await buildBlog(articles);
await injectHomepage(reviewFlag ? articles.all : articles.published);
await buildLocales();
await buildDiscovery(articles.published);
console.log(`Built ${reviewFlag ? 'private review' : 'public'} site with ${articles.published.length} published and ${articles.drafts.length} draft post(s) at ${outputRoot}.`);
