# Release Notes Automation — Design Spec

**Date:** 2026-05-01
**Status:** Approved (pending user review of this written spec)
**Owner:** rreicks

## Goal

Build a monorepo showcase repo that demonstrates an end-to-end automated release notes workflow optimized for a release manager. The release manager should only need two actions per release: read the auto-generated draft and click **Publish**.

## Motivation

In a same-cadence monorepo (every package promotes to production on the same schedule), the release manager has to assemble release notes by hand: scanning merged PRs, grouping by area and change type, collating contributors, and tracking hotfixes separately. This is repetitive, error-prone, and slow.

This showcase demonstrates that all of that can be automated with stock GitHub tooling plus one small custom script — no fork, no third-party SaaS, no SSH keys to manage.

## Out of scope

- Real application code in `frontend/`, `backend/`, `infra/` (these are README placeholders only).
- Automated cherry-picking of hotfix PRs back to `main` (manual / convention).
- Cutting release branches (manual; could be a follow-on script).
- Publishing the draft (manual click; could be automated later).
- Slack/email notification of new drafts (not part of this showcase).

## Repository structure

```
release-notes-example/
├── README.md                            # explains what this repo demonstrates + setup steps
├── frontend/
│   └── README.md                        # placeholder — fake React app description
├── backend/
│   └── README.md                        # placeholder — fake API service description
├── infra/
│   └── README.md                        # placeholder — fake Terraform/k8s description
└── .github/
    ├── labeler.yml                      # actions/labeler config (path → area)
    ├── pr-labeler.yml                   # TimonVS/pr-labeler-action config (title → type)
    ├── scripts/
    │   └── draft-release-notes.js       # ~100-line github-script module
    └── workflows/
        ├── label-pr.yml                 # runs both labelers on PR open/edit/sync
        └── release-notes.yml            # runs draft-release-notes.js on push/dispatch
```

## Labels

The repo defines two label families. Labels must exist in the repo before they can be applied; bootstrap them manually via the GitHub UI or document a one-time `gh label create` script in the README.

Labels are unprefixed (no `area:` / `type:` namespacing). To distinguish area from type at a glance, the two families use different color palettes (see Colors below).

### Area labels (path-driven)

| Label | Applied when changes touch |
|---|---|
| `frontend` | `frontend/**` |
| `backend`  | `backend/**` |
| `infra`    | `infra/**` |

A PR touching multiple areas gets multiple area labels and appears under each area in the release notes (one bullet per area, same PR).
A PR touching none of the three (e.g., root-level changes) gets no area label and appears under top-level "Other Changes".

### Type labels (title-driven, conventional commits)

Label names mirror the conventional commit prefix to keep things one-to-one and to avoid colliding with GitHub's default `bug` / `documentation` labels.

| Label | Applied when PR title starts with |
|---|---|
| `feature`  | `feat:` or `feat(…):` |
| `fix`      | `fix:` or `fix(…):` |
| `docs`     | `docs:` or `docs(…):` |
| `chore`    | `chore:` or `chore(…):` |
| `refactor` | `refactor:` or `refactor(…):` |
| `perf`     | `perf:` or `perf(…):` |
| `test`     | `test:` or `test(…):` |
| `ci`       | `build:`, `build(…):`, `ci:`, `ci(…):` |
| `style`    | `style:` or `style(…):` |

A PR with a non-conventional title gets no type label and falls into "Other Changes" within its area.

### Colors

Two palettes so a viewer can tell area-vs-type at a glance from a labeled PR.

| Family | Palette | Labels |
|---|---|---|
| Area | warm grays / muted | `frontend` `#7d8db8`, `backend` `#7da8b8`, `infra` `#7db89e` |
| Type | semantic | `feature` `#0e8a16` (green), `fix` `#d73a4a` (red), `docs` `#0075ca` (blue), `chore` / `refactor` / `perf` / `test` / `ci` / `style` `#cfd3d7` (neutral gray) |

GitHub's default `bug` and `documentation` labels can be deleted before bootstrap, since they're unused.

## Labeling workflow

**`.github/workflows/label-pr.yml`** runs on `pull_request` events `[opened, edited, synchronize]` with two parallel jobs:

1. `actions/labeler@v5` — reads `.github/labeler.yml`, applies area labels.
2. `TimonVS/pr-labeler-action@v5` — reads `.github/pr-labeler.yml`, applies type labels.

Permissions: `pull-requests: write`, `contents: read`.

## Release notes workflow

### Versioning scheme

`<RELEASE>.<PATCH>` — no `v` prefix, no major version.

- Tags: `467.0`, `467.1`, `468.0`
- Branches: `release/467`, `release/468`
- Regular releases bump the release number, patch resets to `0`.
- Hotfixes bump the patch within the release line.

### Triggers

```yaml
on:
  push:
    branches: [main, 'release/*']
  workflow_dispatch: {}
```

Permissions: `contents: write`, `pull-requests: read`.

### `draft-release-notes.js` logic

```
1. Determine mode from current branch:
   - main           → mode = regular, lineage = none
   - release/<N>    → mode = hotfix,  lineage = N

2. Find anchor — the latest **published GitHub Release** (not draft) whose tag matches:
   - regular: /^\d+\.0$/ → if none exists, bootstrap mode
   - hotfix:  /^<N>\.\d+$/ → if none exists, bootstrap mode
   Use the anchor release's tag commit SHA as the "since" point in step 4.
   Drafts are excluded from anchor selection so an in-progress draft doesn't anchor itself.

3. Compute next version:
   - regular w/ anchor:    (anchor.release + 1) + ".0"
   - regular bootstrap:    "1.0"
   - hotfix  w/ anchor:    "<N>." + (anchor.patch + 1)
   - hotfix  bootstrap:    "<N>.1"

4. Query merged PRs on current branch since anchor's commit
   (or all merged PRs ever, if bootstrap mode).

5. For each PR:
   - Read its area labels and type label.
   - Strip conventional commit prefix from title for cleanliness.

6. Group: { area: { type: [PRs] } }
   - Multi-area PR appears under each of its areas.
   - No-area PR goes to "Other Changes" top-level bucket.
   - No-type PR goes to "Other Changes" within its area bucket.

7. Render markdown using the template below.
   Skip any heading whose section is empty (at all levels).

8. Find existing draft release with target tag = next_version:
   - exists → PATCH body
   - missing → POST new draft (draft: true, tag_name: next_version)

9. Output the draft URL via core.setOutput for visibility.
```

### Display order constants (top of script, configurable)

```js
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
```

### Output template

```markdown
## 🎨 Frontend

### 🚀 Features
- add sign-up button by @rreicks in #42

### 🐛 Bug Fixes
- correct error toast color by @rreicks in #43

### 🧰 Maintenance
- bump tailwind to v4 by @rreicks in #44

## ⚙️ Backend

### 🚀 Features
- add /signup endpoint by @rreicks in #45

## 🏗️ Infrastructure

### 📚 Documentation
- document IAM role rotation by @rreicks in #46

## 📦 Other Changes
- update top-level README badges by @rreicks in #47

## 🙌 Contributors
Thanks to @rreicks, @other-dev for their contributions to this release!

---
**Full Changelog**: https://github.com/<owner>/<repo>/compare/467.0...468.0
```

Empty sections are suppressed at every level: if Frontend has no PRs, no `## 🎨 Frontend` heading appears; if Frontend has PRs but no Features, no `### 🚀 Features` subheading appears.

## Hotfix flow

1. Bug discovered in production release `467.0`.
2. Dev opens fix PR with `release/467` as the **base branch** (not `main`).
3. `label-pr.yml` runs on the PR — applies area + type labels normally (labelers don't care about base branch).
4. PR merges to `release/467`.
5. `release-notes.yml` runs on push to `release/467` → drafts `467.1` release.
6. Release manager opens Releases tab → reviews draft `467.1` → clicks **Publish**.
7. Dev (or release manager) is responsible for re-applying the fix to `main` via cherry-pick or a separate PR. This is convention, not automation.

## Release manager UX

| Event | Automatic | Release manager action |
|---|---|---|
| Dev opens PR | Labelers apply `area:` + `type:` | None |
| PR merges to `main` | Draft `<next>.0` updates | None |
| End of cycle | — | Read draft, optionally edit prose, cut `release/<N>` branch from `main`, click **Publish** |
| Hotfix PR merges to `release/467` | Draft `467.<next>` updates | None |
| Hotfix ready to ship | — | Read draft, click **Publish** |

Per-release manual actions: read + click Publish.

## Bootstrap behavior

The script handles the no-anchor case gracefully: default version `1.0` for regular runs, `<N>.1` for hotfix runs on a release branch with no prior tag. The showcase walkthrough below explicitly seeds a `467.0` release so this fallback is not exercised — but the safety net exists for any other adopter starting from scratch.

## Showcase walkthrough

This is the operator's runbook for setting up the demo repo so visitors can see every code path of the system in action. Once set up, the repo is left in place permanently as a living artifact.

### Step 0 — Bootstrap labels

Labels must exist in the repo before any labeler can apply them. Run once after creating the repo:

```bash
# Optional: delete GitHub's default labels we're replacing
gh label delete bug --yes
gh label delete documentation --yes

# Area labels (warm-gray palette)
gh label create frontend --color 7d8db8
gh label create backend  --color 7da8b8
gh label create infra    --color 7db89e

# Type labels (semantic palette)
gh label create feature  --color 0e8a16
gh label create fix      --color d73a4a
gh label create docs     --color 0075ca
gh label create chore    --color cfd3d7
gh label create refactor --color cfd3d7
gh label create perf     --color cfd3d7
gh label create test     --color cfd3d7
gh label create ci       --color cfd3d7
gh label create style    --color cfd3d7
```

### Step 1 — Create repo with mock contents

Initialize repo, add the four README placeholders (`./README.md`, `frontend/README.md`, `backend/README.md`, `infra/README.md`), the labeler configs, the workflows, and the script. Commit and push to `main`.

The top-level `README.md` includes a **Guided Tour** section (see below).

### Step 2 — Seed initial release `467.0`

```bash
gh release create 467.0 \
  --target main \
  --title "467.0" \
  --notes "Initial baseline release for the showcase."
```

This becomes the anchor for the next regular run.

### Step 3 — Cycle 1 PRs (rich, exercises every code path)

Open these PRs against `main`. Each will be auto-labeled within ~30 seconds.

| PR | Title | Touches | Demonstrates |
|---|---|---|---|
| #1 | `feat: add sign-up button` | `frontend/` | feature, single area |
| #2 | `fix: correct error toast color` | `frontend/` | bug, same area, different type |
| #3 | `feat: add /signup endpoint` | `backend/` | feature, different area |
| #4 | `chore: bump tailwind to v4` | `frontend/` | chore → rolls up under Maintenance |
| #5 | `docs: document IAM role rotation` | `infra/` | docs section, infra area appears |
| #6 | `feat: end-to-end signup flow` | `frontend/` + `backend/` | multi-area PR appears under both |
| #7 | `update top-level README badges` | repo root | non-conventional title + no area → top-level "Other Changes" |
| #8 | `refactor(backend): extract auth middleware` | `backend/` | scoped conventional commit, prefix-stripping verified |

### Step 4 — Merge all Cycle 1 PRs

After each merge, `release-notes.yml` runs and updates the draft `468.0` release. Refreshing the Releases tab between merges visibly grows the draft — good demo moment.

### Step 5 — Publish `468.0`

Open Releases tab → review draft `468.0` → click **Publish**.

### Step 6 — Cycle 2 PRs (no infra → demonstrates heading suppression)

Open a smaller set against `main` that intentionally skips `infra/`:

| PR | Title | Touches | Demonstrates |
|---|---|---|---|
| #9  | `feat: remember-me checkbox` | `frontend/` | new cycle, frontend only |
| #10 | `fix: handle empty signup payload` | `backend/` | bug in backend |

Merge both. Draft `469.0` forms with `## 🎨 Frontend` and `## ⚙️ Backend` sections only — **no `## 🏗️ Infrastructure` heading**, since suppression kicks in. Compare with `468.0` to see the difference. Publish `469.0`.

### Step 7 — Cut `release/467` branch for the hotfix

```bash
git branch release/467 467.0
git push origin release/467
```

### Step 8 — Hotfix PR against `release/467`

Open one PR with `release/467` as the **base branch**:

| PR | Title | Touches | Demonstrates |
|---|---|---|---|
| #11 | `fix: critical signup token leak` | `backend/` | hotfix flow on a release branch |

It auto-labels (`area: backend`, `type: bug`). Merge it. `release-notes.yml` runs on `release/467` → drafts `467.1` release with just this one PR. Publish `467.1`.

### Final state — what's visible to a visitor

- Three published releases: `467.0` (seed), `468.0` (rich cycle), `469.0` (no-infra cycle), `467.1` (hotfix)
- Eleven labeled, merged PRs across `main` and `release/467`
- Three workflow files + one script — readable end-to-end
- Top-level README with the Guided Tour pointing at all of the above

## Top-level README guided tour

The repo's `README.md` includes a **Guided Tour** section that lets a first-time visitor navigate the artifacts in a sensible order. Suggested structure:

```markdown
## Guided Tour

If you want to see…

- **How labels are applied automatically** — open [PR #1](link) and look at the
  Labels and the "Checks" tab showing the labeler runs.
- **How a multi-area PR appears in two places** — see [PR #6](link) (touches
  frontend + backend) and find it in both sections of release [468.0](link).
- **The full rendered release notes** — read release [468.0](link).
- **How an empty area is suppressed** — compare [468.0](link) (has Infrastructure)
  with [469.0](link) (does not).
- **How the hotfix flow works** — see [PR #11](link) merged into `release/467`
  and the resulting [467.1 release](link).
- **The implementation** — read `.github/workflows/release-notes.yml` and
  `.github/scripts/draft-release-notes.js`.
- **The labeling rules** — read `.github/labeler.yml` (area paths) and
  `.github/pr-labeler.yml` (title prefixes).
- **The full design rationale** — read `docs/superpowers/specs/2026-05-01-release-notes-automation-design.md`.
```

## Open questions / followups

- **Upstream contribution:** if this pattern proves useful, the `draft-release-notes.js` script could be packaged as a reusable composite action for other monorepos. Out of scope for v1.
- **Auto-publish:** future enhancement could auto-publish drafts on a schedule (e.g., every Friday at 4pm) instead of requiring a manual click.
- **Slack notification:** posting "draft 468.0 ready for review" to a channel would close the loop for distributed teams.
