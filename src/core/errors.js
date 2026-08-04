/**
 * Gestion centralisée des erreurs Flash-dev
 * Normalise les types d'erreurs avec messages orientés solution
 */

const pc = require('picocolors');

class FlashDevError extends Error {
  constructor(message, code, solution = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.solution = solution;
    Error.captureStackTrace(this, this.constructor);
  }

  display() {
    console.log(pc.red(`\n❌ ${this.code}: ${this.message}`));
    if (this.solution) {
      console.log(pc.cyan(`\n💡 Solution: ${this.solution}`));
    }
    console.log();
  }
}

class ValidationError extends FlashDevError {
  constructor(message, solution = null) {
    super(message, 'VALIDATION_ERROR', solution);
  }
}

class DependencyError extends FlashDevError {
  constructor(message, solution = null) {
    super(message, 'DEPENDENCY_ERROR', solution);
  }
}

class PermissionError extends FlashDevError {
  constructor(message, solution = null) {
    super(message, 'PERMISSION_ERROR', solution);
  }
}

class NetworkError extends FlashDevError {
  constructor(message, solution = null) {
    super(message, 'NETWORK_ERROR', solution);
  }
}

class GitError extends FlashDevError {
  constructor(message, solution = null) {
    super(message, 'GIT_ERROR', solution);
  }
}

class DockerError extends FlashDevError {
  constructor(message, solution = null) {
    super(message, 'DOCKER_ERROR', solution);
  }
}

class DatabaseError extends FlashDevError {
  constructor(message, solution = null) {
    super(message, 'DATABASE_ERROR', solution);
  }
}

class ConfigurationError extends FlashDevError {
  constructor(message, solution = null) {
    super(message, 'CONFIGURATION_ERROR', solution);
  }
}

module.exports = {
  FlashDevError,
  ValidationError,
  DependencyError,
  PermissionError,
  NetworkError,
  GitError,
  DockerError,
  DatabaseError,
  ConfigurationError
};
