# ITING Communications website

[www.itingcomms.com](https://www.itingcomms.com/)의 정적 웹사이트 소스입니다. GitHub Pages의 기존 CNAME 배포 방식을 유지하며, 외부 패키지 없이 Node.js로 영문 페이지·블로그·RSS·sitemap을 생성합니다.

## 주요 페이지

- `/` — 한국어 홈페이지
- `/en/` — 서버에서 바로 읽을 수 있는 영문 홈페이지
- `/blog/` — 회사 소식, GEO, AX, AI 동향
- `/en/blog/` — 영문 인사이트 목록·카테고리·글
- `/privacy.html`, `/terms.html` — 정책 페이지
- `/llms.txt`, `/robots.txt`, `/sitemap.xml`, `/feed.xml` — 발견·배포 보조 파일

## 로컬 실행

```bash
npm run build
npm run check
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080`을 엽니다. 별도 의존성 설치는 필요 없습니다.

## 블로그 작성

작성 규칙은 [`content/blog/README.md`](content/blog/README.md)에 있습니다. 한국어 원문과 영문 번역을 한 쌍의 Markdown 파일로 관리하며, `draft: false`이고 필수 메타데이터 검증을 통과한 글만 독립 URL, 블로그 목록, RSS, sitemap에 생성됩니다.

비개발자 편집자는 템플릿을 `content/blog/<slug>.md`로 복사해 한국어 글을 작성하고, 같은 slug의 영문 번역을 `content/blog/en/<slug>.md`에 추가한 뒤 저장소 루트에서 아래 명령 하나를 실행하면 됩니다.

```bash
npm run build && npm run check
```

검증이 끝나면 `blog/<slug>/index.html`, `blog/index.html`, `feed.xml`, `sitemap.xml`, `en/`의 생성 결과를 원본 Markdown과 함께 검토·커밋합니다.

중요: 저장소가 공개되어 있으면 `draft: true`인 Markdown도 push된 순간 원문은 외부에서 읽을 수 있습니다. 승인 전 실제 초안은 커밋하거나 공개 브랜치에 push하지 마세요.

공개 전 초안을 포함한 로컬 검토본은 `npm run build:review`로 `/tmp/iting-site-review`에 생성합니다. 검토본은 초안 페이지에 `noindex`와 공개 금지 표식을 붙이며, 공개 RSS·sitemap에는 초안을 넣지 않습니다. 브라우저 CMS와 주 2회 자동 게시 기능은 아직 없으며, 승인된 Markdown을 공개 폴더로 옮긴 뒤 위 빌드·검사와 커밋이 필요합니다.

## 콘텐츠 원칙

- 제품·솔루션 공식 명칭은 `GEO Inside`입니다.
- GEO, 중국 GEO, 법무 GEO 가격은 공개하지 않고 상담 후 안내합니다.
- AI 언급, 인용, 순위, 문의, 매출을 보장하지 않습니다.
- 중국 서비스는 현지 실행 파트너와 범위를 협의하며, 중국 플랫폼을 GEO Inside 기본 측정 엔진으로 표시하지 않습니다.
- 레퍼런스는 승인된 회사명만 사용하고 임의의 범위·성과·추천사를 추가하지 않습니다.

## 배포

기존 GitHub Pages 연동과 `CNAME`의 `www.itingcomms.com`을 그대로 사용합니다. 별도 저장소 워크플로 파일은 없으며 GitHub의 내장 `pages-build-deployment`가 `main` 브랜치 push를 감지해 정적 파일을 배포합니다. Pages 쪽에서 이 Node 생성기를 대신 실행하지 않으므로, 반드시 위 명령으로 만든 결과 파일까지 커밋한 뒤 push해야 합니다. 이 저장소에는 배포 토큰이나 외부 CMS 인증 정보가 없습니다.

## 서비스 상세 페이지와 검색 검증

`content/service-pages.json`이 GEO·퍼포먼스 마케팅·행사 서비스의 한국어·영문 원본입니다. `scripts/build-service-pages.mjs`는 `/services/`, 서비스별 상세 URL과 `/about/`, 각각의 영문 페이지를 생성합니다. 생성 HTML을 직접 고치지 말고 원본과 생성기를 수정한 뒤 빌드하세요.

- `npm test`: 기본 사이트 검사, 문의 폼 단위 테스트, 40개 현재 sitemap 페이지의 canonical·hreflang·H1·내부 앵커·FAQ 본문 일치 검사, 이미지 렌더링·메타데이터 검사를 실행합니다.
- `sitemap.xml`의 글 수정일은 원문 날짜를 사용합니다. 정적 페이지의 신뢰할 만한 개별 변경일이 없으면 lastmod를 생략해 매번 최신 날짜로 오인시키지 않습니다.
- robots.txt의 검색 봇 명시는 허용 의도를 문서화합니다. 기존 wildcard도 이미 접근을 허용했으므로, 명시 항목 추가 자체를 차단 해제나 추천 보장으로 설명하지 않습니다. llms.txt 역시 보조 탐색 파일이며 필수 AI 검색 설정이 아닙니다.
- 배포 후 Google Search Console의 URL 검사와 sitemap 상태, Bing Webmaster Tools의 색인 상태 등을 계정 접근 권한 내에서 확인하세요. 공개 URL의 200 응답과 구조 검증은 실제 색인·AI 인용의 증거가 아닙니다.
- 모든 주장에 확인 가능한 출처·공개 승인 범위를 유지합니다. 구체적 고객 사례, 성과 수치와 추천사를 추가하려면 해당 근거와 공개 권한을 먼저 확인해야 합니다.

공식 참고: [Google AI features](https://developers.google.com/search/docs/appearance/ai-features), [OpenAI crawlers](https://developers.openai.com/api/docs/bots), [Anthropic crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler), [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers).
