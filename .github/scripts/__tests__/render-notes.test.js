const test = require('node:test');
const assert = require('node:assert/strict');
const { renderReleaseNotes } = require('../render-notes.js');

const AREA_ORDER = [
  { label: 'frontend', heading: '🎨 Frontend' },
  { label: 'backend',  heading: '⚙️ Backend' },
  { label: 'infra',    heading: '🏗️ Infrastructure' },
];
const TYPE_ORDER = [
  { label: 'feature', heading: '🚀 Features' },
  { label: 'fix',     heading: '🐛 Bug Fixes' },
  { label: 'docs',    heading: '📚 Documentation' },
  { labels: ['chore', 'refactor', 'perf', 'test', 'ci', 'style'],
    heading: '🧰 Maintenance' },
];

const baseConfig = {
  areaOrder: AREA_ORDER,
  otherAreaHeading: '📦 Other Changes',
  typeOrder: TYPE_ORDER,
  otherTypeHeading: '📦 Other Changes',
  repoUrl: 'https://github.com/owner/repo',
  anchorTag: '467.0',
  nextTag: '468.0',
};

function pr(n, title, author, labels) {
  return { number: n, title, author, labels };
}

test('renders a single feature in a single area', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    prs: [pr(1, 'feat: add sign-up button', 'rreicks', ['frontend', 'feature'])],
  });
  assert.match(md, /## 🎨 Frontend/);
  assert.match(md, /### 🚀 Features/);
  assert.match(md, /- add sign-up button by @rreicks in #1/);
  assert.doesNotMatch(md, /## ⚙️ Backend/);
  assert.doesNotMatch(md, /## 🏗️ Infrastructure/);
});

test('strips conventional commit prefix from title', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    prs: [pr(1, 'feat: add button', 'rreicks', ['frontend', 'feature'])],
  });
  assert.match(md, /- add button /);
  assert.doesNotMatch(md, /feat: add button/);
});

test('strips scoped conventional commit prefix from title', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    prs: [pr(1, 'refactor(backend): extract auth middleware', 'rreicks', ['backend', 'refactor'])],
  });
  assert.match(md, /- extract auth middleware /);
});

test('multi-area PR appears under each area', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    prs: [pr(6, 'feat: end-to-end signup', 'rreicks', ['frontend', 'backend', 'feature'])],
  });
  const frontendIdx = md.indexOf('## 🎨 Frontend');
  const backendIdx = md.indexOf('## ⚙️ Backend');
  assert.ok(frontendIdx >= 0 && backendIdx >= 0);
  const matches = md.match(/end-to-end signup/g);
  assert.equal(matches.length, 2);
});

test('PR with no area label goes to top-level Other Changes', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    prs: [pr(7, 'update top-level README badges', 'rreicks', [])],
  });
  assert.match(md, /## 📦 Other Changes/);
  assert.match(md, /- update top-level README badges by @rreicks in #7/);
});

test('suppresses redundant type heading when it matches area heading', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    prs: [pr(7, 'update top-level README badges', 'rreicks', [])],
  });
  // Should have ## Other Changes once, but NOT also ### Other Changes inside it
  const h2 = md.match(/^## 📦 Other Changes$/gm);
  const h3 = md.match(/^### 📦 Other Changes$/gm);
  assert.equal(h2.length, 1);
  assert.equal(h3, null);
});

test('PR with area but no type goes to within-area Other Changes', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    prs: [pr(7, 'update color tokens', 'rreicks', ['frontend'])],
  });
  assert.match(md, /## 🎨 Frontend/);
  assert.match(md, /### 📦 Other Changes/);
});

test('chore/refactor/etc roll up under Maintenance', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    prs: [
      pr(1, 'chore: bump deps', 'rreicks', ['frontend', 'chore']),
      pr(2, 'refactor: tidy code', 'rreicks', ['frontend', 'refactor']),
    ],
  });
  assert.match(md, /### 🧰 Maintenance/);
  const matches = md.match(/### 🧰 Maintenance/g);
  assert.equal(matches.length, 1);
});

test('suppresses empty area heading', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    prs: [pr(1, 'feat: add button', 'rreicks', ['frontend', 'feature'])],
  });
  assert.doesNotMatch(md, /## ⚙️ Backend/);
  assert.doesNotMatch(md, /## 🏗️ Infrastructure/);
});

test('suppresses empty type heading within an area', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    prs: [pr(1, 'feat: add button', 'rreicks', ['frontend', 'feature'])],
  });
  assert.doesNotMatch(md, /### 🐛 Bug Fixes/);
  assert.doesNotMatch(md, /### 📚 Documentation/);
});

test('does not render a Contributors section (GitHub adds one)', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    prs: [pr(1, 'feat: a', 'alice', ['frontend', 'feature'])],
  });
  assert.doesNotMatch(md, /## 🙌 Contributors/);
  assert.doesNotMatch(md, /Thanks to/);
});

test('renders full changelog link with anchor and next tags', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    prs: [pr(1, 'feat: a', 'alice', ['frontend', 'feature'])],
  });
  assert.match(md, /\*\*Full Changelog\*\*: https:\/\/github\.com\/owner\/repo\/compare\/467\.0\.\.\.468\.0/);
});

test('omits compare link when no anchor (bootstrap)', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    anchorTag: null,
    prs: [pr(1, 'feat: a', 'alice', ['frontend', 'feature'])],
  });
  assert.doesNotMatch(md, /Full Changelog/);
});

test('renders empty body when no PRs and no anchor', () => {
  const md = renderReleaseNotes({ ...baseConfig, anchorTag: null, prs: [] });
  assert.equal(md.trim(), '_No changes yet._');
});
