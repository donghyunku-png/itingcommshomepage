# ITING Communications — Official Website

[itingcomms.com](https://itingcomms.com) 의 공식 홈페이지 소스 코드입니다. 한국어가 기본이며 우상단 토글로 영어 전환을 지원합니다.

> 아이팅커뮤니케이션즈는 디지털 광고 대행, 자체 GEO 플랫폼 [AENOMIZE](https://www.aenomize.com), 전시·행사·이스포츠 운영 대행을 통합 제공하는 종합 마케팅 회사입니다.

---

## 🧭 사이트 구성

| 섹션 | 설명 |
|---|---|
| Hero | "AI 시대의 진정한 성장 파트너" |
| 사업 영역 ① | **디지털 광고 + 플랫폼 개발 (IT 연동)** |
| 사업 영역 ② | **GEO 플랫폼 AENOMIZE** — 5대 AI 엔진 모니터링 · 97룰 스코어링 |
| 사업 영역 ③ | **전시·행사·이스포츠 대행** — Riot / PUBG / Nexon / KEPCO 등 |
| References | 이벤트 · 디지털 광고 · IT/GEO 클라이언트 |
| About | CEO · 기술 스택 · 차별점 |
| Media | YouTube 임베드 · SNS 6종 (YouTube · Instagram · X · Facebook · Threads · AENOMIZE) |
| FAQ | 7개 Q&A (FAQPage Schema 적용) |
| Contact | 문의 폼 (HubSpot webhook + mailto fallback) |

## 📦 디렉터리 구조

```
HOMEPAGE/
├── index.html          # 메인 페이지
├── privacy.html        # 개인정보처리방침
├── terms.html          # 이용약관
├── 404.html            # (선택)
├── llms.txt            # AI 크롤러 가이드
├── robots.txt
├── sitemap.xml
├── feed.xml            # RSS 피드
├── favicon.png
├── assets/
│   └── logo.png
├── css/
│   └── styles.css
└── js/
    └── main.js
```

## 🌐 SEO / GEO 적용 사항

- ✅ Title 30자 이상, Meta description 70~160자
- ✅ Canonical · hreflang(ko/en/x-default) · og:description · og:image:alt
- ✅ Schema.org JSON-LD: `Organization`, `WebSite`, `BreadcrumbList`, `FAQPage`, `Service`
- ✅ 단일 H1 + H2/H3 계층 (skipping 없음)
- ✅ 질문형 H2/H3 비율 44% (목표 20% 이상)
- ✅ AI 추출 트리거 ("요약하면", "핵심은", "정리하면", "결론적으로") 18회
- ✅ 데이터 표 2종 (97룰 구성·요금제) + 전문가 인용 blockquote (KDD 2024)
- ✅ 모든 `<img>` alt 텍스트 (한·영 토글)
- ✅ `llms.txt` (AI 크롤러 가이드) · `robots.txt` (GPTBot · ClaudeBot · PerplexityBot 명시 허용)
- ✅ `sitemap.xml` · RSS `feed.xml`
- ✅ `<meta name="author">` 명시

## 🌍 다국어

- 기본: 한국어 (`lang="ko"`)
- 토글: 우상단 `KO/EN` 버튼 → `localStorage`에 저장
- URL 파라미터: `?lang=en` / `?lang=ko` 지원

모든 번역은 `data-ko` / `data-en` 속성으로 인라인 관리되며, `js/main.js`의 `applyLanguage()`가 런타임에 교체합니다.

## 📞 Contact 폼 / CRM 연동

`js/main.js`는 두 단계 fallback 전략을 사용합니다.

1. **CRM webhook** — `window.ITING_CRM_ENDPOINT` 가 정의되어 있으면 해당 URL로 JSON POST.
2. **mailto fallback** — webhook 미설정 또는 실패 시 `sales@itingcomms.com` 으로 메일 클라이언트 자동 작성.

HubSpot Forms 연동 예시 (HTML `<head>` 또는 별도 `config.js`):

```html
<script>
  window.ITING_CRM_ENDPOINT = 'https://api.hsforms.com/submissions/v3/integration/submit/<portal-id>/<form-guid>';
</script>
```

## 🔧 로컬 실행

순수 정적 파일이라 별도 빌드가 필요 없습니다.

```bash
# Python
python3 -m http.server 8080

# 또는 npx serve
npx serve .
```

브라우저에서 `http://localhost:8080` 접속.

## 🚀 배포

정적 호스팅이면 어디든 가능합니다.

| 호스팅 | 방법 |
|---|---|
| **Vercel** | `vercel --prod` (또는 GitHub 연동) |
| **Netlify** | drag-and-drop 또는 GitHub 연동 |
| **Cloudflare Pages** | GitHub 연동 → build command 비움 → output directory `/` |
| **GitHub Pages** | repo Settings → Pages → branch `main` / `/` |

## 📝 라이선스

비공개 / 사내용. 자세한 내용은 [LICENSE](./LICENSE) 참조.

## 📮 Contact

- Email: <sales@itingcomms.com>
- Site: <https://itingcomms.com>
- AENOMIZE: <https://www.aenomize.com>
- YouTube: <https://www.youtube.com/@ItingCommunications>
- Instagram: <https://www.instagram.com/itingcomms/>
- X (Twitter): <https://x.com/Itingcomms>
- Facebook: <https://www.facebook.com/profile.php?id=61589024904957>
- Threads: <https://www.threads.com/@itingcomms>

---

© 2026 ITING Communications Inc. All rights reserved.
