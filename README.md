# ITING Communications website

[www.itingcomms.com](https://www.itingcomms.com/)의 정적 웹사이트 소스입니다. GitHub Pages의 기존 CNAME 배포 방식을 유지하며, 외부 패키지 없이 Node.js로 영문 페이지·블로그·RSS·sitemap을 생성합니다.

## 주요 페이지

- `/` — 한국어 홈페이지
- `/en/` — 서버에서 바로 읽을 수 있는 영문 홈페이지
- `/blog/` — 회사 소식, GEO, AX, AI 동향
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

작성 규칙은 [`content/blog/README.md`](content/blog/README.md)에 있습니다. 한 글당 Markdown 파일 하나를 사용하며, `draft: false`이고 필수 메타데이터 검증을 통과한 글만 독립 URL, 블로그 목록, RSS, sitemap에 생성됩니다.

비개발자 편집자는 템플릿을 `content/blog/<slug>.md`로 복사해 글을 작성한 뒤 저장소 루트에서 아래 명령 하나를 실행하면 됩니다.

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
- 레퍼런스는 승인된 공식 로고만 사용하고 임의의 범위·성과·추천사를 추가하지 않습니다.

## 배포

기존 GitHub Pages 연동과 `CNAME`의 `www.itingcomms.com`을 그대로 사용합니다. 별도 저장소 워크플로 파일은 없으며 GitHub의 내장 `pages-build-deployment`가 `main` 브랜치 push를 감지해 정적 파일을 배포합니다. Pages 쪽에서 이 Node 생성기를 대신 실행하지 않으므로, 반드시 위 명령으로 만든 결과 파일까지 커밋한 뒤 push해야 합니다. 이 저장소에는 배포 토큰이나 외부 CMS 인증 정보가 없습니다.
