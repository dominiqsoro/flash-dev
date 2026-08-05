const Config = require('./config');

describe('Config', () => {
  let config;

  beforeEach(() => {
    config = new Config();
  });

  test('should initialize with default values', () => {
    expect(config.get('dryRun')).toBe(false);
    expect(config.get('verbose')).toBe(false);
    expect(config.get('json')).toBe(false);
    expect(config.get('quiet')).toBe(false);
  });

  test('should set and get values', () => {
    config.set('dryRun', true);
    expect(config.get('dryRun')).toBe(true);
  });

  test('should check verbose mode', () => {
    expect(config.isVerbose()).toBe(false);
    config.set('verbose', true);
    expect(config.isVerbose()).toBe(true);
  });

  test('should check json mode', () => {
    expect(config.isJson()).toBe(false);
    config.set('json', true);
    expect(config.isJson()).toBe(true);
  });

  test('should check quiet mode', () => {
    expect(config.isQuiet()).toBe(false);
    config.set('quiet', true);
    expect(config.isQuiet()).toBe(true);
  });
});
