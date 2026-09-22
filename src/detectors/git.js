/**
 * Détecteur Git - Analyse l'état du dépôt Git
 */

const { capture, ok } = require('../utils/exec');

const GIT_TIMEOUT = 5000;

class GitDetector {
  constructor() {
    this.root = this.findGitRoot();
  }

  findGitRoot() {
    return capture('git', ['rev-parse', '--show-toplevel'], { timeout: GIT_TIMEOUT });
  }

  /**
   * Run git inside the detected repository root.
   * @param {string[]} args
   * @returns {string|null}
   */
  git(args) {
    return capture('git', args, { timeout: GIT_TIMEOUT, cwd: this.root || process.cwd() });
  }

  async detect() {
    const result = {
      installed: false,
      repository: false,
      remote: false,
      currentBranch: null,
      remoteBranch: null,
      hasUncommitted: false,
      hasConflicts: false,
      ahead: 0,
      behind: 0,
      status: 'unknown'
    };

    if (!ok('git', ['--version'], { timeout: GIT_TIMEOUT })) {
      return result;
    }
    result.installed = true;

    if (!this.root) {
      return result;
    }
    result.repository = true;

    result.currentBranch = this.git(['rev-parse', '--abbrev-ref', 'HEAD']);

    const remote = this.git(['remote', 'get-url', 'origin']);
    result.remote = Boolean(remote);

    result.remoteBranch = this.git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);

    const status = this.git(['status', '--porcelain']);
    result.hasUncommitted = Boolean(status);
    result.status = result.hasUncommitted ? 'dirty' : 'clean';

    const conflicts = this.git(['diff', '--name-only', '--diff-filter=U']);
    result.hasConflicts = Boolean(conflicts);
    if (result.hasConflicts) {
      result.status = 'conflicts';
    }

    if (result.remoteBranch) {
      // Argument is a git-provided ref, but argv form keeps it inert regardless
      const revList = this.git([
        'rev-list', '--left-right', '--count', `${result.remoteBranch}...HEAD`
      ]);

      if (revList) {
        const [behind, ahead] = revList.split(/\s+/).map((n) => parseInt(n, 10) || 0);
        result.behind = behind;
        result.ahead = ahead;
      }
    }

    return result;
  }
}

module.exports = GitDetector;
