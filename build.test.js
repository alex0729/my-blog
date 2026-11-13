const test = require('node:test');
const assert = require('node:assert/strict');
const b = require('./build.js');

// --- Task 1: escape + front matter ---

test('escapeHtml', () => {
  assert.equal(b.escapeHtml(`<a href="x">'&'</a>`),
    '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});

test('parseFrontMatter: 문자열·배열·불리언·따옴표', () => {
  const { data, body } = b.parseFrontMatter('---\ntitle: "안녕"\ntags: [a, b]\ndraft: true\n---\n본문');
  assert.deepEqual(data, { title: '안녕', tags: ['a', 'b'], draft: true });
  assert.equal(body, '본문');
});

test('parseFrontMatter: 값 안의 콜론 유지', () => {
  assert.equal(b.parseFrontMatter('---\ntitle: 회고: 2026\n---\n').data.title, '회고: 2026');
});

test('parseFrontMatter: front matter 없으면 빈 data', () => {
  assert.deepEqual(b.parseFrontMatter('그냥 본문'), { data: {}, body: '그냥 본문' });
});

test('parsePost: CRLF·BOM 정규화, slug·기본값', () => {
  const p = b.parsePost('\uFEFF---\r\ndate: 2026-11-09\r\ntitle: 첫 글\r\ntags: blog\r\n---\r\n본문\r\n', '2026-11-09-첫글.md');
  assert.equal(p.slug, '첫글');
  assert.equal(p.date, '2026-11-09');
  assert.equal(p.title, '첫 글');
  assert.deepEqual(p.tags, ['blog']);
  assert.equal(p.description, '');
  assert.equal(p.draft, false);
  assert.equal(p.body, '본문\n');
  assert.equal(p.filename, '2026-11-09-첫글.md');
});

test('parsePost: 필수값 누락·잘못된 날짜 → 파일명 포함 에러', () => {
  assert.throws(() => b.parsePost('---\ndate: 2026-11-09\n---\n', 'a.md'), /a\.md: title/);
  assert.throws(() => b.parsePost('---\ntitle: t\n---\n', 'b.md'), /b\.md: date/);
  assert.throws(() => b.parsePost('---\ntitle: t\ndate: 2026-02-30\n---\n', 'c.md'), /c\.md: date/);
  assert.throws(() => b.parsePost('---\ntitle: t\ndate: 2026-13-01\n---\n', 'd.md'), /d\.md: date/);
});

// --- Task 2: 인라인 렌더러 ---

test('renderInline: 강조·코드·링크·이미지', () => {
  assert.equal(b.renderInline('**굵게** *기울임* `x`'), '<strong>굵게</strong> <em>기울임</em> <code>x</code>');
  assert.equal(b.renderInline('[글](https://a.com/?q=1&r=2)'), '<a href="https://a.com/?q=1&amp;r=2">글</a>');
  assert.equal(b.renderInline('![고양이](cat.png)'), '<img src="cat.png" alt="고양이" loading="lazy">');
});

test('renderInline: 코드 안은 escape만, 서식 미적용', () => {
  assert.equal(b.renderInline('`<script>**x**</script>`'), '<code>&lt;script&gt;**x**&lt;/script&gt;</code>');
});

test('renderInline: 원본 HTML은 escape', () => {
  assert.equal(b.renderInline('<b>hi</b>'), '&lt;b&gt;hi&lt;/b&gt;');
});

test('safeUrl: 위험 스킴 차단, 일반 URL 통과', () => {
  for (const u of ['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,x', 'vbscript:x'])
    assert.equal(b.safeUrl(u), '#', u);
  for (const u of ['https://a.com', 'http://a.com', 'mailto:a@b.c', '../img/a.png', '/x', '#top', 'cat.png'])
    assert.equal(b.safeUrl(u), u, u);
  assert.equal(b.renderInline('[x](javascript:alert)'), '<a href="#">x</a>');
});

// --- Task 3: 블록 기본 ---

test('renderMarkdown: 제목·문단·줄바꿈·구분선', () => {
  assert.equal(b.renderMarkdown('# 제목\n\n첫 줄  \n둘째 줄\n셋째\n\n---'),
    '<h1>제목</h1>\n<p>첫 줄<br>\n둘째 줄\n셋째</p>\n<hr>');
});

test('renderMarkdown: 코드 펜스는 escape만·언어 클래스', () => {
  assert.equal(b.renderMarkdown('```js\nconst a = 1 < 2; // **x**\n```'),
    '<pre><code class="language-js">const a = 1 &lt; 2; // **x**</code></pre>');
});

test('renderMarkdown: 닫히지 않은 펜스는 끝까지 코드', () => {
  assert.equal(b.renderMarkdown('```\na\n\n# b'), '<pre><code>a\n\n# b</code></pre>');
});

test('renderMarkdown: 인용은 내부를 재귀 렌더', () => {
  assert.equal(b.renderMarkdown('> **중요**\n> 둘째'),
    '<blockquote>\n<p><strong>중요</strong>\n둘째</p>\n</blockquote>');
});

// --- Task 4: 목록·표 ---

const norm = s => s.replace(/\n/g, '');

test('renderMarkdown: ul·ol, 2단계 중첩, 3단계 이상은 2단계로 평탄화', () => {
  assert.equal(norm(b.renderMarkdown('- a\n  - a1\n    - a2\n- **b**\n\n1. x\n2. y')),
    '<ul><li>a<ul><li>a1</li><li>a2</li></ul></li><li><strong>b</strong></li></ul><ol><li>x</li><li>y</li></ol>');
});

test('renderMarkdown: 표 → 스크롤 래퍼, 셀 인라인 렌더, 정렬 표기 무시', () => {
  assert.equal(norm(b.renderMarkdown('| 이름 | 값 |\n|---|---:|\n| `a` | 1 |')),
    '<div class="table-wrap"><table><thead><tr><th>이름</th><th>값</th></tr></thead>' +
    '<tbody><tr><td><code>a</code></td><td>1</td></tr></tbody></table></div>');
});

test('renderMarkdown: 구분 줄 없는 | 줄은 문단', () => {
  assert.equal(b.renderMarkdown('| 그냥 |'), '<p>| 그냥 |</p>');
});

// --- Task 5: 템플릿·빌드 ---

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const tmpDirs = [];
test.after(() => tmpDirs.forEach(d => fs.rmSync(d, { recursive: true, force: true })));

function makeSite(posts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-'));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'posts'));
  fs.mkdirSync(path.join(dir, 'static'));
  fs.writeFileSync(path.join(dir, 'static', 'style.css'), '');
  for (const [name, src] of Object.entries(posts)) fs.writeFileSync(path.join(dir, 'posts', name), src);
  return dir;
}
const opts = dir => ({ srcDir: path.join(dir, 'posts'), outDir: path.join(dir, 'dist'), staticDir: path.join(dir, 'static'), appsDir: path.join(dir, 'apps') });
const post = (date, title, extra = '') => `---\ndate: ${date}\ntitle: ${title}\n${extra}---\n본문`;
const read = (dir, f) => fs.readFileSync(path.join(dir, 'dist', f), 'utf8');

test('layout: 공통 요소·escape, 세로 간판, 테마 전환 없음', () => {
  const html = b.layout({ title: 'T<', description: 'D"', body: '<p>x</p>', root: '../' });
  for (const s of ['<html lang="ko">', 'name="viewport"', '<title>T&lt;', 'content="D&quot;"',
    'href="../static/style.css"', '<header class="sign">', '<a class="sign-title" href="../index.html">', '<main>'])
    assert.ok(html.includes(s), s);
  for (const s of ['theme-toggle', 'theme.js', 'localStorage'])
    assert.ok(!html.includes(s), `남아 있으면 안 됨: ${s}`);
});

test('renderIndex: 날짜를 제목 앞에, YYYY.MM.DD로 표시', () => {
  const html = b.renderIndex([{ slug: 'a', title: 'A', date: '2026-11-09', description: '', tags: [] }]);
  assert.match(html, /<time datetime="2026-11-09">2026\.11\.09<\/time>\s*<div>\s*<a href="posts\/a\.html">A<\/a>/);
});

test('build: 글·목록·static 생성, 최신순, draft 제외', () => {
  const dir = makeSite({
    '2026-01-01-old.md': post('2026-01-01', '옛 글'),
    '2026-11-09-첫글.md': post('2026-11-09', '새 글'),
    '2026-11-10-wip.md': post('2026-11-10', '초안', 'draft: true\n'),
  });
  assert.equal(b.build(opts(dir)).count, 2);
  const index = read(dir, 'index.html');
  assert.ok(index.indexOf('새 글') < index.indexOf('옛 글'));
  assert.ok(!index.includes('초안'));
  assert.ok(index.includes(`href="posts/${encodeURIComponent('첫글')}.html"`));
  assert.ok(read(dir, 'posts/첫글.html').includes('<time datetime="2026-11-09">'));
  assert.ok(!fs.existsSync(path.join(dir, 'dist/posts/wip.html')));
  assert.ok(fs.existsSync(path.join(dir, 'dist/static/style.css')));
});

test('renderIndex: 웹앱 카드에 제목·설명·iframe, escape', () => {
  const html = b.renderIndex([], [{ slug: 'x', title: 'X<', description: 'D"' }]);
  for (const s of ['<ul class="app-list">', '<a href="apps/x/index.html">X&lt;</a>', '<p>D&quot;</p>',
    '<iframe src="apps/x/index.html" title="X&lt;" loading="lazy">'])
    assert.ok(html.includes(s), s);
  assert.ok(!b.renderIndex([], []).includes('app-list'));
});

test('build: apps/ 복사, .md 작업 문서는 제외', () => {
  const dir = makeSite({});
  fs.mkdirSync(path.join(dir, 'apps/x'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'apps/x/index.html'), '<p>x</p>');
  fs.writeFileSync(path.join(dir, 'apps/x/spec.md'), '# s');
  b.build(opts(dir));
  assert.ok(fs.existsSync(path.join(dir, 'dist/apps/x/index.html')));
  assert.ok(!fs.existsSync(path.join(dir, 'dist/apps/x/spec.md')));
});

test('build: 이전 빌드 잔여 파일 제거', () => {
  const dir = makeSite({ '2026-11-09-a.md': post('2026-11-09', 'A') });
  fs.mkdirSync(path.join(dir, 'dist/posts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'dist/posts/stale.html'), '');
  b.build(opts(dir));
  assert.ok(!fs.existsSync(path.join(dir, 'dist/posts/stale.html')));
});

test('build: 잘못된 글이면 기존 dist 보존', () => {
  const dir = makeSite({ '2026-11-09-a.md': post('2026-11-09', 'A') });
  b.build(opts(dir));
  fs.writeFileSync(path.join(dir, 'posts', 'broken.md'), '---\ntitle: x\n---\n');
  assert.throws(() => b.build(opts(dir)), /broken\.md: date/);
  assert.ok(fs.existsSync(path.join(dir, 'dist/posts/a.html')));
});

test('build: slug 중복 → 두 파일명 포함 에러', () => {
  const dir = makeSite({ '2026-01-01-a.md': post('2026-01-01', 'A'), '2026-02-01-a.md': post('2026-02-01', 'B') });
  assert.throws(() => b.build(opts(dir)),
    e => e.message.includes('2026-01-01-a.md') && e.message.includes('2026-02-01-a.md'));
});

test('build: 글 0개면 빈 목록 안내', () => {
  const dir = makeSite({});
  b.build(opts(dir));
  assert.match(read(dir, 'index.html'), /아직 글이 없습니다/);
});

// --- 최종 리뷰 수정 ---

test('renderInline: 이미지·링크 중첩으로 속성 주입 불가 (C1)', () => {
  assert.equal(b.renderInline("![[그림](zz)](x/onerror=document.title='PWNED'//)"),
    '<img src="zz" alt="[그림" loading="lazy">](x/onerror=document.title=&#39;PWNED&#39;//)');
  assert.equal(b.renderInline('![a](x[y) z](x/onerror=document.title=1//)'),
    '<img src="x[y" alt="a" loading="lazy"> z](x/onerror=document.title=1//)');
});

test('renderInline: 링크 안 코드, URL·alt 안 * 는 그대로 (C1 부수 효과)', () => {
  assert.equal(b.renderInline('[`build.js`](https://a.com/build.js)'), '<a href="https://a.com/build.js"><code>build.js</code></a>');
  assert.equal(b.renderInline('![**중요** 그림](a.png)'), '<img src="a.png" alt="**중요** 그림" loading="lazy">');
  assert.equal(b.renderInline('[x](https://a.com/a*b) 그리고 *c*'), '<a href="https://a.com/a*b">x</a> 그리고 <em>c</em>');
});

test('parseFrontMatter: 닫는 --- 뒤 공백 허용, 본문 구분선과 혼동 안 함 (I1)', () => {
  const { data, body } = b.parseFrontMatter('---\ntitle: 진짜\n--- \n\n본문\n\n---\n\n끝');
  assert.equal(data.title, '진짜');
  assert.equal(body, '\n본문\n\n---\n\n끝');
});

test('parsePost: front matter 안 key: value 아닌 줄 → 파일명 포함 에러 (I1)', () => {
  // 닫는 --- 오타로 본문이 front matter에 빨려 들어가는 경우
  assert.throws(() => b.parsePost('---\ndate: 2026-11-09\ntitle: t\n--\n\n본문 문단\n\n---\n\n끝', 'e.md'), /e\.md: front matter/);
});

test('parsePost: draft 대소문자·따옴표·주석 허용, 그 외 값은 에러 (I2)', () => {
  const draft = v => b.parsePost(`---\ndate: 2026-11-09\ntitle: t\ndraft: ${v}\n---\n`, 'f.md').draft;
  assert.equal(draft('True'), true);
  assert.equal(draft('"true"'), true);
  assert.equal(draft('true   # 선택. true면 빌드 제외'), true);
  assert.equal(draft('false'), false);
  assert.throws(() => draft('yes'), /f\.md: draft/);
});

test('parseFrontMatter: 따옴표 없는 값의 # 주석 제거, 따옴표 안 #은 유지 (I2)', () => {
  const { data } = b.parseFrontMatter('---\ndescription: 요약   # 선택\ntitle: "C# #1"\nsub: C# 입문\n---\n');
  assert.equal(data.description, '요약');
  assert.equal(data.title, 'C# #1');
  assert.equal(data.sub, 'C# 입문');
});

test('build: 대소문자·유니코드 정규화만 다른 slug도 중복 에러 (I3)', () => {
  const a = makeSite({ '2026-01-01-Hello.md': post('2026-01-01', 'A'), '2026-02-01-hello.md': post('2026-02-01', 'B') });
  assert.throws(() => b.build(opts(a)), /slug 중복/);
  const k = makeSite({ [`2026-01-01-${'첫글'.normalize('NFD')}.md`]: post('2026-01-01', 'A'), '2026-02-01-첫글.md': post('2026-02-01', 'B') });
  assert.throws(() => b.build(opts(k)), /slug 중복/);
});

test('renderMarkdown: ol 시작 번호 유지, 1. 아닌 번호는 문단을 끊지 않음 (I4)', () => {
  assert.equal(norm(b.renderMarkdown('3. 셋째\n4. 넷째')), '<ol start="3"><li>셋째</li><li>넷째</li></ol>');
  assert.equal(b.renderMarkdown('오늘 쓴 글.\n2026. 11. 9. 업데이트'), '<p>오늘 쓴 글.\n2026. 11. 9. 업데이트</p>');
});

// --- 보류했던 Minor 수정 ---

test('renderInline: 공백으로 둘러싼 * 는 기울임 아님 (M2)', () => {
  assert.equal(b.renderInline('2 * 3 * 4 = 24'), '2 * 3 * 4 = 24');
  assert.equal(b.renderInline('*a* 와 *기울임*'), '<em>a</em> 와 <em>기울임</em>');
});

test('renderInline: URL 안 괄호 한 단계 허용 (M3)', () => {
  assert.equal(b.renderInline('[위키](https://en.wikipedia.org/wiki/Foo_(bar))'),
    '<a href="https://en.wikipedia.org/wiki/Foo_(bar)">위키</a>');
});

test('safeUrl: tel: 허용 (M4)', () => {
  assert.equal(b.safeUrl('tel:01012345678'), 'tel:01012345678');
});

test('parsePost: [ ]로 시작·끝나는 제목도 그대로, 목록은 tags만 (M6)', () => {
  const p = b.parsePost('---\ndate: 2026-11-09\ntitle: [공지] 새 기능, 출시 [v2]\ntags: [a, b]\n---\n', 'g.md');
  assert.equal(p.title, '[공지] 새 기능, 출시 [v2]');
  assert.deepEqual(p.tags, ['a', 'b']);
});

test('renderMarkdown: 긴 펜스는 같은 길이 이상으로만 닫힘, 들여쓴 닫는 펜스 허용 (M9)', () => {
  assert.equal(b.renderMarkdown('````md\n```js\nx\n```\n````\n끝'),
    '<pre><code class="language-md">```js\nx\n```</code></pre>\n<p>끝</p>');
  assert.equal(b.renderMarkdown('```\na\n  ```\n# 제목'), '<pre><code>a</code></pre>\n<h1>제목</h1>');
});

test('renderMarkdown: 목록 항목의 들여쓴 다음 줄은 같은 항목 (M10)', () => {
  assert.equal(b.renderMarkdown('- 하나\n  이어지는 줄\n- 둘'), '<ul>\n<li>하나\n이어지는 줄</li>\n<li>둘</li>\n</ul>');
});

test('build: 대문자 확장자 .MD도 포함 (M8)', () => {
  const dir = makeSite({ '2026-03-01-upper.MD': post('2026-03-01', 'U') });
  assert.equal(b.build(opts(dir)).count, 1);
  assert.ok(fs.existsSync(path.join(dir, 'dist/posts/upper.html')));
});

test('build: 쓰기 단계 실패해도 기존 dist 보존, 임시 폴더 안 남김 (M5)', () => {
  const dir = makeSite({ '2026-11-09-a.md': post('2026-11-09', 'A') });
  b.build(opts(dir));
  fs.writeFileSync(path.join(dir, 'dist', 'old-build-marker'), ''); // 이전 빌드 상태 표시
  const locked = path.join(dir, 'static', 'locked.css');
  fs.writeFileSync(locked, '');
  fs.chmodSync(locked, 0o000);
  assert.throws(() => b.build(opts(dir)));
  assert.ok(fs.existsSync(path.join(dir, 'dist/old-build-marker')), '기존 dist가 교체됨');
  assert.ok(fs.existsSync(path.join(dir, 'dist/posts/a.html')));
  assert.ok(fs.existsSync(path.join(dir, 'dist/static/style.css')));
  assert.deepEqual(fs.readdirSync(dir).sort(), ['dist', 'posts', 'static']);
});
