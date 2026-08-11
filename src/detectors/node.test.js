const NodeDetector = require('./node');

describe('NodeDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new NodeDetector();
  });

  test('should detect Node.js installation', async () => {
    const result = await detector.detect();
    expect(result).toHaveProperty('node');
    expect(result.node).toMatch(/^v?\d+/);
  });

  test('should detect npm availability', async () => {
    const result = await detector.detect();
    expect(result).toHaveProperty('npm');
    expect(result.npm).toBeTruthy();
  });

  test('should detect package.json if present', async () => {
    const result = await detector.detect();
    expect(result).toHaveProperty('hasPackageJson');
    expect(result.hasPackageJson).toBe(true);
  });
});
