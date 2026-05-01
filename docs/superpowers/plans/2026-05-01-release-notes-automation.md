# Release Notes Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a monorepo showcase repo (`release-notes-example`) demonstrating end-to-end automated release notes — auto-labeled PRs (path + title), nested per-area release drafts, and a hotfix flow — so a release manager only needs to read + Publish.

**Architecture:** Four placeholder package READMEs (`frontend/`, `backend/`, `infra/`, top-level), two GitHub Actions workflows, and one Node module split into pure functions (versioning, rendering) + a thin orchestrator that talks to the GitHub API. Pure functions are unit-tested with `node:test` (zero dependencies). Rendering and version logic live in their own files so they can be tested in isolation.

**Tech Stack:**
- GitHub Actions (`actions/labeler@v5`, `TimonVS/pr-labeler-action@v5`, `actions/github-script@v7`)
- Node.js (built-in `node:test` runner; CommonJS for compatibility with `github-script`'s `require()`)
- `gh` CLI for repo bootstrap
- Markdown (READMEs, plan/spec docs)

**Reference spec:** `docs/superpowers/specs/2026-05-01-release-notes-automation-design.md`

---

## File Structure

Files this plan creates or modifies:

| Path | Responsibility |
|---|---|
| `README.md` | Top-level: what this repo demonstrates + Guided Tour |
| `frontend/README.md` | Placeholder describing fake React app |
| `backend/README.md` | Placeholder describing fake API service |
| `infra/README.md` | Placeholder describing fake Terraform/k8s |
| `.github/labeler.yml` | `actions/labeler` config — area labels by changed paths |
| `.github/pr-labeler.yml` | `TimonVS/pr-labeler-action` config — type labels by title |
| `.github/workflows/label-pr.yml` | Runs both labelers on PR `[opened, edited, synchronize]` |
| `.github/workflows/release-notes.yml` | Runs the draft-release-notes script on push to main / release/* + workflow_dispatch |
| `.github/scripts/version.js` | Pure function: `(branch, publishedTags) → { mode, tag }` |
| `.github/scripts/render-notes.js` | Pure function: `(prs, config, anchorTag, nextTag, repoUrl) → markdown` |
| `.github/scripts/draft-release-notes.js` | Orchestrator called by github-script: fetches PRs, computes version, renders, creates/updates draft release |
| `.github/scripts/__tests__/version.test.js` | Unit tests for version.js |
| `.github/scripts/__tests__/render-notes.test.js` | Unit tests for render-notes.js |

Decomposition rationale: the API-talking code (`draft-release-notes.js`) is ~30 lines of glue. All the interesting logic (version math, markdown rendering) lives in pure functions that are easy to test and modify without thinking about HTTP. No `package.json`, no `node_modules` — `node:test` is built-in.

---

## Task 1: Initialize repo + top-level README skeleton

**Files:**
- Create: `README.md`
- Run: `git init` (if not already initialized)

**Why:** Visitors land on the top-level README. It needs to exist before anything else and frame what they're looking at.

- [ ] **Step 1: Initialize git repo if needed**

Run:
```bash
cd /Users/rreicks/projects/personal/release-notes-example
[ -d .git ] || git init -b main
git config user.email rreicks@coviance.com
git config user.name "Ryan Reicks"
```

- [ ] **Step 2: Create the top-level README**

Create `README.md`:
```markdown
# Release Notes Example

A monorepo showcase for **fully automated release notes** that gives the release manager exactly two jobs per release: read the auto-generated draft, click **Publish**.

The repo is intentionally empty — `frontend/`, `backend/`, and `infra/` only contain README placeholders. The story is in the workflows, the script, and the artifacts (PRs, drafts, published releases).

## How it works

1. A dev opens a PR. Two labelers run automatically:
   - [`actions/labeler`](https://github.com/actions/labeler) reads changed file paths → applies area labels (`frontend`, `backend`, `infra`).
   - [`TimonVS/pr-labeler-action`](https://github.com/TimonVS/pr-labeler-action) reads the PR title → applies a type label (`feature`, `fix`, `docs`, etc.) based on conventional commit prefix.
2. The PR merges to `main` (regular release) or `release/<N>` (hotfix).
3. A small `github-script` workflow runs, queries the PRs merged since the last published release, groups them by area → type, renders nested markdown, and creates/updates a draft GitHub Release.
4. The release manager opens the Releases tab, reviews the draft, clicks **Publish**.

Versioning scheme: `<RELEASE>.<PATCH>` (e.g., `467.0`, `467.1`, `468.0`). No `v` prefix. Regular releases bump the release number; hotfixes bump the patch.

## Guided Tour

If you want to see…

- **How labels are applied automatically** — open any merged PR (e.g., #1) and look at the Labels and the Checks tab.
- **How a multi-area PR appears in two places** — see PR #6 (touches frontend + backend) and find it in both sections of release [468.0](../../releases).
- **The full rendered release notes** — read release [468.0](../../releases).
- **How an empty area is suppressed** — compare 468.0 (has Infrastructure) with 469.0 (does not).
- **How the hotfix flow works** — see PR #11 merged into `release/467` and the resulting [467.1 release](../../releases).
- **The implementation** — read `.github/workflows/release-notes.yml` and `.github/scripts/draft-release-notes.js`.
- **The labeling rules** — read `.github/labeler.yml` (area paths) and `.github/pr-labeler.yml` (title prefixes).
- **The full design rationale** — read [`docs/superpowers/specs/2026-05-01-release-notes-automation-design.md`](docs/superpowers/specs/2026-05-01-release-notes-automation-design.md).

> Links to specific PRs and releases are filled in after the showcase walkthrough is run. Check the [Releases](../../releases) and [Pull Requests](../../pulls?q=is%3Apr) tabs to navigate the artifacts.
```

- [ ] **Step 3: Verify the file exists and renders**

Run:
```bash
ls -la README.md
head -5 README.md
```
Expected: file is ~50 lines, starts with `# Release Notes Example`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add top-level README with guided tour template"
```

---

## Task 2: Create the three package README placeholders

**Files:**
- Create: `frontend/README.md`
- Create: `backend/README.md`
- Create: `infra/README.md`

**Why:** They're the targets the path-based labeler uses to detect area. Even though they're placeholders, they need to exist so the directories aren't empty (git doesn't track empty directories).

- [ ] **Step 1: Create frontend placeholder**

Create `frontend/README.md`:
```markdown
# Frontend (placeholder)

A pretend React + Vite app. There's no actual code here — this README exists so:

1. The `frontend/` directory exists in git.
2. PRs that modify this file (or any file under `frontend/`) get the `frontend` label automatically via [`actions/labeler`](../.github/labeler.yml).

In a real version of this monorepo, this directory would contain the web client.
```

- [ ] **Step 2: Create backend placeholder**

Create `backend/README.md`:
```markdown
# Backend (placeholder)

A pretend HTTP API service. There's no actual code here — this README exists so:

1. The `backend/` directory exists in git.
2. PRs that modify this file (or any file under `backend/`) get the `backend` label automatically via [`actions/labeler`](../.github/labeler.yml).

In a real version of this monorepo, this directory would contain the API server.
```

- [ ] **Step 3: Create infra placeholder**

Create `infra/README.md`:
```markdown
# Infrastructure (placeholder)

Pretend Terraform / Kubernetes manifests. There's no actual code here — this README exists so:

1. The `infra/` directory exists in git.
2. PRs that modify this file (or any file under `infra/`) get the `infra` label automatically via [`actions/labeler`](../.github/labeler.yml).

In a real version of this monorepo, this directory would contain infrastructure-as-code.
```

- [ ] **Step 4: Verify all three files exist**

Run:
```bash
ls -la frontend/README.md backend/README.md infra/README.md
```
Expected: three files, all non-empty.

- [ ] **Step 5: Commit**

```bash
git add frontend/README.md backend/README.md infra/README.md
git commit -m "docs: add placeholder READMEs for frontend, backend, infra"
```

---

## Task 3: Create the actions/labeler config

**Files:**
- Create: `.github/labeler.yml`

**Why:** Tells `actions/labeler@v5` which area label to apply based on changed file paths.

- [ ] **Step 1: Create the config**

Create `.github/labeler.yml`:
```yaml
frontend:
  - changed-files:
      - any-glob-to-any-file: ['frontend/**']

backend:
  - changed-files:
      - any-glob-to-any-file: ['backend/**']

infra:
  - changed-files:
      - any-glob-to-any-file: ['infra/**']
```

- [ ] **Step 2: Verify YAML is valid**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/labeler.yml')); print('OK')"
```
Expected: prints `OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/labeler.yml
git commit -m "ci: add actions/labeler config for area labels"
```

---

## Task 4: Create the pr-labeler-action config

**Files:**
- Create: `.github/pr-labeler.yml`

**Why:** Tells `TimonVS/pr-labeler-action@v5` which type label to apply based on the PR title's conventional commit prefix.

- [ ] **Step 1: Create the config**

Create `.github/pr-labeler.yml`:
```yaml
feature:  ['feat: *', 'feat(*)*: *']
fix:      ['fix: *', 'fix(*)*: *']
docs:     ['docs: *', 'docs(*)*: *']
chore:    ['chore: *', 'chore(*)*: *']
refactor: ['refactor: *', 'refactor(*)*: *']
perf:     ['perf: *', 'perf(*)*: *']
test:     ['test: *', 'test(*)*: *']
ci:       ['build: *', 'build(*)*: *', 'ci: *', 'ci(*)*: *']
style:    ['style: *', 'style(*)*: *']
```

- [ ] **Step 2: Verify YAML is valid**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/pr-labeler.yml')); print('OK')"
```
Expected: prints `OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/pr-labeler.yml
git commit -m "ci: add pr-labeler-action config for type labels"
```

---

## Task 5: Create the labeling workflow

**Files:**
- Create: `.github/workflows/label-pr.yml`

**Why:** Runs both labelers on PR open/edit/sync events so labels appear automatically.

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/label-pr.yml`:
```yaml
name: Label PR

on:
  pull_request:
    types: [opened, edited, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  area:
    name: Apply area labels (paths)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5
        with:
          configuration-path: .github/labeler.yml
          sync-labels: true

  type:
    name: Apply type label (title)
    runs-on: ubuntu-latest
    steps:
      - uses: TimonVS/pr-labeler-action@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          configuration-path: .github/pr-labeler.yml
```

- [ ] **Step 2: Verify YAML is valid**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/label-pr.yml')); print('OK')"
```
Expected: prints `OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/label-pr.yml
git commit -m "ci: add workflow that labels PRs by path and title"
```

---

## Task 6: TDD for `version.js` — write failing tests

**Files:**
- Create: `.github/scripts/__tests__/version.test.js`

**Why:** Versioning logic is the easiest piece to get wrong (off-by-one, regex bugs). Test it first.

- [ ] **Step 1: Create the test file**

Create `.github/scripts/__tests__/version.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { nextVersion } = require('../version.js');

test('regular release: bumps RELEASE when anchor exists', () => {
  const result = nextVersion({ branch: 'main', publishedTags: ['467.0', '466.0'] });
  assert.deepEqual(result, { mode: 'regular', tag: '468.0', anchorTag: '467.0' });
});

test('regular release: picks highest RELEASE among many', () => {
  const result = nextVersion({ branch: 'main', publishedTags: ['467.0', '470.0', '465.0'] });
  assert.deepEqual(result, { mode: 'regular', tag: '471.0', anchorTag: '470.0' });
});

test('regular release: ignores patch tags when picking anchor', () => {
  const result = nextVersion({ branch: 'main', publishedTags: ['467.0', '467.3'] });
  assert.deepEqual(result, { mode: 'regular', tag: '468.0', anchorTag: '467.0' });
});

test('regular release: bootstrap when no .0 tags exist', () => {
  const result = nextVersion({ branch: 'main', publishedTags: [] });
  assert.deepEqual(result, { mode: 'regular', tag: '1.0', anchorTag: null });
});

test('regular release: bootstrap when only patch tags exist', () => {
  const result = nextVersion({ branch: 'main', publishedTags: ['467.1', '467.2'] });
  assert.deepEqual(result, { mode: 'regular', tag: '1.0', anchorTag: null });
});

test('hotfix: bumps PATCH within the lineage', () => {
  const result = nextVersion({ branch: 'release/467', publishedTags: ['467.0', '467.1', '468.0'] });
  assert.deepEqual(result, { mode: 'hotfix', tag: '467.2', anchorTag: '467.1' });
});

test('hotfix: anchor is .0 when no patches yet', () => {
  const result = nextVersion({ branch: 'release/467', publishedTags: ['467.0', '468.0'] });
  assert.deepEqual(result, { mode: 'hotfix', tag: '467.1', anchorTag: '467.0' });
});

test('hotfix: bootstrap when no tags in lineage', () => {
  const result = nextVersion({ branch: 'release/467', publishedTags: ['468.0'] });
  assert.deepEqual(result, { mode: 'hotfix', tag: '467.1', anchorTag: null });
});

test('hotfix: ignores other release lines when picking anchor', () => {
  const result = nextVersion({ branch: 'release/467', publishedTags: ['467.0', '468.5', '466.9'] });
  assert.deepEqual(result, { mode: 'hotfix', tag: '467.1', anchorTag: '467.0' });
});

test('throws on unsupported branch', () => {
  assert.throws(
    () => nextVersion({ branch: 'feature/foo', publishedTags: [] }),
    /Unsupported branch/,
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
node --test .github/scripts/__tests__/version.test.js
```
Expected: all tests FAIL with "Cannot find module '../version.js'".

---

## Task 7: Implement `version.js` to make tests pass

**Files:**
- Create: `.github/scripts/version.js`

- [ ] **Step 1: Write the implementation**

Create `.github/scripts/version.js`:
```js
function nextVersion({ branch, publishedTags }) {
  if (branch === 'main') {
    const releases = publishedTags
      .filter((t) => /^\d+\.0$/.test(t))
      .map((t) => parseInt(t.split('.')[0], 10))
      .sort((a, b) => b - a);
    if (releases.length === 0) {
      return { mode: 'regular', tag: '1.0', anchorTag: null };
    }
    const anchor = releases[0];
    return { mode: 'regular', tag: `${anchor + 1}.0`, anchorTag: `${anchor}.0` };
  }

  const m = branch.match(/^release\/(\d+)$/);
  if (m) {
    const N = parseInt(m[1], 10);
    const lineageRe = new RegExp(`^${N}\\.\\d+$`);
    const patches = publishedTags
      .filter((t) => lineageRe.test(t))
      .map((t) => parseInt(t.split('.')[1], 10))
      .sort((a, b) => b - a);
    if (patches.length === 0) {
      return { mode: 'hotfix', tag: `${N}.1`, anchorTag: null };
    }
    const anchor = patches[0];
    return { mode: 'hotfix', tag: `${N}.${anchor + 1}`, anchorTag: `${N}.${anchor}` };
  }

  throw new Error(`Unsupported branch: ${branch}`);
}

module.exports = { nextVersion };
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
node --test .github/scripts/__tests__/version.test.js
```
Expected: all 10 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add .github/scripts/version.js .github/scripts/__tests__/version.test.js
git commit -m "feat: add version.js with regular + hotfix + bootstrap logic"
```

---

## Task 8: TDD for `render-notes.js` — write failing tests

**Files:**
- Create: `.github/scripts/__tests__/render-notes.test.js`

**Why:** Rendering has many branches (suppression at multiple levels, multi-area duplication, contributor list, prefix stripping). Tests catch regressions when emoji/heading order changes.

- [ ] **Step 1: Create the test file**

Create `.github/scripts/__tests__/render-notes.test.js`:
```js
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
  // PR appears under both
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
  // Maintenance heading should appear ONCE in the Frontend section
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

test('renders contributors footer with deduplicated authors sorted', () => {
  const md = renderReleaseNotes({
    ...baseConfig,
    prs: [
      pr(1, 'feat: a', 'alice', ['frontend', 'feature']),
      pr(2, 'fix: b', 'bob',   ['frontend', 'fix']),
      pr(3, 'feat: c', 'alice', ['backend', 'feature']),
    ],
  });
  assert.match(md, /## 🙌 Contributors/);
  assert.match(md, /Thanks to @alice, @bob for their contributions to this release!/);
});

test('omits contributors heading when no PRs', () => {
  const md = renderReleaseNotes({ ...baseConfig, prs: [] });
  assert.doesNotMatch(md, /## 🙌 Contributors/);
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
node --test .github/scripts/__tests__/render-notes.test.js
```
Expected: all 14 tests FAIL with "Cannot find module '../render-notes.js'".

---

## Task 9: Implement `render-notes.js` to make tests pass

**Files:**
- Create: `.github/scripts/render-notes.js`

- [ ] **Step 1: Write the implementation**

Create `.github/scripts/render-notes.js`:
```js
const CONVENTIONAL_PREFIX = /^(feat|fix|docs|chore|refactor|perf|test|build|ci|style)(\([^)]+\))?:\s*/i;

function stripPrefix(title) {
  return title.replace(CONVENTIONAL_PREFIX, '');
}

function bucketTypeFor(prLabels, typeOrder) {
  for (const t of typeOrder) {
    const labels = t.labels || [t.label];
    if (labels.some((l) => prLabels.includes(l))) return t.heading;
  }
  return null;
}

function bucketAreasFor(prLabels, areaOrder) {
  const areas = areaOrder.filter((a) => prLabels.includes(a.label)).map((a) => a.heading);
  return areas;
}

function groupPRs({ prs, areaOrder, otherAreaHeading, typeOrder, otherTypeHeading }) {
  // areaHeading -> typeHeading -> [pr...]
  const grouped = new Map();

  function ensure(area, type) {
    if (!grouped.has(area)) grouped.set(area, new Map());
    if (!grouped.get(area).has(type)) grouped.get(area).set(type, []);
    return grouped.get(area).get(type);
  }

  for (const pr of prs) {
    const areas = bucketAreasFor(pr.labels, areaOrder);
    const type = bucketTypeFor(pr.labels, typeOrder) || otherTypeHeading;
    const areaList = areas.length ? areas : [otherAreaHeading];
    for (const area of areaList) {
      ensure(area, type).push(pr);
    }
  }
  return grouped;
}

function renderArea(areaHeading, typeBuckets, typeOrder, otherTypeHeading) {
  const lines = [`## ${areaHeading}`, ''];
  const orderedTypes = [...typeOrder.map((t) => t.heading), otherTypeHeading];
  let any = false;
  for (const typeHeading of orderedTypes) {
    const prs = typeBuckets.get(typeHeading);
    if (!prs || prs.length === 0) continue;
    any = true;
    lines.push(`### ${typeHeading}`);
    for (const pr of prs) {
      lines.push(`- ${stripPrefix(pr.title)} by @${pr.author} in #${pr.number}`);
    }
    lines.push('');
  }
  return any ? lines.join('\n') : '';
}

function renderReleaseNotes({
  prs,
  areaOrder,
  otherAreaHeading,
  typeOrder,
  otherTypeHeading,
  repoUrl,
  anchorTag,
  nextTag,
}) {
  if (prs.length === 0) return '_No changes yet._';

  const grouped = groupPRs({ prs, areaOrder, otherAreaHeading, typeOrder, otherTypeHeading });

  const orderedAreas = [...areaOrder.map((a) => a.heading), otherAreaHeading];
  const sections = [];
  for (const areaHeading of orderedAreas) {
    const typeBuckets = grouped.get(areaHeading);
    if (!typeBuckets) continue;
    const rendered = renderArea(areaHeading, typeBuckets, typeOrder, otherTypeHeading);
    if (rendered) sections.push(rendered);
  }

  // Contributors
  if (prs.length > 0) {
    const authors = [...new Set(prs.map((p) => p.author))].sort();
    sections.push(`## 🙌 Contributors\nThanks to ${authors.map((a) => `@${a}`).join(', ')} for their contributions to this release!\n`);
  }

  // Compare link
  if (anchorTag) {
    sections.push(`---\n**Full Changelog**: ${repoUrl}/compare/${anchorTag}...${nextTag}`);
  }

  return sections.join('\n');
}

module.exports = { renderReleaseNotes, stripPrefix, groupPRs };
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
node --test .github/scripts/__tests__/render-notes.test.js
```
Expected: all 14 tests PASS.

- [ ] **Step 3: Run all tests together as a smoke check**

Run:
```bash
node --test .github/scripts/__tests__/
```
Expected: 24 tests pass total (10 version + 14 render).

- [ ] **Step 4: Commit**

```bash
git add .github/scripts/render-notes.js .github/scripts/__tests__/render-notes.test.js
git commit -m "feat: add render-notes.js with nested area→type rendering"
```

---

## Task 10: Implement the orchestrator `draft-release-notes.js`

**Files:**
- Create: `.github/scripts/draft-release-notes.js`

**Why:** Thin glue that talks to GitHub API. Heavy lifting already lives in `version.js` and `render-notes.js`. Manual integration test via the showcase walkthrough validates this end-to-end — no unit test needed since it's just API calls.

- [ ] **Step 1: Write the orchestrator**

Create `.github/scripts/draft-release-notes.js`:
```js
const { nextVersion } = require('./version.js');
const { renderReleaseNotes } = require('./render-notes.js');

const AREA_ORDER = [
  { label: 'frontend', heading: '🎨 Frontend' },
  { label: 'backend',  heading: '⚙️ Backend' },
  { label: 'infra',    heading: '🏗️ Infrastructure' },
];
const OTHER_AREA_HEADING = '📦 Other Changes';

const TYPE_ORDER = [
  { label: 'feature', heading: '🚀 Features' },
  { label: 'fix',     heading: '🐛 Bug Fixes' },
  { label: 'docs',    heading: '📚 Documentation' },
  { labels: ['chore', 'refactor', 'perf', 'test', 'ci', 'style'],
    heading: '🧰 Maintenance' },
];
const OTHER_TYPE_HEADING = '📦 Other Changes';

function branchFromRef(ref) {
  return ref.replace(/^refs\/heads\//, '');
}

async function listAllPublishedTags(github, owner, repo) {
  const tags = [];
  for await (const { data } of github.paginate.iterator(github.rest.repos.listReleases, {
    owner, repo, per_page: 100,
  })) {
    for (const r of data) {
      if (!r.draft && !r.prerelease) tags.push(r.tag_name);
    }
  }
  return tags;
}

async function findReleaseByTag(github, owner, repo, tag) {
  for await (const { data } of github.paginate.iterator(github.rest.repos.listReleases, {
    owner, repo, per_page: 100,
  })) {
    for (const r of data) {
      if (r.tag_name === tag) return r;
    }
  }
  return null;
}

async function listMergedPRsSince(github, owner, repo, base, sinceISO) {
  const prs = [];
  for await (const { data } of github.paginate.iterator(github.rest.pulls.list, {
    owner, repo, state: 'closed', base, sort: 'updated', direction: 'desc', per_page: 100,
  })) {
    for (const pr of data) {
      if (!pr.merged_at) continue;
      if (sinceISO && pr.merged_at <= sinceISO) return prs;
      prs.push(pr);
    }
  }
  return prs;
}

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const branch = branchFromRef(context.ref);

  const publishedTags = await listAllPublishedTags(github, owner, repo);
  const { mode, tag: nextTag, anchorTag } = nextVersion({ branch, publishedTags });

  let sinceISO = null;
  if (anchorTag) {
    const anchor = await findReleaseByTag(github, owner, repo, anchorTag);
    sinceISO = anchor?.published_at || anchor?.created_at || null;
  }

  const rawPRs = await listMergedPRsSince(github, owner, repo, branch, sinceISO);
  const prs = rawPRs.map((pr) => ({
    number: pr.number,
    title: pr.title,
    author: pr.user?.login || 'unknown',
    labels: (pr.labels || []).map((l) => l.name),
  }));

  const repoUrl = `https://github.com/${owner}/${repo}`;
  const body = renderReleaseNotes({
    prs,
    areaOrder: AREA_ORDER,
    otherAreaHeading: OTHER_AREA_HEADING,
    typeOrder: TYPE_ORDER,
    otherTypeHeading: OTHER_TYPE_HEADING,
    repoUrl,
    anchorTag,
    nextTag,
  });

  const existing = await findReleaseByTag(github, owner, repo, nextTag);
  let release;
  if (existing && existing.draft) {
    const { data } = await github.rest.repos.updateRelease({
      owner, repo, release_id: existing.id, body,
    });
    release = data;
  } else if (!existing) {
    const { data } = await github.rest.repos.createRelease({
      owner, repo, tag_name: nextTag, name: nextTag, body, draft: true,
      target_commitish: branch,
    });
    release = data;
  } else {
    core.info(`Release ${nextTag} is already published; skipping update.`);
    release = existing;
  }

  core.setOutput('draft_url', release.html_url);
  core.setOutput('next_version', nextTag);
  core.setOutput('mode', mode);
  core.info(`${mode} draft for ${nextTag}: ${release.html_url}`);
};
```

- [ ] **Step 2: Verify it parses without runtime errors**

Run:
```bash
node -e "require('./.github/scripts/draft-release-notes.js'); console.log('OK')"
```
Expected: prints `OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/scripts/draft-release-notes.js
git commit -m "feat: add draft-release-notes orchestrator"
```

---

## Task 11: Create the release-notes workflow

**Files:**
- Create: `.github/workflows/release-notes.yml`

**Why:** Triggers the orchestrator on every push to `main` or `release/*` and on manual dispatch.

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/release-notes.yml`:
```yaml
name: Release Notes

on:
  push:
    branches: [main, 'release/*']
  workflow_dispatch: {}

permissions:
  contents: write
  pull-requests: read

jobs:
  draft:
    name: Draft release notes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Update draft release
        uses: actions/github-script@v7
        with:
          script: |
            const fn = require('./.github/scripts/draft-release-notes.js');
            await fn({ github, context, core });
```

- [ ] **Step 2: Verify YAML is valid**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release-notes.yml')); print('OK')"
```
Expected: prints `OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release-notes.yml
git commit -m "ci: add release-notes workflow that runs the orchestrator"
```

---

## Task 12: Add a final test sweep + project README link to the spec

**Files:**
- Modify: `README.md` (add a "How to verify locally" hint)

**Why:** Visitors who clone the repo will want to know how to run the test suite.

- [ ] **Step 1: Run all tests**

Run:
```bash
node --test .github/scripts/__tests__/
```
Expected: 24 tests pass.

- [ ] **Step 2: Append a "Local verification" section to the top-level README**

Edit `README.md`, add this section just before the `## Guided Tour` section:

```markdown
## Local verification

The release-notes generator is plain Node with no dependencies. Run the unit tests with:

```bash
node --test .github/scripts/__tests__/
```

Expected: 24 tests pass (versioning + rendering).

```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add local verification instructions to README"
```

---

## Task 13: Create the GitHub repo and push

**Files:** None (remote operation)

**Why:** Move the local repo to GitHub so workflows can run.

- [ ] **Step 1: Create the GitHub repository**

Run (substitute your handle if different):
```bash
gh repo create rreicks/release-notes-example --public --source=. --remote=origin --description "Showcase: automated release notes for a same-cadence monorepo"
```

- [ ] **Step 2: Push main**

Run:
```bash
git push -u origin main
```

- [ ] **Step 3: Verify GitHub sees it**

Run:
```bash
gh repo view --web
```
Expected: opens the repo in a browser.

---

## Task 14: Bootstrap labels on the GitHub repo

**Files:** None (remote operation)

**Why:** The labelers fail silently if labels don't exist. Must run before opening any PRs.

- [ ] **Step 1: Delete colliding default labels**

Run:
```bash
gh label delete bug --yes || true
gh label delete documentation --yes || true
```

- [ ] **Step 2: Create area labels (warm-gray palette)**

Run:
```bash
gh label create frontend --color 7d8db8 --description "Touches frontend/"
gh label create backend  --color 7da8b8 --description "Touches backend/"
gh label create infra    --color 7db89e --description "Touches infra/"
```

- [ ] **Step 3: Create type labels (semantic palette)**

Run:
```bash
gh label create feature  --color 0e8a16 --description "feat:"
gh label create fix      --color d73a4a --description "fix:"
gh label create docs     --color 0075ca --description "docs:"
gh label create chore    --color cfd3d7 --description "chore:"
gh label create refactor --color cfd3d7 --description "refactor:"
gh label create perf     --color cfd3d7 --description "perf:"
gh label create test     --color cfd3d7 --description "test:"
gh label create ci       --color cfd3d7 --description "build: / ci:"
gh label create style    --color cfd3d7 --description "style:"
```

- [ ] **Step 4: Verify labels exist**

Run:
```bash
gh label list
```
Expected: 12 custom labels listed (3 area + 9 type).

---

## Task 15: Seed the `467.0` baseline release

**Files:** None (remote operation)

**Why:** Without this anchor, the first workflow run produces a `1.0` draft (bootstrap mode). The seed makes the first regular run produce `468.0`, which demonstrates the version-computation behavior.

- [ ] **Step 1: Create and publish 467.0 release**

Run:
```bash
gh release create 467.0 \
  --target main \
  --title "467.0" \
  --notes "Initial baseline release for the showcase. No automated notes — this is the anchor."
```

- [ ] **Step 2: Verify the release is published (not draft)**

Run:
```bash
gh release view 467.0 --json isDraft,tagName
```
Expected: `{"isDraft": false, "tagName": "467.0"}`.

---

## Task 16: Run Cycle 1 of the showcase walkthrough

**Files:** Multiple (one PR per file edit)

**Why:** Generates the first set of demo artifacts (8 PRs hitting every code path).

For each PR below: create a feature branch from `main`, edit the indicated file (any small change is fine), commit, push, open PR via `gh pr create`, wait ~30s for labels to appear, verify, then merge.

Generic command sequence per PR (adapt the title and file):

```bash
git checkout main && git pull
git checkout -b <branch-name>
echo "<some change>" >> <file>
git add <file>
git commit -m "<conventional-commit-title>"
git push -u origin <branch-name>
gh pr create --title "<conventional-commit-title>" --body "Showcase PR for the release-notes demo." --base main
# wait ~30s
gh pr view --json labels   # verify labels applied
gh pr merge --squash --delete-branch
```

- [ ] **Step 1: PR #1 — `feat: add sign-up button`** — modify `frontend/README.md`. Expect labels: `frontend`, `feature`.

- [ ] **Step 2: PR #2 — `fix: correct error toast color`** — modify `frontend/README.md`. Expect labels: `frontend`, `fix`.

- [ ] **Step 3: PR #3 — `feat: add /signup endpoint`** — modify `backend/README.md`. Expect labels: `backend`, `feature`.

- [ ] **Step 4: PR #4 — `chore: bump tailwind to v4`** — modify `frontend/README.md`. Expect labels: `frontend`, `chore`.

- [ ] **Step 5: PR #5 — `docs: document IAM role rotation`** — modify `infra/README.md`. Expect labels: `infra`, `docs`.

- [ ] **Step 6: PR #6 — `feat: end-to-end signup flow`** — modify BOTH `frontend/README.md` AND `backend/README.md` in the same commit. Expect labels: `frontend`, `backend`, `feature`.

- [ ] **Step 7: PR #7 — `update top-level README badges`** — modify only `README.md` (root). Non-conventional title. Expect: NO labels (no area, no type).

- [ ] **Step 8: PR #8 — `refactor(backend): extract auth middleware`** — modify `backend/README.md`. Expect labels: `backend`, `refactor`. (Validates scoped conventional commits.)

- [ ] **Step 9: After all eight merges, verify the draft `468.0` release**

Run:
```bash
gh release view 468.0
```
Expected: a draft release with the nested format showing every section (Frontend / Backend / Infrastructure / Other Changes), Maintenance roll-up working, multi-area PR appearing in both frontend and backend, contributors footer, and full-changelog link to `467.0...468.0`.

- [ ] **Step 10: Publish 468.0**

Run:
```bash
gh release edit 468.0 --draft=false
```

---

## Task 17: Run Cycle 2 (no infra) of the showcase

**Why:** Demonstrates that the Infrastructure heading is suppressed when there are no infra PRs.

- [ ] **Step 1: PR #9 — `feat: remember-me checkbox`** — modify `frontend/README.md`. Expect labels: `frontend`, `feature`.

- [ ] **Step 2: PR #10 — `fix: handle empty signup payload`** — modify `backend/README.md`. Expect labels: `backend`, `fix`.

- [ ] **Step 3: After both merges, verify the draft `469.0` release**

Run:
```bash
gh release view 469.0
```
Expected: a draft release with `## 🎨 Frontend` and `## ⚙️ Backend` sections only — **no `## 🏗️ Infrastructure` heading**. Compare with `468.0` to see suppression.

- [ ] **Step 4: Publish 469.0**

Run:
```bash
gh release edit 469.0 --draft=false
```

---

## Task 18: Run the hotfix flow

**Why:** Demonstrates that pushes to `release/<N>` produce a hotfix draft `<N>.<patch+1>`.

- [ ] **Step 1: Cut `release/467` from the `467.0` tag**

Run:
```bash
git fetch --tags
git branch release/467 467.0
git push origin release/467
```

- [ ] **Step 2: Open hotfix PR #11 — `fix: critical signup token leak`** — base branch must be `release/467`, not `main`.

```bash
git checkout release/467 && git pull
git checkout -b hotfix/signup-token
echo "Hotfix description" >> backend/README.md
git add backend/README.md
git commit -m "fix: critical signup token leak"
git push -u origin hotfix/signup-token
gh pr create --title "fix: critical signup token leak" --body "Hotfix demo PR." --base release/467
# wait ~30s
gh pr view --json labels   # expect: backend, fix
gh pr merge --squash --delete-branch
```

- [ ] **Step 3: Verify the draft `467.1` release**

Run:
```bash
gh release view 467.1
```
Expected: a draft release with one PR under `## ⚙️ Backend → ### 🐛 Bug Fixes`, full-changelog link `467.0...467.1`.

- [ ] **Step 4: Publish 467.1**

Run:
```bash
gh release edit 467.1 --draft=false
```

---

## Task 19: Backfill the Guided Tour links in the README

**Files:**
- Modify: `README.md`

**Why:** The Guided Tour has placeholder links. Now that the artifacts exist, fill them in with real PR/release URLs so visitors can click straight through.

- [ ] **Step 1: Gather URLs**

Run:
```bash
gh release view 468.0 --json url
gh release view 469.0 --json url
gh release view 467.1 --json url
gh pr view 6 --json url
gh pr view 11 --json url
```
Note the URLs.

- [ ] **Step 2: Update the Guided Tour in `README.md`**

Replace the `(link)` and `../../releases` placeholders in the Guided Tour with the actual URLs gathered in Step 1.

- [ ] **Step 3: Commit and push**

```bash
git checkout main && git pull
git add README.md
git commit -m "docs: backfill guided tour with actual PR and release links"
git push
```

---

## Verification Checklist

When all tasks are complete, the showcase repo should have:

- [ ] 4 published releases visible in the Releases tab: `467.0`, `467.1`, `468.0`, `469.0`
- [ ] 11 merged PRs visible across `main` (10) and `release/467` (1)
- [ ] Each merged PR has 0–3 labels visible (some intentionally have none, like PR #7)
- [ ] Release `468.0` has Frontend, Backend, Infrastructure, Other Changes sections; Maintenance roll-up; PR #6 appears under both Frontend and Backend; contributors footer with @rreicks; full changelog link 467.0...468.0
- [ ] Release `469.0` has Frontend and Backend sections but NO Infrastructure heading
- [ ] Release `467.1` is a hotfix with just PR #11 under Backend / Bug Fixes
- [ ] Top-level README's Guided Tour has working links to specific PRs and releases
- [ ] `node --test .github/scripts/__tests__/` passes 24 tests locally
