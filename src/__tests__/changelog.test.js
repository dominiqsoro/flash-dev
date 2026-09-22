const { renderSection } = require('../commands/changelog');

const commit = (overrides) => ({
  hash: 'a'.repeat(40),
  shortHash: 'abc1234',
  type: 'feat',
  scope: null,
  description: 'something',
  breaking: false,
  conventional: true,
  ...overrides
});

describe('changelog.renderSection', () => {
  test('écrit un en-tête de version daté', () => {
    const output = renderSection('1.2.0', [commit({})], { date: '2026-01-15' });
    expect(output).toContain('## [1.2.0] — 2026-01-15');
  });

  test('regroupe par type avec des libellés lisibles', () => {
    const output = renderSection('1.0.0', [
      commit({ type: 'feat', description: 'add login' }),
      commit({ type: 'fix', description: 'handle null' })
    ]);

    expect(output).toContain('Fonctionnalités');
    expect(output).toContain('add login');
    expect(output).toContain('Corrections');
    expect(output).toContain('handle null');
  });

  test('met les changements incompatibles en premier', () => {
    const output = renderSection('2.0.0', [
      commit({ type: 'fix', description: 'small fix' }),
      commit({ type: 'feat', description: 'new api', breaking: true })
    ]);

    expect(output.indexOf('Changements incompatibles')).toBeLessThan(output.indexOf('Corrections'));
    expect(output).toContain('new api');
  });

  test('affiche le scope en gras', () => {
    const output = renderSection('1.0.0', [commit({ scope: 'auth', description: 'add mfa' })]);
    expect(output).toContain('**auth**: add mfa');
  });

  test('exclut la maintenance par défaut', () => {
    const output = renderSection('1.0.0', [
      commit({ type: 'feat', description: 'visible' }),
      commit({ type: 'chore', description: 'bump deps' }),
      commit({ type: 'ci', description: 'tweak workflow' })
    ]);

    expect(output).toContain('visible');
    expect(output).not.toContain('bump deps');
    expect(output).not.toContain('tweak workflow');
  });

  test('inclut la maintenance avec includeAll', () => {
    const output = renderSection('1.0.0', [commit({ type: 'chore', description: 'bump deps' })], {
      includeAll: true
    });
    expect(output).toContain('bump deps');
  });

  test('crée un lien vers le commit quand le dépôt est connu', () => {
    const output = renderSection('1.0.0', [commit({})], { repoUrl: 'https://github.com/o/r' });
    expect(output).toContain('https://github.com/o/r/commit/');
  });

  test('retombe sur le hash court sans URL de dépôt', () => {
    expect(renderSection('1.0.0', [commit({})])).toContain('(abc1234)');
  });

  test('gère une liste de commits vide', () => {
    expect(renderSection('1.0.0', [])).toContain('## [1.0.0]');
  });
});
