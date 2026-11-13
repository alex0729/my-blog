---
date: 2026-11-13
title: Review 서브에이전트 지침 — 뽀모도로 타이머
source: my-blog CLAUDE.md 작업 사이클 3단계(Review) + apps/pomodoro/spec.md 7절 체크리스트
tags: [my-blog, webapp, pomodoro, review]
---

# Review 서브에이전트 지침 — 뽀모도로 타이머

## 역할
Build 결과물을 **검증만** 한다. 코드는 고치지 않는다. 고칠 점은 review.md에 적고, 수정은 Build 쪽이 한다.

## 수정 범위 (이 파일만 생성)
- `apps/pomodoro/review.md` — 새로 만든다 (다시 검증할 때는 덮어쓴다)
- `apps/pomodoro/index.html`을 포함한 다른 파일은 읽기만 한다

## 검증 대상
- `apps/pomodoro/index.html`
- 기준: `apps/pomodoro/spec.md` (특히 7절 체크리스트) + `CLAUDE.md` 웹앱 규칙

## 방법
1. 코드 읽기: spec과 다른 점, 버그(0 미만 표시, 전환 2회, 일시정지 후 예약 비프 남음, 오디오 잠금), 접근성
2. 실제 브라우저: 로컬 서버로 띄워서 확인
   - `python3 -m http.server -d apps/pomodoro 8765 --bind 127.0.0.1` 을 백그라운드로 실행 (끝나면 반드시 종료)
   - 내장 브라우저 도구(`mcp__Claude_Browser__*`)로 `http://127.0.0.1:8765/?fast` 열기
   - 콘솔 에러, 네트워크 외부 요청, 시작/일시정지/리셋, 단계 전환, 탭 제목, 색 전환
   - 375px 폭(모바일 프리셋)과 320×200 크기, 키보드 포커스, `prefers-reduced-motion`
   - 끝나면 viewport를 desktop 프리셋으로 되돌린다
3. 소리는 직접 들을 수 없다 → 비프 예약·취소는 코드와 JS 실행(예: AudioContext 상태, 예약 노드 존재)으로 판단하고 "추정"으로 표기
4. `git -C . status --short`로 블로그 파일(`static/`, `build.js`, `posts/`, `CLAUDE.md`) 변경 없음 확인

## review.md 형식 (한국어, 짧게)
- YAML frontmatter: `date: 2026-11-13`, `title`, `source`, `tags`(4~5개 inline list)
- 판정 한 줄: `통과` 또는 `수정 필요`
- spec 7절 체크리스트 표: 항목 | 결과(통과/실패/확인 불가) | 근거(실측/추정)
- 문제 목록: 번호 · 위치(`index.html:L줄`) · 문제 · 고칠 방법 (구체적 사례가 있는 것만)
- 확인하지 못한 것

## 끝나면
판정과 문제 목록만 짧게 보고한다.
