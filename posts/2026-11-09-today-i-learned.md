---
date: 2026-11-09
title: 오늘 배운 것
source: my-blog 제작 경험 정리 (사용자 요청)
tags: [html, css, javascript, blog, claude-code]
description: 클로드 코드로 블로그를 만들며 정리한 HTML·CSS·JavaScript의 역할
---

클로드 코드와 함께 프레임워크 없이 이 블로그를 만들었다. 만들면서 웹 페이지를 이루는 세 가지 기술이 각각 무슨 일을 하는지 정리해 본다.

## 한눈에 보기

| 기술 | 역할 | 비유 | 이 블로그에서 |
|---|---|---|---|
| HTML | 내용과 구조 | 뼈대 | 글 제목, 본문, 날짜 |
| CSS | 모양과 배치 | 옷 | 색, 글자 크기, 다크 모드 색 |
| JavaScript | 동작 | 근육 | 글 변환, 다크 모드 버튼 |

## HTML: 무엇이 있는가

HTML은 페이지에 **무엇이 있는지**를 적는다. 태그마다 의미가 있다.

- `<header>`, `<main>`, `<article>`: 페이지의 머리, 본문, 글 한 편
- `<time datetime="2026-11-09">`: 사람과 기계가 모두 읽을 수 있는 날짜
- `<html lang="ko">`: 이 페이지가 한국어라는 표시. 화면 낭독기가 이걸 보고 발음을 고른다
- `<meta name="viewport">`: 휴대폰이 화면을 억지로 축소해서 보여주지 않게 한다

의미에 맞는 태그를 쓰면 스타일이 없어도 글이 읽힌다.

## CSS: 어떻게 보이는가

CSS는 같은 HTML을 **어떻게 보여줄지** 정한다. 색은 변수로 모아 두고, 다크 모드에서는 변수 값만 바꾼다.

```css
:root { --bg: #ffffff; --fg: #1f2328; }
:root[data-theme="dark"] { --bg: #0d1117; --fg: #e6edf3; }
body { background: var(--bg); color: var(--fg); }
```

- `max-width: 68ch`: 한 줄이 너무 길면 읽기 힘들어서 본문 폭을 제한
- `clamp(16px, 1rem + 0.25vw, 18px)`: 화면 크기에 따라 글자 크기가 16~18px 사이에서 변함
- `overflow-x: auto`: 긴 코드와 표는 그 안에서만 옆으로 스크롤
- `@media (prefers-color-scheme: dark)`: 시스템이 다크 모드면 자동으로 어두운 색

## JavaScript: 무엇을 하는가

JavaScript는 **동작**을 맡는다. 이 블로그에서는 두 군데서 일한다.

1. 빌드할 때 (Node.js): `build.js`가 Markdown 글을 읽어 HTML 파일로 바꾼다
2. 브라우저에서: `theme.js`가 다크 모드 버튼을 누르면 테마를 바꾸고 `localStorage`에 기억한다

페이지가 그려지기 전에 저장된 테마를 먼저 적용하는 짧은 스크립트도 있다. 이게 없으면 다크 모드에서 새로고침할 때 화면이 잠깐 하얗게 번쩍인다.

## 셋이 만나는 순서

```
posts/*.md ──▶ build.js (JavaScript) ──▶ dist/*.html (HTML)
                                            ├── style.css (CSS): 모양
                                            └── theme.js (JavaScript): 다크 모드 버튼
```

## 배운 점

- 프레임워크 없이도 블로그 하나는 충분히 만들 수 있다
- 구조는 HTML, 모양은 CSS, 동작은 JavaScript. 역할을 나누면 고칠 곳을 찾기 쉽다
- 사용자가 쓴 글을 HTML로 바꿀 때는 `<`, `"` 같은 문자를 반드시 escape해야 한다. 안 그러면 글 속 내용이 스크립트로 실행될 수 있다. 실제로 코드 리뷰에서 이 문제를 찾아 고쳤다
