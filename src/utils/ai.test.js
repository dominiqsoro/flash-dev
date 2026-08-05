const { generateBasicCommitMessage } = require('./ai');

describe('AI Utils', () => {
  test('should generate basic commit message', () => {
    const diff = '+++ b/test.js\n+ console.log("test");';
    const message = generateBasicCommitMessage(diff);
    expect(message).toMatch(/^[a-z]+\([a-z]+\): .+$/);
  });

  test('should handle empty diff', () => {
    const message = generateBasicCommitMessage('');
    expect(message).toBe('chore: initial commit');
  });

  test('should detect auth scope from file path', () => {
    const diff = '+++ b/src/auth/login.js\n+ function login() {}';
    const message = generateBasicCommitMessage(diff);
    expect(message).toContain('auth');
  });
});
