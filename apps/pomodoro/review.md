---
date: 2026-11-13
title: 뽀모도로 타이머 Review 결과
source: docs/agents/pomodoro-review.md 지침 + apps/pomodoro/spec.md 7절 체크리스트
tags: [my-blog, webapp, pomodoro, review, qa]
---

# 뽀모도로 타이머 — review

## 판정
**통과** (2차 검증. 1차의 문제 1은 수정 확인됨)

## 재검증 (2차, 문제 1만)
- 대상: `index.html:L189` `pause()` 첫 줄 `if (endAt - Date.now() <= 0) return finish();` (파일 215줄, 페이지 스크립트에 해당 줄 포함 실측)
- 재현(실측): 리셋 → `remaining=100` → 시작 → 180ms 뒤 일시정지 (`left=-82`, tick 전)
  - 결과: `finish` 1회, `phase=break`, `휴식 00:03`, 버튼 `시작`, 제목 `끝! · 휴식 시작`, `timer=false`
  - 오실레이터 1개: 0.100s 시작 → 0.501s 자연 종료 (끊김·재생 2회 없음). 소리 자체는 추정
- 일반 일시정지(실측): 1.6초 뒤 클릭 → `remaining=3383`, `00:04`·`시작`, 5초 대기 후에도 전환 0회, `beep=null`
- 콘솔 에러 0 (실측)
- 다른 항목은 다시 돌리지 않음 (변경은 1줄뿐, 아래 1차 결과 유지)

## 검증 환경 (1차)
- 대상: `apps/pomodoro/index.html` (2026-11-13 23:21 수정본)
- 서버: `python3 -m http.server -d apps/pomodoro 8765 --bind 127.0.0.1` → 검증 후 종료
- 브라우저: 내장 Browser pane (Chromium), `http://127.0.0.1:8765/?fast`
- 비프: 소리는 못 들음 → `ctx.createOscillator`를 감싸서 예약 시각(`start`)·종료 시각(`onended`)을 기록해 판단
- 주의: 첫 실행 중 사용자 클릭이 섞임(도구 알림). 이후 측정은 깨끗한 상태에서 다시 함

## spec 7절 체크리스트

| 항목 | 결과 | 근거 |
|---|---|---|
| `index.html` 1개, 외부 요청 0건 | 통과 | 실측: 네트워크에 `GET /?fast` 문서 요청만 4회(새로고침 횟수). 리소스 엔트리 0 |
| 콘솔 에러 0 | 통과 | 실측: 콘솔 로그 0건 |
| 시작 / 일시정지 / 재개 / 리셋 | 통과 | 실측: 1.6초 뒤 일시정지 → `remaining=3388`, 5초 대기해도 `00:04` 유지·전환 없음. 재개 → 새 비프 +3.388초 예약. 리셋 → `00:05`, 제목 기본값, `beep=null` |
| `?fast` 집중→휴식→집중, 전환 후 정지 | 통과 | 실측: `00:01 → 휴식 00:03`(버튼 `시작`, 정지) → 재시작 → `00:01 → 집중 00:05`(정지) |
| 단계 끝 비프 1회, 탭 제목 변경 | 통과 (1차 예외 1건 → 문제 1, 2차에서 수정 확인) | 실측: 오실레이터 1개, 51.816s 시작 → 52.218s 자연 종료. 제목 `끝! · 휴식 시작` / `끝! · 집중 시작`. 소리 자체는 추정 |
| 백그라운드 탭에서 비프 제때 | 확인 불가 (코드상 통과 추정) | 새 탭을 앞에 띄워도 `visibilityState`가 `visible`로 유지돼 숨김 상태 재현 실패. 코드: 비프를 `ctx.currentTime + 남은초`에 예약 → 타이머 지연과 무관 (추정) |
| 일시정지·리셋 후 예약 비프 안 울림 | 통과 | 실측(JS): 일시정지 시 예약 31.54s 오실레이터가 28.15s에 `ended`(시작 전 종료). 리셋도 예약 40.88s → 38.51s `ended`. 소리는 추정 |
| 다른 탭 갔다 오면 시간 일치 | 확인 불가 (코드상 통과 추정) | 숨김 재현 실패. 코드: tick이 매번 `endAt - Date.now()`로 계산, `visibilitychange`에서 즉시 `tick()` (추정) |
| 0 아래 / 전환 2번 없음 | 통과 | 실측: `finish` 호출 횟수 계측 → 단계마다 1회. 표시는 `00:01` 다음 바로 다음 단계(음수·`-` 표시 없음). `fmt`에 `Math.max(0, …)` |
| 375px: 가로 스크롤 없음, 버튼 44px+ | 통과 | 실측(모바일 프리셋 375×812): `scrollWidth=375`, 시간 82.5px, 버튼 105×44 / 78×44 |
| 320×200: 잘림·스크롤 없음 | 통과 | 실측: `scrollWidth=320`, `scrollHeight=200`. 라벨 top 30, 버튼 bottom 170 (`일시정지` 글자 상태에서도). 간격 6.4px로 줄어듦 |
| 키보드만 조작, 노란 외곽선 | 통과 | 실측: Tab → `시작`에 `:focus-visible`, `rgb(255,225,77) solid 2px`, offset 3px. Enter로 시작, Tab → 리셋, Space로 리셋 |
| `prefers-reduced-motion`에서 움직임 없음 | 통과 (추정) | 도구에 reduced-motion 에뮬레이션 없음. 실측: 실행 중 애니메이션은 `color` transition 1개뿐, `@keyframes` 없음. `@media (prefers-reduced-motion: reduce) { * { transition: none !important } }` 존재 → 꺼질 것으로 추정 |
| 집중=pink / 휴식=cyan | 통과 | 실측: 시간 색 집중 `rgb(255,62,165)`, 휴식 `rgb(62,244,255)`. 정지 라벨 muted `rgb(139,147,201)` |
| 블로그 파일 변경 없음 | 통과 | 실측: `git status --short` 에 `M` 없음. 미추적 `posts/2026-11-1{1,2,3}-*.md`는 수정 시각 09:06(앱 작업 23:16 이전) → 이번 작업과 무관 |

## 문제 목록

남은 문제 없음. 아래는 1차 기록 (해결됨).

| # | 위치 | 문제 | 고칠 방법 |
|---|---|---|---|
| 1 (해결) | `index.html:L188-L194` (`pause`) | 0초가 지난 뒤 다음 tick(최대 250ms) 전에 일시정지를 누르면 전환이 안 되고 `00:00`·`시작` 상태로 멈춤. 이미 울리던 비프를 중간에 끊고, 다시 시작하면 비프가 **한 번 더** 울린 뒤 전환됨. 실측: `remaining=100`으로 재현 → 오실레이터 2개(0.10s 시작→0.187s 끊김, 0.181s 시작→0.581s 종료) | `pause()` 맨 앞에 `if (endAt - Date.now() <= 0) return finish();` 추가 |

## 확인하지 못한 것
- 실제 소리 (들을 수 없음. 오실레이터 예약·종료 시각으로만 판단)
- 숨긴 탭 상태 (Browser pane에서 `visibilityState=hidden` 유지 재현 실패) → 백그라운드 비프·복귀 후 시간 일치는 코드 추정
- `prefers-reduced-motion` 실제 에뮬레이션 (도구 미지원)
- Safari / iOS (`webkitAudioContext`, 백그라운드에서 AudioContext `interrupted` 여부)
- 실제 25분 모드 (빠른 모드만 실행)
- 스크린리더 실제 낭독 (`aria-live="polite"` 존재만 확인)

## 관련
- `apps/pomodoro/spec.md` — 기준 체크리스트(7절)
- `docs/agents/pomodoro-review.md` — 이 문서의 작성 지침
