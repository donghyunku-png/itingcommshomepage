# Blog authoring

`_template.md`를 복사해 한 글당 하나의 Markdown 파일을 만듭니다. 허용 카테고리는 `회사 소식`, `GEO`, `AX`, `AI 동향`입니다.

## 게시 순서

1. `title`, `slug`, `category`, `description`, `author`를 작성합니다.
2. 공개일은 `YYYY-MM-DD`, 수정일도 같은 형식으로 입력합니다.
3. 출처는 `sources:` 아래에 `- 출처명 | https://...` 형식으로 추가합니다.
4. 검토 전에는 반드시 `draft: true`로 둡니다.
5. 승인된 글만 `draft: false`로 바꾸고 `npm run build`를 실행합니다.
6. `npm run check`로 메타데이터, 내부 링크, sitemap, 금지된 과장 문구를 점검합니다.

`draft: true`인 글은 생성 페이지·블로그 목록·sitemap·RSS에서 제외됩니다. 그러나 이 저장소나 브랜치가 공개 상태라면, 초안 Markdown을 커밋하고 푸시하는 순간 원문 자체는 외부에서 읽을 수 있습니다. 승인 전 실제 초안은 Git에서 제외된 `content/blog/drafts/` 또는 별도 비공개 작업 공간에 보관하세요. 게시 승인이 끝난 뒤에만 상위 `content/blog/`로 옮깁니다.

비공개 검토본은 저장소 루트에서 `npm run build:review`를 실행하면 `/tmp/iting-site-review`에 생성됩니다. 이 명령은 초안을 `/blog/review/<slug>/` 아래에 `noindex` 페이지로 만들지만, 공개 빌드·RSS·sitemap에는 넣지 않습니다. 이 폴더는 검토용 산출물일 뿐이며 공개 호스팅에 업로드하면 안 됩니다.

이 저장소에는 인증형 CMS를 추가하지 않았습니다. 현재 방식은 별도 계정·OAuth·서버 없이 Git 이력으로 검토할 수 있는 대신, 게시 시 Markdown 편집과 빌드가 필요합니다.
