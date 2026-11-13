// posts/*.md → dist/*.html 정적 블로그 빌더. Node 표준 모듈만 사용.

const fs = require('node:fs');
const path = require('node:path');

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ESCAPES[c]);
}

// --- front matter ---

// asList: [a, b] 목록 해석 여부. tags에만 적용 → "[공지] … [v2]" 같은 제목은 문자열 그대로
function parseValue(raw, asList = false) {
  let v = raw.trim();
  if (!/^["']/.test(v)) v = v.replace(/\s+#.*$/, ''); // 따옴표 없는 값의 YAML식 주석 제거
  if (/^true$/i.test(v)) return true;
  if (/^false$/i.test(v)) return false;
  if (asList && v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).split(',').map(x => parseValue(x)).filter(x => x !== '');
  }
  return v.replace(/^(["'])(.*)\1$/, '$2');
}

// 입력은 \n 줄바꿈 가정 (parsePost가 정규화).
// key: value · 빈 줄 · 주석 외의 줄은 에러 — 닫는 --- 오타로 본문이 조용히 사라지는 것 방지
function parseFrontMatter(src) {
  const m = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(src);
  if (!m) return { data: {}, body: src };
  const data = {};
  m[1].split('\n').forEach((line, n) => {
    if (/^\s*(#.*)?$/.test(line)) return;
    const kv = /^([A-Za-z_][\w-]*)\s*:(.*)$/.exec(line);
    if (!kv) throw new Error(`front matter 형식 오류 (${n + 2}번째 줄: ${line.trim()})`);
    data[kv[1]] = parseValue(kv[2], kv[1] === 'tags');
  });
  return { data, body: src.slice(m[0].length) };
}

function isValidDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === date;
}

function parsePost(src, filename) {
  const text = src.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  let parsed;
  try { parsed = parseFrontMatter(text); } catch (e) { throw new Error(`${filename}: ${e.message}`); }
  const { data, body } = parsed;
  if (!data.title) throw new Error(`${filename}: title 누락`);
  if (!isValidDate(data.date)) throw new Error(`${filename}: date 형식 오류 (YYYY-MM-DD)`);
  // 초안이 실수로 공개되지 않도록 true/false 외 값은 에러
  const draft = data.draft === undefined ? 'false' : String(data.draft);
  if (!/^(true|false)$/i.test(draft)) throw new Error(`${filename}: draft는 true 또는 false만 가능`);
  const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [String(data.tags)] : [];
  return {
    filename,
    slug: filename.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''),
    date: data.date,
    title: String(data.title),
    tags,
    description: data.description ? String(data.description) : '',
    draft: /^true$/i.test(draft),
    body,
  };
}

// --- 인라인 ---

// 공백·제어문자를 빼고 스킴 판정 (java\tscript: 우회 차단). http/https/mailto/tel/상대경로만 허용
function safeUrl(url) {
  const probe = url.replace(/[\s\u0000-\u001f]/g, '');
  if (/^[a-z][a-z0-9+.-]*:/i.test(probe) && !/^(https?|mailto|tel):/i.test(probe)) return '#';
  return url;
}

const TOKEN = /\u0000(\d+)\u0000/g;

// 코드 → 이미지 → 링크 순으로 완성된 HTML을 토큰(\0n\0)으로 빼 두고, 남은 글자만 escape·강조 처리.
// 만들어진 태그는 이후 정규식이 다시 건드리지 못함 → 링크·이미지 중첩으로 속성 주입 불가
function renderInline(text) {
  const tokens = [];
  const hold = (html, raw) => `\u0000${tokens.push({ html, raw }) - 1}\u0000`;
  const restore = s => s.replace(TOKEN, (_, n) => tokens[n].html);
  const plain = s => s.replace(TOKEN, (_, n) => tokens[n].raw);
  const emphasis = s => escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(?![\s*])([^*]*?[^\s*])\*/g, '<em>$1</em>'); // "2 * 3 * 4"처럼 공백 둘러싼 *는 제외

  // URL은 괄호 한 단계까지 허용 (위키 링크 Foo_(bar))
  const s = text.replace(/\u0000/g, '')
    .replace(/`([^`]+)`/g, (m, code) => hold(`<code>${escapeHtml(code)}</code>`, m))
    .replace(/!\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))*)\)/g, (m, alt, src) =>
      hold(`<img src="${escapeHtml(safeUrl(src))}" alt="${escapeHtml(plain(alt))}" loading="lazy">`, m))
    .replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))*)\)/g, (m, label, href) =>
      hold(`<a href="${escapeHtml(safeUrl(href))}">${restore(emphasis(label))}</a>`, m));
  return restore(emphasis(s));
}

// --- 블록 ---

const FENCE = /^ {0,3}(`{3,})(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const HR = /^-{3,}\s*$/;
const QUOTE = /^>/;
const BLANK = /^\s*$/;
const LIST_ITEM = /^(\s*)(-|\d+\.)\s+(.*)$/;
const TABLE_SEP = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function isTableStart(lines, i) {
  const sep = lines[i + 1];
  return /^\|/.test(lines[i]) && sep !== undefined && sep.includes('|') && TABLE_SEP.test(sep);
}

function isBlockStart(lines, i) {
  const line = lines[i];
  // 번호 목록은 1.로 시작할 때만 문단을 끊음 (CommonMark) — "2026. 11. 9." 같은 날짜 줄 보호
  return FENCE.test(line) || HEADING.test(line) || HR.test(line) || QUOTE.test(line) ||
    /^\s*(-|1\.)\s+/.test(line) || isTableStart(lines, i);
}

const tableCells = row => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => renderInline(c.trim()));

// 들여쓰기 2칸 이상은 전부 2단계 (3단계 이상 평탄화)
function renderList(items) {
  const { ordered, start } = items[0];
  const tag = ordered ? 'ol' : 'ul';
  const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
  const lis = items.map(it =>
    `<li>${renderInline(it.text)}${it.children.length ? `\n${renderList(it.children)}\n` : ''}</li>`);
  return `<${tag}${startAttr}>\n${lis.join('\n')}\n</${tag}>`;
}

function renderMarkdown(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (BLANK.test(line)) { i++; continue; }

    const fence = FENCE.exec(line);
    if (fence) {
      const lang = fence[2].trim();
      // 여는 펜스 이상 길이의 백틱 줄(들여쓰기 3칸까지)로만 닫힘. 없으면 문서 끝까지 코드
      const close = new RegExp(`^ {0,3}\`{${fence[1].length},}\\s*$`);
      const code = [];
      i++;
      while (i < lines.length && !close.test(lines[i])) code.push(lines[i++]);
      i++;
      const cls = /^[\w-]+$/.test(lang) ? ` class="language-${lang}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const h = HEADING.exec(line);
    if (h) {
      out.push(`<h${h[1].length}>${renderInline(h[2].trim())}</h${h[1].length}>`);
      i++;
      continue;
    }

    if (HR.test(line)) { out.push('<hr>'); i++; continue; }

    if (QUOTE.test(line)) {
      const inner = [];
      while (i < lines.length && QUOTE.test(lines[i])) inner.push(lines[i++].replace(/^> ?/, ''));
      out.push(`<blockquote>\n${renderMarkdown(inner.join('\n'))}\n</blockquote>`);
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const items = [];
      let last = null;
      while (i < lines.length) {
        const m = LIST_ITEM.exec(lines[i]);
        if (m) {
          last = { text: m[3], ordered: m[2] !== '-', start: parseInt(m[2], 10), children: [] };
          if (m[1].length >= 2 && items.length) items[items.length - 1].children.push(last);
          else items.push(last);
        } else if (/^\s+\S/.test(lines[i])) {
          last.text += '\n' + lines[i].trim(); // 들여쓴 다음 줄은 직전 항목에 이어 붙임
        } else break;
        i++;
      }
      out.push(renderList(items));
      continue;
    }

    if (isTableStart(lines, i)) {
      const head = tableCells(lines[i]);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(tableCells(lines[i++]));
      const tr = (cells, tag) => `<tr>${cells.map(c => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
      out.push(`<div class="table-wrap"><table>\n<thead>${tr(head, 'th')}</thead>\n` +
        `<tbody>\n${rows.map(r => tr(r, 'td')).join('\n')}\n</tbody>\n</table></div>`);
      continue;
    }

    const para = [];
    while (i < lines.length && !BLANK.test(lines[i]) && (para.length === 0 || !isBlockStart(lines, i))) {
      const l = lines[i++];
      para.push(renderInline(l.trimEnd()) + (/ {2,}$/.test(l) ? '<br>' : ''));
    }
    out.push(`<p>${para.join('\n')}</p>`);
  }
  return out.join('\n');
}

// --- 템플릿 ---

const SITE_TITLE = 'my-blog';
// 메인 카드에 올릴 미니 웹앱. 앱 하나 = 한 줄, 폴더는 apps/{slug}/
const APPS = [
  { slug: 'pomodoro', title: '뽀모도로 타이머', description: '집중 25분 · 휴식 5분을 번갈아 세는 네온 타이머' },
  { slug: 'doubling', title: 'Doubling', description: '방향키·스와이프로 같은 숫자를 합쳐 2048을 만드는 퍼즐' },
];

// 2026-11-09 → <time datetime="2026-11-09">2026.11.09</time>
const timeTag = date => `<time datetime="${date}">${date.replace(/-/g, '.')}</time>`;

function layout({ title, description = '', body, root }) {
  const pageTitle = title ? `${escapeHtml(title)} · ${SITE_TITLE}` : SITE_TITLE;
  const desc = description ? `\n<meta name="description" content="${escapeHtml(description)}">` : '';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>${desc}
<link rel="stylesheet" href="${root}static/style.css">
</head>
<body>
<header class="sign">
<a class="sign-title" href="${root}index.html">${SITE_TITLE}</a>
</header>
<main>
${body}
</main>
</body>
</html>
`;
}

function renderIndex(posts, apps = APPS) {
  const items = posts.map(p => `<li>
${timeTag(p.date)}
<div>
<a href="posts/${encodeURIComponent(p.slug)}.html">${escapeHtml(p.title)}</a>${p.description ? `\n<p>${escapeHtml(p.description)}</p>` : ''}
</div>
</li>`);
  const list = posts.length ? `<ul class="post-list">\n${items.join('\n')}\n</ul>` : '<p>아직 글이 없습니다.</p>';
  const cards = apps.map(a => {
    const src = `apps/${encodeURIComponent(a.slug)}/index.html`;
    return `<li class="app-card">
<a href="${src}">${escapeHtml(a.title)}</a>
<p>${escapeHtml(a.description)}</p>
<iframe src="${src}" title="${escapeHtml(a.title)}" loading="lazy"></iframe>
</li>`;
  });
  const appSection = apps.length ? `\n<h1>미니 웹앱</h1>\n<ul class="app-list">\n${cards.join('\n')}\n</ul>` : '';
  return layout({ title: null, body: `<h1>최근 글</h1>\n${list}${appSection}`, root: '' });
}

function renderPostPage(post) {
  const tags = post.tags.length ? `\n<p class="tags">${post.tags.map(t => `#${escapeHtml(t)}`).join(' ')}</p>` : '';
  const body = `<article>
<header>
<h1>${escapeHtml(post.title)}</h1>
${timeTag(post.date)}${tags}
</header>
${renderMarkdown(post.body)}
</article>`;
  return layout({ title: post.title, description: post.description, body, root: '../' });
}

// --- 빌드 ---

function build({
  srcDir = path.join(__dirname, 'posts'),
  outDir = path.join(__dirname, 'dist'),
  staticDir = path.join(__dirname, 'static'),
  appsDir = path.join(__dirname, 'apps'),
} = {}) {
  if (!fs.existsSync(srcDir)) throw new Error(`posts 폴더 없음: ${srcDir}`);

  // 1) 읽기·파싱·검증·렌더링 전부 메모리에서. 여기서 실패하면 기존 dist는 그대로
  const posts = fs.readdirSync(srcDir)
    .filter(f => /\.md$/i.test(f))
    .map(f => parsePost(fs.readFileSync(path.join(srcDir, f), 'utf8'), f))
    .filter(p => !p.draft)
    .sort((x, y) => y.date.localeCompare(x.date) || x.filename.localeCompare(y.filename));
  // macOS 기본 파일 시스템은 대소문자·유니코드 정규화를 구분하지 않음 → 같은 키면 파일이 덮어써짐
  const seen = new Map();
  for (const p of posts) {
    const key = p.slug.normalize('NFC').toLowerCase();
    if (seen.has(key)) throw new Error(`slug 중복 '${p.slug}': ${seen.get(key)}, ${p.filename}`);
    seen.set(key, p.filename);
  }
  const pages = posts.map(p => [path.join('posts', `${p.slug}.html`), renderPostPage(p)]);
  pages.push(['index.html', renderIndex(posts)]);

  // 2) 임시 폴더에 전부 쓴 뒤 교체. 쓰기·복사 중 실패해도 기존 dist는 그대로
  const tmpDir = `${outDir}.tmp`;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  try {
    fs.mkdirSync(path.join(tmpDir, 'posts'), { recursive: true });
    for (const [rel, html] of pages) fs.writeFileSync(path.join(tmpDir, rel), html);
    if (fs.existsSync(staticDir)) fs.cpSync(staticDir, path.join(tmpDir, 'static'), { recursive: true });
    // spec.md·review.md 같은 작업 문서는 배포하지 않음
    if (fs.existsSync(appsDir)) fs.cpSync(appsDir, path.join(tmpDir, 'apps'), { recursive: true, filter: src => !/\.md$/i.test(src) });
  } catch (e) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw e;
  }
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.renameSync(tmpDir, outDir);
  return { count: posts.length };
}

module.exports = {
  escapeHtml, parseFrontMatter, parsePost, safeUrl, renderInline, renderMarkdown,
  SITE_TITLE, layout, renderIndex, renderPostPage, build,
};

if (require.main === module) {
  try {
    const { count } = build();
    console.log(`${count}개 글 → dist/`);
  } catch (e) {
    console.error(`빌드 실패: ${e.message}`);
    process.exit(1);
  }
}
