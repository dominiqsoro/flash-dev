const { computeHealthScore } = require('../commands/analyze');

const baseline = {
  git: { repository: true, remote: true, hasConflicts: false, hasUncommitted: false },
  framework: { framework: 'nextjs' },
  depsInfo: { total: 20 },
  sizeInfo: { sourceSize: 1024 * 1024 },
  security: { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
};

describe('analyze.computeHealthScore', () => {
  test('donne 100 à un projet sain', () => {
    expect(computeHealthScore(baseline).score).toBe(100);
  });

  // Regression: the old score was a constant (70 + fixed bonuses), so every
  // repository scored 90 regardless of its actual state.
  test('varie selon les signaux mesurés', () => {
    const healthy = computeHealthScore(baseline).score;
    const broken = computeHealthScore({
      ...baseline,
      git: { repository: false },
      security: { ...baseline.security, critical: 3 }
    }).score;

    expect(broken).toBeLessThan(healthy);
  });

  test('pénalise les vulnérabilités critiques', () => {
    const result = computeHealthScore({
      ...baseline,
      security: { ...baseline.security, critical: 2 }
    });

    expect(result.score).toBe(80);
    expect(result.findings.join(' ')).toMatch(/critique/);
  });

  test('plafonne la pénalité de sécurité', () => {
    const result = computeHealthScore({
      ...baseline,
      security: { ...baseline.security, critical: 50, high: 50 }
    });

    expect(result.score).toBe(55);
  });

  test('pénalise un projet non versionné', () => {
    const result = computeHealthScore({ ...baseline, git: { repository: false } });
    expect(result.score).toBe(85);
    expect(result.findings.join(' ')).toMatch(/non versionné/);
  });

  test('signale l\'absence de remote et les conflits', () => {
    const result = computeHealthScore({
      ...baseline,
      git: { repository: true, remote: false, hasConflicts: true, hasUncommitted: true }
    });

    expect(result.findings.join(' ')).toMatch(/remote/i);
    expect(result.findings.join(' ')).toMatch(/[Cc]onflits/);
    expect(result.score).toBe(82);
  });

  test('reste borné entre 0 et 100', () => {
    const worst = computeHealthScore({
      git: { repository: false },
      framework: { framework: null },
      depsInfo: { total: 500 },
      sizeInfo: { sourceSize: 500 * 1024 * 1024 },
      security: { critical: 99, high: 99, medium: 0, low: 0, total: 198 }
    });

    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.score).toBeLessThanOrEqual(100);
  });

  test('chaque pénalité est expliquée', () => {
    const result = computeHealthScore({
      ...baseline,
      security: { ...baseline.security, critical: 1 }
    });

    expect(result.findings.length).toBeGreaterThan(0);
    result.findings.forEach((finding) => expect(typeof finding).toBe('string'));
  });
});
