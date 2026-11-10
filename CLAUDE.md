# my-blog

Markdown 글(`posts/*.md`)을 정적 HTML 블로그(`dist/`)로 변환하는 프로젝트.

- 프레임워크·npm 의존성 없음. **HTML + CSS + JavaScript(Node 표준 라이브러리)만** 사용
- 디자인 목표: 밤거리 세로 네온 간판 콘셉트 (검은 배경 + 네온 글자), 읽기 좋음, 모바일 대응

---

## 1. 구조

```
my-blog/
├── CLAUDE.md
├── build.js          # md → html 변환 (파서·템플릿 포함, node: 모듈만)
├── build.test.js     # 파서 assert 검증 (node:assert)
├── posts/            # 원본 글 (사람 작성)
│   └── 2026-11-09-hello.md
├── static/
│   ├── style.css     # 전체 스타일 (네온 색 변수, JS 없음)
│   └── images/       # 글에서 쓰는 이미지
└── dist/             # 빌드 결과물 (생성물)
    ├── index.html    # 글 목록 (날짜 내림차순)
    ├── posts/<slug>.html
    └── static/       # static/ 복사본
```

## 2. 빌드 흐름

```
posts/*.md ──▶ front matter 파싱 ──▶ 필수값 검사 ──▶ md → HTML ──▶ 템플릿 적용 ──▶ dist/
                                        │
                                        └─ 누락 시 파일명과 함께 에러 종료 (조용히 건너뛰지 않음)
```

## 3. 명령어

| 용도 | 명령 |
|---|---|
| 빌드 | `node build.js` |
| 검증 | `node build.test.js` |
| 미리보기 | `python3 -m http.server -d dist 8000` → http://localhost:8000 |
| 배포 | `main`에 push → GitHub Actions(`.github/workflows/pages.yml`)가 테스트·빌드 후 Pages 배포 → https://alex0729.github.io/my-blog/ |

- 저장소: https://github.com/alex0729/my-blog (공개). 커밋 이메일은 GitHub noreply 주소 (이 저장소 `git config user.email`)
- 링크는 전부 상대 경로 → `/my-blog/` 하위 경로에서도 동작. 절대 경로(`/static/...`) 쓰지 않기

- 환경: Node v26, Python 3.9 (2026-11-09 실측)

## 4. 글 작성 규칙 (`posts/*.md`)

```yaml
---
date: 2026-11-09
title: 첫 글
tags: [blog, intro]
description: 목록·meta에 쓰는 한 줄 요약   # 선택
draft: true                                  # 선택. true면 빌드 제외
---
```

| 항목 | 규칙 |
|---|---|
| 필수 | `date`(`YYYY-MM-DD`) · `title` |
| 그 외 키 | 무시 (워크스페이스 규약의 `source` 등 넣어도 됨) |
| 형식 | 한 줄에 `key: value` 하나. 여러 줄 값·블록 목록(`- a`)은 에러. 따옴표 없는 값의 ` # 주석`은 제거 |
| `draft` | `true` / `false`만 (대소문자·따옴표 무관). 그 외 값은 에러 |
| slug 중복 | 대소문자·유니코드 정규화만 달라도 에러 (macOS 파일 시스템에서 덮어써짐) |
| 이미지 | `static/images/`에 두고 글에서 `../static/images/파일명`으로 참조. `data:` URL은 차단됨 |
| 파일명 | `YYYY-MM-DD-slug.md` → 출력 `dist/posts/slug.html` |
| 원본 보존 | 에이전트는 `posts/` 파일을 **수정하지 않음**. 변환·정리본이 필요하면 새 파일로 |

## 5. Markdown 지원 범위

| 지원 | 미지원 (escape된 원문으로 출력) |
|---|---|
| `#`~`######` 제목, 문단, 줄바꿈 | 원본 HTML 태그 |
| `**굵게**` `*기울임*` `` `코드` `` | 각주, 수식 |
| 펜스 코드 블록 ` ``` ` (백틱 4개 이상 가능, 언어 클래스만, 하이라이트 없음) | |
| 링크 `[t](url)` · 이미지 `![alt](src)` (URL 괄호 1단계, http·https·mailto·tel·상대경로만) | |
| `-` / `1.` 목록 (2단계까지, 더 깊으면 2단계로 표시, 들여쓴 다음 줄은 같은 항목, 시작 번호 유지), `>` 인용, `---` 구분선 | |
| 표 (`\|` 구문) | |

- 범위를 넓히면 `build.test.js`에 해당 케이스 assert 먼저 추가

## 6. 디자인 기준

**읽기 좋음**
- 본문 폭 `max-width: 68ch`, 가운데 정렬
- 글자 `font-size: clamp(16px, 1rem + 0.25vw, 18px)`, `line-height: 1.75` (한글 기준)
- 폰트: 시스템 스택만 (`-apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`). 웹폰트 로드 안 함
- 색 대비 WCAG AA 이상 (본문 4.5:1)

**네온 테마 (항상 검은 배경, 라이트 모드·테마 전환 없음)**
- 색은 전부 CSS 변수

| 변수 | 값 | 용도 |
|---|---|---|
| `--bg` | `#000000` | 배경 |
| `--fg` | `#c9f8ff` | 본문 (연한 시안) |
| `--bright` | `#f2feff` | 굵은 글씨 |
| `--muted` | `#8b93c9` | 설명·태그·인용 |
| `--pink` | `#ff3ea5` | 간판·링크·h3 |
| `--cyan` | `#3ef4ff` | 글 제목 |
| `--yellow` | `#ffe14d` | 날짜·h2·인라인 코드 |
| `--line` | `#3ef4ff4d` | 구분선·테두리 |

- 빛 효과(`text-shadow` 글로우)는 간판·글 제목·마우스 올린 링크에만. 본문에는 쓰지 않음
- 간판: 넓은 화면(760px 이상)은 왼쪽 고정 세로 간판(`writing-mode: vertical-rl`), 좁은 화면은 위쪽 가로 간판
- 움직임: 페이지를 열 때 간판이 한 번 깜빡이며 켜짐. `prefers-reduced-motion`이면 끔
- 날짜 표시는 `2026.11.09` (`datetime` 속성은 `2026-11-09`)

**모바일**
- `<meta name="viewport" content="width=device-width, initial-scale=1">`
- 좌우 여백 최소 16px, 가로 스크롤 금지
- `img { max-width: 100% }`, 코드 블록·표는 `overflow-x: auto` 래퍼
- 터치 대상 최소 44px

**접근성·시맨틱**
- `<html lang="ko">`, `header` / `main` / `article` / `time datetime>` 사용
- `:focus-visible` 스타일 유지, 이미지 `alt` 그대로 출력

## 7. 코드 규칙

- npm 패키지·CDN 라이브러리 추가 금지. 필요하면 사람에게 먼저 묻기
- 파일 수 최소. 템플릿은 `build.js` 안 템플릿 리터럴로
- 보안: 본문 텍스트는 HTML escape, 링크의 `javascript:` URL 차단
- `dist/`는 생성물 → 직접 편집 금지, `node build.js`로만 갱신
- 빌드는 매번 `dist/` 전체 재생성 (증분 빌드 없음)

## 8. 작업 완료 기준

1. `node build.test.js` 통과
2. `node build.js` 에러 없음
3. 미리보기에서 확인: 375px 폭 · 넓은 화면의 세로 간판 · 긴 코드 블록 · 표
