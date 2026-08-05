const Logger = require('./logger');

describe('Logger', () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    logger = new Logger();
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  test('should log info message', () => {
    logger.info('Test message');
    expect(consoleSpy.log).toHaveBeenCalled();
  });

  test('should log success message', () => {
    logger.success('Success message');
    expect(consoleSpy.log).toHaveBeenCalled();
  });

  test('should log warning message', () => {
    logger.warning('Warning message');
    expect(consoleSpy.log).toHaveBeenCalled();
  });

  test('should log error message', () => {
    logger.error('Error message');
    expect(consoleSpy.error).toHaveBeenCalled();
  });
});
