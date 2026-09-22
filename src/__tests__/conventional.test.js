const { parseCommit, inferBump, bumpVersion, COMMIT_TYPES } = require('../core/conventional');

describe('conventional', () => {
  describe('parseCommit', () => {
    test('accepte un en-tête conforme avec scope', () => {
      const result = parseCommit('feat(auth): add refresh token rotation');
      expect(result).toMatchObject({
        valid: true, type: 'feat', scope: 'auth', breaking: false
      });
    });

    test('accepte un en-tête sans scope', () => {
      expect(parseCommit('fix: handle empty payload').valid).toBe(true);
    });

    test('détecte un changement incompatible via "!"', () => {
      expect(parseCommit('chore(deps)!: drop node 16').breaking).toBe(true);
    });

    test('détecte BREAKING CHANGE dans le corps', () => {
      const result = parseCommit('feat: new api\n\nBREAKING CHANGE: removes v1');
      expect(result.breaking).toBe(true);
    });

    test('rejette un format libre', () => {
      const result = parseCommit('mauvais message');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Format attendu/);
    });

    test('rejette un type inconnu', () => {
      expect(parseCommit('banana: do things').valid).toBe(false);
    });

    test('rejette un point final', () => {
      const result = parseCommit('feat: add thing.');
      expect(result.errors).toContain('La description ne doit pas se terminer par un point.');
    });

    test('rejette une majuscule initiale', () => {
      expect(parseCommit('feat: Add thing').valid).toBe(false);
    });

    test('rejette une description trop longue', () => {
      expect(parseCommit(`feat: ${'a'.repeat(100)}`).valid).toBe(false);
    });

    test('rejette un message vide', () => {
      expect(parseCommit('').valid).toBe(false);
    });

    // A hook must never block Git's own generated messages
    test.each([
      ['Merge branch main into feature'],
      ['Revert "feat: something"'],
      ['fixup! feat: wip'],
      ['Initial commit']
    ])('laisse passer le message généré par git: %s', (message) => {
      expect(parseCommit(message).valid).toBe(true);
    });

    test('ignore les lignes de commentaire du template git', () => {
      const result = parseCommit('# Please enter the commit message\nfeat: real subject');
      expect(result.valid).toBe(true);
      expect(result.header).toBe('feat: real subject');
    });

    test('ne prend pas un commentaire pour le corps du message', () => {
      const result = parseCommit('feat: subject\n\n# Changes to be committed:\n#\tmodified: a.js');
      expect(result.valid).toBe(true);
      expect(result.body).toBe('');
    });
  });

  describe('inferBump', () => {
    test('major dès qu\'un commit est incompatible', () => {
      expect(inferBump([{ type: 'fix', breaking: true }])).toBe('major');
    });

    test('minor pour une fonctionnalité', () => {
      expect(inferBump([{ type: 'feat', breaking: false }, { type: 'fix', breaking: false }])).toBe('minor');
    });

    test('patch pour une correction seule', () => {
      expect(inferBump([{ type: 'fix', breaking: false }])).toBe('patch');
    });

    test('null quand rien n\'impacte la version', () => {
      expect(inferBump([{ type: 'docs', breaking: false }])).toBeNull();
    });
  });

  describe('bumpVersion', () => {
    test.each([
      ['1.2.3', 'major', '2.0.0'],
      ['1.2.3', 'minor', '1.3.0'],
      ['1.2.3', 'patch', '1.2.4'],
      ['0.0.0', 'minor', '0.1.0']
    ])('%s + %s = %s', (version, bump, expected) => {
      expect(bumpVersion(version, bump)).toBe(expected);
    });
  });

  test('chaque type déclare un label et un ordre', () => {
    for (const [type, meta] of Object.entries(COMMIT_TYPES)) {
      expect(typeof meta.label).toBe('string');
      expect(typeof meta.order).toBe('number');
      expect(type).toMatch(/^[a-z]+$/);
    }
  });
});
