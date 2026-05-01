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
  return areaOrder.filter((a) => prLabels.includes(a.label)).map((a) => a.heading);
}

function groupPRs({ prs, areaOrder, otherAreaHeading, typeOrder, otherTypeHeading }) {
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
    if (typeHeading !== areaHeading) {
      lines.push(`### ${typeHeading}`);
    }
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

  if (anchorTag) {
    sections.push(`---\n**Full Changelog**: ${repoUrl}/compare/${anchorTag}...${nextTag}`);
  }

  return sections.join('\n');
}

module.exports = { renderReleaseNotes, stripPrefix, groupPRs };
