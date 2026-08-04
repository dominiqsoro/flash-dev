/**
 * Détecteur Git - Analyse l'état du dépôt Git
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class GitDetector {
  constructor() {
    this.root = this.findGitRoot();
  }

  findGitRoot() {
    try {
      const gitDir = execSync('git rev-parse --git-dir', { 
        encoding: 'utf-8', 
        cwd: process.cwd(),
        stdio: 'pipe'
      }).trim();
      return path.dirname(gitDir);
    } catch (error) {
      return null;
    }
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

    try {
      // Vérifier si Git est installé
      execSync('git --version', { stdio: 'pipe' });
      result.installed = true;
    } catch (error) {
      return result;
    }

    if (!this.root) {
      return result;
    }

    result.repository = true;

    try {
      // Branche courante
      result.currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
        cwd: this.root,
        stdio: 'pipe'
      }).trim();

      // Remote configuré
      try {
        const remote = execSync('git remote get-url origin', {
          encoding: 'utf-8',
          cwd: this.root,
          stdio: 'pipe'
        }).trim();
        result.remote = !!remote;
      } catch (error) {
        result.remote = false;
      }

      // Branche distante
      try {
        result.remoteBranch = execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', {
          encoding: 'utf-8',
          cwd: this.root,
          stdio: 'pipe'
        }).trim();
      } catch (error) {
        result.remoteBranch = null;
      }

      // Fichiers non commités
      try {
        const status = execSync('git status --porcelain', {
          encoding: 'utf-8',
          cwd: this.root,
          stdio: 'pipe'
        });
        result.hasUncommitted = status.trim().length > 0;
      } catch (error) {
        result.hasUncommitted = false;
      }

      // Conflits
      try {
        const conflicts = execSync('git diff --name-only --diff-filter=U', {
          encoding: 'utf-8',
          cwd: this.root,
          stdio: 'pipe'
        });
        result.hasConflicts = conflicts.trim().length > 0;
      } catch (error) {
        result.hasConflicts = false;
      }

      // Ahead/Behind
      if (result.remoteBranch) {
        try {
          const revList = execSync(`git rev-list --left-right --count ${result.remoteBranch}...HEAD`, {
            encoding: 'utf-8',
            cwd: this.root,
            stdio: 'pipe'
          }).trim();
          const [behind, ahead] = revList.split('\t').map(Number);
          result.ahead = ahead || 0;
          result.behind = behind || 0;
        } catch (error) {
          // Ignorer si pas de tracking
        }
      }

      // Statut global
      if (result.hasConflicts) {
        result.status = 'conflicts';
      } else if (result.hasUncommitted) {
        result.status = 'dirty';
      } else if (result.ahead > 0) {
        result.status = 'ahead';
      } else if (result.behind > 0) {
        result.status = 'behind';
      } else {
        result.status = 'clean';
      }

    } catch (error) {
      // Erreur lors de la détection
    }

    return result;
  }
}

module.exports = GitDetector;
