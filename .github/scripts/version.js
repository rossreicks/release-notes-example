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
