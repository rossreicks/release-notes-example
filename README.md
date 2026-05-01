# Release Notes Example

A monorepo showcase for **fully automated release notes** that gives the release manager exactly two jobs per release: read the auto-generated draft, click **Publish**.

The repo is intentionally empty — `frontend/`, `backend/`, and `infra/` only contain README placeholders. The story is in the workflows, the script, and the artifacts (PRs, drafts, published releases).

## How it works

1. A dev opens a PR. Two labelers run automatically:
   - [`actions/labeler`](https://github.com/actions/labeler) reads changed file paths → applies area labels (`frontend`, `backend`, `infra`).
   - [`release-drafter/release-drafter/autolabeler`](https://github.com/release-drafter/release-drafter#autolabeler) reads the PR title via regex → applies a type label (`feature`, `fix`, `docs`, etc.) based on conventional commit prefix.
2. The PR merges to `main` (regular release) or `release/<N>` (hotfix).
3. A small `github-script` workflow runs, queries the PRs merged since the last published release, groups them by area → type, renders nested markdown, and creates/updates a draft GitHub Release.
4. The release manager opens the Releases tab, reviews the draft, clicks **Publish**.

Versioning scheme: `<RELEASE>.<PATCH>` (e.g., `467.0`, `467.1`, `468.0`). No `v` prefix. Regular releases bump the release number; hotfixes bump the patch.

## Local verification

The release-notes generator is plain Node with no dependencies. Run the unit tests with:

```bash
node --test '.github/scripts/__tests__/*.test.js'
```

Expected: 24 tests pass (versioning + rendering).

## Guided Tour

If you want to see…

- **How labels are applied automatically** — open any merged PR (e.g., [#1](https://github.com/rossreicks/release-notes-example/pull/1)) and look at the Labels and the Checks tab.
- **How a multi-area PR appears in two places** — see [PR #6](https://github.com/rossreicks/release-notes-example/pull/6) (touches frontend + backend) and find it in both sections of release [468.0](https://github.com/rossreicks/release-notes-example/releases/tag/468.0).
- **The full rendered release notes** — read release [468.0](https://github.com/rossreicks/release-notes-example/releases/tag/468.0).
- **How an empty area is suppressed** — compare [468.0](https://github.com/rossreicks/release-notes-example/releases/tag/468.0) (has Infrastructure) with [469.0](https://github.com/rossreicks/release-notes-example/releases/tag/469.0) (does not).
- **How the hotfix flow works** — see [PR #12](https://github.com/rossreicks/release-notes-example/pull/12) merged into `release/468` and the resulting [468.1 release](https://github.com/rossreicks/release-notes-example/releases/tag/468.1).
- **How release branches get auto-cut** — when [470.0](https://github.com/rossreicks/release-notes-example/releases/tag/470.0) was published, the `Cut Release Branch` workflow auto-created `release/470`. Future hotfixes against that line have somewhere to land.
- **The implementation** — read `.github/workflows/release-notes.yml`, `.github/workflows/cut-release-branch.yml`, and `.github/scripts/draft-release-notes.js`.
- **The labeling rules** — read `.github/labeler.yml` (area paths) and `.github/release-drafter.yml` (title regex).
- **The full design rationale** — read [`docs/superpowers/specs/2026-05-01-release-notes-automation-design.md`](docs/superpowers/specs/2026-05-01-release-notes-automation-design.md).

<!-- Last touched by PR #7 demo -->
