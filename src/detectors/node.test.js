const NodeDetector = require('./node');

describe('NodeDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new NodeDetector();
  });

  test('should detect Node.js installation', async () => {
    const result = await detector.detect();
    expect(result).toHaveProperty('installed');
    expect(result).toHaveProperty('version');
  });

  test('should detect npm availability', async () => {
    const result = await detector.detect();
    expect(result).toHaveProperty('npm');
  });

  test('should detect package.json if present', async () => {
    const result = await detector.detect();
    expect(result).toHaveProperty('hasPackageJson');
  });
});
