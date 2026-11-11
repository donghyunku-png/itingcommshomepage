import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const site = 'https://www.itingcomms.com';
const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const org = { '@type': 'Organization', '@id': `${site}/#organization`, name: 'ITING Communications Inc.', alternateName: ['주식회사 아이팅커뮤니케이션즈', '아이팅커뮤니케이션즈', 'ITING Communications'], url: `${site}/`, logo: `${site}/assets/logo.png`, email: 'sales@itingcomms.com', address: { '@type': 'PostalAddress', addressLocality: 'Yeonsu-gu', addressRegion: 'Incheon', addressCountry: 'KR' } };
const officialSources = [
  ['Google Search Central: AI features and your website', 'https://developers.google.com/search/docs/appearance/ai-features'],
  ['OpenAI: Overview of OpenAI Crawlers', 'https://developers.openai.com/api/docs/bots'],
  ['Anthropic: Crawlers and site-owner controls', 'https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler'],
  ['Perplexity: Crawlers', 'https://docs.perplexity.ai/docs/resources/perplexity-crawlers'],
];
const list = items => `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;

function shell({locale, localPath, title, description, body, schemas = []}) {
  const en = locale === 'en';
  const prefix = en ? '/en' : '';
  const url = `${site}${prefix}${localPath}`;
  const home = `${prefix}/`;
  const graph = [org, { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description, inLanguage: en ? 'en' : 'ko-KR', isPartOf: { '@id': `${site}/#website` }, about: { '@id': org['@id'] } }, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: en ? 'Home' : '홈', item: `${site}${home}` }, ...(localPath.startsWith('/services/') && localPath !== '/services/' ? [{ '@type': 'ListItem', position: 2, name: en ? 'Services' : '서비스', item: `${site}${prefix}/services/` }] : []), { '@type': 'ListItem', position: localPath.startsWith('/services/') && localPath !== '/services/' ? 3 : 2, name: title, item: url }] }, ...schemas];
  return `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#02103a"><title>${esc(title)} | ITING Communications</title><meta name="description" content="${esc(description)}"><meta name="author" content="ITING Communications"><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"><link rel="canonical" href="${url}"><link rel="alternate" hreflang="ko" href="${site}${localPath}"><link rel="alternate" hreflang="en" href="${site}/en${localPath}"><link rel="alternate" hreflang="x-default" href="${site}${localPath}"><meta property="og:type" content="website"><meta property="og:site_name" content="ITING Communications"><meta property="og:locale" content="${en ? 'en_US' : 'ko_KR'}"><meta property="og:locale:alternate" content="${en ? 'ko_KR' : 'en_US'}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${site}/assets/logo.png"><meta name="twitter:card" content="summary"><meta name="twitter:site" content="@Itingcomms"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${site}/assets/logo.png"><link rel="icon" href="/favicon.png"><link rel="stylesheet" href="/css/styles.css"><script type="application/ld+json">${json({'@context':'https://schema.org','@graph':graph})}</script></head>
<body class="service-page"><a class="skip-link" href="#main">${en ? 'Skip to content' : '본문 바로가기'}</a><header class="site-header"><div class="container header-inner"><a class="brand" href="${home}"><img src="/assets/logo.png" alt="" width="38" height="38"><span class="brand-name">ITING Communications</span></a><nav class="service-nav" aria-label="${en ? 'Main navigation' : '주 메뉴'}"><a href="${prefix}/services/">${en ? 'Services' : '서비스'}</a><a href="${prefix}/about/">${en ? 'About' : '회사 소개'}</a><a href="${prefix}/blog/">${en ? 'Insights' : '인사이트'}</a><a href="${prefix}/#contact">${en ? 'Contact' : '문의'}</a></nav><a class="lang-toggle" href="${en ? localPath : `/en${localPath}`}" hreflang="${en ? 'ko' : 'en'}" lang="${en ? 'ko' : 'en'}">${en ? 'KO' : 'EN'}</a></div></header>
<main id="main"><nav class="breadcrumbs container" aria-label="${en ? 'Breadcrumb' : '현재 위치'}"><ol><li><a href="${home}">${en ? 'Home' : '홈'}</a></li>${localPath.startsWith('/services/') && localPath !== '/services/' ? `<li><a href="${prefix}/services/">${en ? 'Services' : '서비스'}</a></li>` : ''}<li aria-current="page">${esc(title)}</li></ol></nav>${body}</main><footer class="site-footer"><div class="container service-footer"><p><strong>ITING Communications Inc.</strong><br>${en ? 'Yeonsu-gu, Incheon, Republic of Korea' : '주식회사 아이팅커뮤니케이션즈 · 인천광역시 연수구'}<br><a href="mailto:sales@itingcomms.com">sales@itingcomms.com</a></p><nav aria-label="${en ? 'Footer' : '하단 메뉴'}"><a href="${prefix}/about/">${en ? 'About' : '회사 소개'}</a><a href="${prefix}/services/">${en ? 'Services' : '서비스'}</a><a href="${prefix}/privacy.html">${en ? 'Privacy Policy' : '개인정보처리방침'}</a><a href="${prefix}/terms.html">${en ? 'Terms of Use' : '이용약관'}</a></nav></div><div class="footer-bottom container">© 2026 ITING Communications Inc.</div></footer></body></html>\n`;
}

export async function buildServicePages(root, outputRoot) {
  const {services, updated} = JSON.parse(await readFile(path.join(root, 'content/service-pages.json'), 'utf8'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated) || updated > new Date().toISOString().slice(0,10)) throw new Error('Service updated date must be a non-future ISO date');
  if (!Array.isArray(services) || !services.length || new Set(services.map(s=>s.slug)).size !== services.length) throw new Error('Service slugs must be unique');
  for (const service of services) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(service.slug) || !service.type) throw new Error('Service slug and type are required');
    for (const locale of ['ko','en']) {
      const d = service[locale];
      for (const key of ['name','title','description','intro','fit','note']) if (!d || typeof d[key] !== 'string' || !d[key].trim()) throw new Error(`${service.slug}/${locale}: missing ${key}`);
      for (const key of ['scope','deliverables']) if (!Array.isArray(d[key]) || !d[key].length || d[key].some(v=>typeof v!=='string'||!v.trim())) throw new Error(`${service.slug}/${locale}: invalid ${key}`);
      for (const key of ['steps','faqs','articles']) if (!Array.isArray(d[key]) || !d[key].length || d[key].some(v=>!Array.isArray(v)||v.length!==2||v.some(x=>typeof x!=='string'||!x.trim()))) throw new Error(`${service.slug}/${locale}: invalid ${key}`);
    }
  }
  const paths = [];
  async function save(locale, localPath, html) {
    const pathname = `${locale === 'en' ? '/en' : ''}${localPath}`;
    const directory = path.join(outputRoot, pathname);
    await mkdir(directory, {recursive:true});
    await writeFile(path.join(directory, 'index.html'), html);
    paths.push(pathname);
  }
  for (const locale of ['ko','en']) {
    const en = locale === 'en';
    const prefix = en ? '/en' : '';
    const cards = services.map(s => `<article class="svc-card"><p class="kicker">${s.slug === 'geo-marketing' ? 'GEO INSIDE' : s.slug === 'performance-marketing' ? 'PERFORMANCE' : 'EVENTS'}</p><h2><a href="${prefix}/services/${s.slug}/">${esc(s[locale].name)}</a></h2><p>${esc(s[locale].description)}</p><a class="svc-link" href="${prefix}/services/${s.slug}/">${en ? 'Scope and process' : '업무 범위와 진행 방식'} →</a></article>`).join('');
    const hubTitle = en ? 'GEO, performance marketing, and events' : 'GEO 마케팅·퍼포먼스 마케팅·행사';
    const hubDescription = en ? 'Explore ITING Communications services, process, deliverables, and FAQs for GEO Inside, digital advertising, and event planning and operations.' : '아이팅커뮤니케이션즈의 GEO Inside, 디지털 광고, 행사 기획·운영의 업무 범위·진행 방식·결과물·FAQ를 확인하세요.';
    await save(locale, '/services/', shell({locale, localPath:'/services/',title:hubTitle,description:hubDescription,body:`<section class="section service-intro container"><p class="kicker">ITING SERVICES</p><h1>${hubTitle}</h1><p class="lead">${hubDescription}</p><div class="service-grid">${cards}</div><p class="evidence-note">${en ? 'Each engagement is scoped and priced after consultation. We do not guarantee AI recommendations, rankings, or commercial results.' : '각 과업의 범위와 가격은 상담 후 정합니다. AI 추천·순위 또는 사업 성과를 보장하지 않습니다.'}</p></section>`,schemas:[{'@type':'ItemList',itemListElement:services.map((s,i)=>({'@type':'ListItem',position:i+1,name:s[locale].name,url:`${site}${prefix}/services/${s.slug}/`}))}]}));
    for (const service of services) {
      const d = service[locale];
      const localPath = `/services/${service.slug}/`;
      const url = `${site}${prefix}${localPath}`;
      const schemas = [{ '@type': 'Service', '@id': `${url}#service`, name:d.name, serviceType:service.type, description:d.description, url, provider:{'@id':org['@id']} }, {'@type':'FAQPage','@id':`${url}#faq`,inLanguage:locale,mainEntity:d.faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}];
      const body = `<section class="section service-intro container"><p class="kicker">ITING SERVICES</p><h1>${esc(d.name)}</h1><p class="service-answer">${esc(d.intro)}</p><p class="service-fit">${esc(d.fit)}</p><div class="service-actions"><a class="btn primary" href="${prefix}/#contact">${en ? 'Discuss your project' : '프로젝트 상담하기'}</a><a class="svc-link" href="#scope">${en ? 'Explore the scope' : '업무 범위 살펴보기'} ↓</a></div><p class="service-updated">${en ? 'Information reviewed' : '안내 내용 점검'}: <time datetime="${updated}">${updated}</time> · ITING Communications</p></section>
<section class="section service-detail container" id="scope"><h2>${en ? 'What we work on' : '함께 다루는 업무'}</h2>${list(d.scope)}<div class="service-callout"><h3>${en ? 'Scope and conditions' : '범위와 조건'}</h3><p>${esc(d.note)}</p></div></section>
<section class="section service-detail service-process container" id="process"><h2>${en ? 'How a project proceeds' : '프로젝트 진행 방식'}</h2><ol class="process-list">${d.steps.map(([t,b],i)=>`<li><span class="process-number" aria-hidden="true">0${i+1}</span><div><h3>${esc(t)}</h3><p>${esc(b)}</p></div></li>`).join('')}</ol><h3>${en ? 'Deliverables to agree during consultation' : '상담에서 확정할 주요 결과물'}</h3>${list(d.deliverables)}</section>
<section class="section service-detail container" id="faq"><h2>${en ? 'Frequently asked questions' : '자주 묻는 질문'}</h2>${d.faqs.map(([q,a])=>`<details class="faq-item"><summary>${esc(q)}</summary><div class="faq-body">${esc(a)}</div></details>`).join('')}</section>
<section class="section service-detail container"><h2>${en ? 'Related insights and sources' : '관련 인사이트와 근거'}</h2><ul class="service-links">${d.articles.map(([t,slug])=>`<li><a href="${prefix}/blog/${slug}/">${esc(t)} →</a></li>`).join('')}${service.slug === 'geo-marketing' ? officialSources.map(([t,u])=>`<li><a href="${u}" target="_blank" rel="noopener noreferrer">${esc(t)} ↗</a></li>`).join('') : ''}</ul><p>${en ? 'Published service information' : '서비스 소개 근거'}: <a href="${prefix}/blog/iting-communications-introduction/">${en ? 'ITING Communications introduction' : '아이팅커뮤니케이션즈 소개'}</a>. ${en ? 'Project-specific scope is confirmed during consultation.' : '실제 프로젝트 범위는 상담에서 확정합니다.'}</p></section>
<section class="section service-detail container"><h2>${en ? 'Connect the next step' : '다음 실행을 연결하세요'}</h2><p>${en ? 'Share your goals, preferred timing, and the support you need. We will discuss the scope before a proposal.' : '목표, 희망 일정과 필요한 업무를 알려주세요. 제안 전에 실행 범위부터 함께 정리합니다.'}</p><a class="btn primary" href="${prefix}/#contact">${en ? 'Contact ITING' : '아이팅에 문의하기'}</a><nav class="related-services" aria-label="${en ? 'Related services' : '다른 서비스'}">${services.filter(s=>s.slug!==service.slug).map(s=>`<a href="${prefix}/services/${s.slug}/">${esc(s[locale].name)} →</a>`).join('')}<a href="${prefix}/about/">${en ? 'About ITING' : '아이팅 소개'} →</a></nav></section>`;
      await save(locale, localPath, shell({locale,localPath,title:d.title,description:d.description,body,schemas}));
    }
    const aboutTitle = en ? 'About ITING Communications' : '아이팅커뮤니케이션즈 소개';
    const aboutDescription = en ? 'ITING Communications Inc. is a Korean marketing company connecting GEO Inside, digital advertising, content, and event planning and operations.' : '주식회사 아이팅커뮤니케이션즈는 GEO Inside, 디지털 광고, 콘텐츠와 행사 기획·운영을 연결하는 한국의 마케팅 회사입니다.';
    const aboutBody = `<section class="section service-intro container"><p class="kicker">ABOUT ITING</p><h1>${aboutTitle}</h1><p class="service-answer">${aboutDescription}</p><dl class="company-facts"><div><dt>${en ? 'Company' : '회사명'}</dt><dd>주식회사 아이팅커뮤니케이션즈<br>ITING Communications Inc.</dd></div><div><dt>${en ? 'Location' : '소재지'}</dt><dd>${en ? 'Yeonsu-gu, Incheon, Republic of Korea' : '인천광역시 연수구'}</dd></div><div><dt>${en ? 'Contact' : '문의'}</dt><dd><a href="mailto:sales@itingcomms.com">sales@itingcomms.com</a></dd></div><div><dt>${en ? 'Platform' : '자체 플랫폼'}</dt><dd><a href="https://geoinside.ai/" target="_blank" rel="noopener noreferrer">GEO Inside ↗</a></dd></div></dl></section><section class="section service-detail container"><h2>${en ? 'Three connected service areas' : '함께 연결하는 세 가지 전문 영역'}</h2><div class="service-grid">${cards}</div></section><section class="section service-detail container"><h2>${en ? 'How we publish information' : '공개 정보의 기준'}</h2>${list(en ? ['Describe service scope and limitations without promising AI mentions, rankings, or revenue.', 'Use reference names only to identify approved references, without inventing project details, results, or endorsements.', 'Provide source links and publication or update dates for insights. AI-generated illustrations are identified as illustrations, not project evidence.'] : ['AI 언급·순위·매출을 약속하지 않고 서비스의 범위와 한계를 설명합니다.', '레퍼런스 회사명은 승인된 식별 용도로만 사용하며 구체적 수행 내용·성과·추천을 임의로 추가하지 않습니다.', '인사이트에는 출처 링크와 작성·업데이트 날짜를 표시합니다. AI 생성 이미지는 실제 수행 사진이나 성과 증거가 아닌 일러스트로 안내합니다.'])}<p><a class="svc-link" href="${prefix}/#references">${en ? 'View approved reference names' : '승인된 레퍼런스 회사명 보기'} →</a></p></section><section class="section service-detail container"><h2>${en ? 'Official channels' : '공식 채널'}</h2><ul class="service-links">${[['YouTube','https://www.youtube.com/@ItingCommunications'],['TikTok','https://www.tiktok.com/@itingcomms'],['Instagram','https://www.instagram.com/itingcomms/'],['X','https://x.com/Itingcomms'],['Facebook','https://www.facebook.com/profile.php?id=61589024904957'],['Threads','https://www.threads.com/@itingcomms']].map(([t,u])=>`<li><a href="${u}" target="_blank" rel="noopener noreferrer">${t} ↗</a></li>`).join('')}</ul><a class="btn primary" href="${prefix}/#contact">${en ? 'Discuss a project' : '프로젝트 상담하기'}</a></section>`;
    await save(locale, '/about/', shell({locale,localPath:'/about/',title:aboutTitle,description:aboutDescription,body:aboutBody,schemas:[{'@type':'AboutPage',mainEntity:{'@id':org['@id']}}]}));
  }
  const manifest = path.join(outputRoot, '.generated-services.json');
  let previous = [];
  try { previous = JSON.parse(await readFile(manifest,'utf8')).paths || []; } catch {}
  for (const old of previous) {
    if (!paths.includes(old) && /^\/(?:en\/)?services\/[a-z0-9-]+\/$/.test(old)) await rm(path.join(outputRoot,old),{recursive:true,force:true});
  }
  await writeFile(manifest,JSON.stringify({paths},null,2)+'\n');
  return paths;
}
