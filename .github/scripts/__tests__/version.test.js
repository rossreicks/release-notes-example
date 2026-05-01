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
