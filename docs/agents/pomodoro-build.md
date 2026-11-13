---
date: 2026-11-13
title: Build 서브에이전트 지침 — 뽀모도로 타이머
source: 사용자 승인(2026-11-13, spec.md 기본값대로) + my-blog CLAUDE.md 작업 사이클 2단계(Build)
tags: [my-blog, webapp, pomodoro, build]
---

# Build 서브에이전트 지침 — 뽀모도로 타이머

## 역할
`apps/pomodoro/spec.md`대로 웹앱을 구현한다.

## 수정 범위 (이 파일만 생성)
- `apps/pomodoro/index.html` — 새로 만든다
- 그 외 파일은 읽기만 한다. `spec.md`, `CLAUDE.md`, `build.js`, `static/`, `posts/`, `dist/` 생성·수정·삭제 금지

## 확정 사항 (사용자 승인, 열린 질문은 기본값)
- 단계가 끝나면 다음 단계로 바꾸고 **정지 상태로 대기** (자동 시작 없음)
- 긴 휴식 없음
- iframe 높이 240px 기준 (최소 보장 320×200)
- `?fast` 모드 포함 (집중 5초 / 휴식 3초, 화면에 노출 안 함)

## 구현 규칙
- spec.md 2~6절을 그대로 따른다. "제외한 것"은 넣지 않는다
- HTML + `<style>` + `<script>` 인라인, 파일 1개. 외부 요청 0건 (CDN도 쓰지 않음)
- 시간은 `endAt` 기준 재계산. 0 미만 표시 금지, 단계 전환은 1회만
- 비프는 Web Audio 예약 재생, 일시정지·리셋 시 예약 취소
- 접근성: spec 6절 표 전부 (대비, `:focus-visible`, `prefers-reduced-motion`, `aria-live`, 44px 버튼)
- 주석은 "왜"가 필요한 곳만 한 줄

## 셀프 체크 (끝내기 전)
- `node -e` 등으로 `<script>` 문법 오류 없는지 확인 (예: 스크립트 부분을 추출해 `new Function(src)` 파싱)
- 브라우저 검증은 하지 않는다 → Review 서브에이전트가 따로 한다

## 끝나면
만든 파일 경로, 줄 수, spec과 다르게 한 점(있으면)만 짧게 보고한다.
