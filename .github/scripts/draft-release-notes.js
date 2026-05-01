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
  // Pre-releases count: marking 469.0 as pre-release means "frozen for QA / code freeze."
  // The release line is claimed; new work on main targets the next release (470.0).
  // Drafts are excluded because their tag_name is unstable ('untagged-XXX').
  const tags = [];
  for await (const { data } of github.paginate.iterator(github.rest.repos.listReleases, {
    owner, repo, per_page: 100,
  })) {
    for (const r of data) {
      if (!r.draft) tags.push(r.tag_name);
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
      // Drafts without an existing git tag get tag_name='untagged-...' from the API,
      // but our intended tag is preserved in the name field.
      if (r.draft && r.name === tag) return r;
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
    // For hotfix branches, don't auto-create empty drafts — they imply a
    // pending hotfix that doesn't exist. Only create when there's content.
    // (Main always gets a draft so the release manager has a visible target.)
    if (mode === 'hotfix' && prs.length === 0) {
      core.info(`No hotfix PRs on ${branch} since ${anchorTag || 'beginning'}; skipping empty draft.`);
      return;
    }
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
