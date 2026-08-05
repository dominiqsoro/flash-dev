# 🚀 Flash-Dev v3.0.0 — Intelligent Terminal Copilot

**Release Date:** August 5, 2026

---

## 🎯 Overview

Flash-Dev v3.0.0 transforms from a Git automation tool into a **context-aware intelligent terminal copilot**. This major release introduces 6 new powerful commands, comprehensive diagnostics, AI-powered analysis, and enhanced error handling — all while maintaining 100% free and open-source principles.

---

## ✨ What's New

### 🏥 Environment Diagnostics — `flash-dev doctor`
Complete health checks for your development environment:
- **Git**: Installation, repository status, branch, remote, uncommitted changes
- **Node.js**: Version, npm/pnpm/yarn/bun availability, package.json detection
- **Docker**: Engine status, containers, images, compose availability
- **PHP**: Version, Composer, Laravel/Symfony detection
- **Database**: MySQL, PostgreSQL, Redis, SQLite status
- **Framework**: Automatic detection (Next.js, React, Vue, Laravel, etc.)

Status indicators (✓ success, ⚠ warning, ✗ error) with actionable suggestions.

### 📊 Project Analysis — `flash-dev analyze`
Comprehensive project audits:
- **Framework detection**: Identifies the technology stack
- **Architecture scoring**: AI-powered or static analysis of code structure
- **Dependency analysis**: Package count and health
- **Security audit**: Basic security checks
- **Size analysis**: Project footprint calculation

JSON output support for automation:
```bash
flash-dev analyze --json
```

### 📦 Dependency Management — `flash-dev deps [--fix]`
Analyze project dependencies:
- **Unused packages**: Detects dependencies not imported in source code
- **Vulnerabilities**: Runs `npm audit` to identify security issues
- **Outdated packages**: Shows packages with newer versions available
- **Duplicates**: Identifies duplicate dependency declarations

Auto-fix mode:
```bash
flash-dev deps --fix
```

### 🧠 AI Error Explainer — `flash-dev explain [error]`
AI-powered error analysis:
- **Root cause**: Explains why the error occurred
- **Solution**: Provides actionable fixes
- **Example**: Shows corrected code examples
- **Documentation**: Links to relevant documentation

Fallback to local knowledge base if AI is unavailable.

From log file:
```bash
flash-dev explain --file error.log
```

### 🔧 Auto-Fix — `flash-dev fix`
Automatically fixes common code issues:
- **ESLint**: Runs `eslint --fix` for linting issues
- **TypeScript**: Fixes TypeScript errors
- **Imports**: Organizes and removes unused imports
- **Formatting**: Applies Prettier formatting

Creates automatic backups before applying fixes:
```
.flash-dev/backups/backup-1691234567890/
```

### 🗄️ Cache Management — `flash-dev cache [list/stats/clean]`
Unified cache management:
- npm, pnpm, yarn
- Composer
- Docker
- Vite, Next.js

Statistics:
```bash
flash-dev cache stats
```

Clean caches:
```bash
flash-dev cache clean
```

### 📋 Version Check — `flash-dev version --check`
Check for updates on npm:
```bash
flash-dev version --check
```

---

## 🏗️ Architecture Improvements

### New Modular System
- **Core**: Config, Logger, Errors
- **Detectors**: Git, Node, Docker, PHP, Database, Framework
- **Commands**: Modular command structure for better maintainability

### Enhanced Error Handling
- Replaced `process.exit()` with graceful `return` statements
- Prevents libuv `UV_HANDLE_CLOSING` assertion errors on Windows
- Better error propagation and user feedback

### AI Integration
- Updated Gemini model from `gemini-1.5-flash` to `gemini-2.5-flash`
- Automatic fallback to basic mode when AI fails (429 errors, depleted credits)
- Improved basic mode with intelligent commit message generation based on file paths, extensions, and code patterns

---

## 🧪 Testing & CI/CD

### Unit Tests
- Jest-based test suite for core modules
- Tests for Config, Logger, Node detector, and AI utilities
- Coverage reporting with `npm run test:coverage`

### GitHub Actions CI/CD
- Automated testing on Node.js 18.x and 20.x
- Continuous integration workflow
- Ready for automated releases

---

## 📝 Documentation

- Comprehensive README updates with examples for all v3.0.0 commands
- Added basic mode documentation for `flash-dev push`
- Updated CHANGELOG.md with detailed release notes
- Improved usage patterns and best practices

---

## 🎨 User Experience

### Reduced Monetization
- **Sponsors**: 20% (down from 30%)
- **Ads**: 10% (down from 20%)
- **Silence**: 70% (up from 50%)
- Better UX with fewer interruptions

### Improved Basic Mode
Flash-dev now generates intelligent commit messages without requiring an AI API key:
- Analyzes file paths for scope detection (auth, api, db, ui, utils, etc.)
- Detects commit type from code patterns (feat, fix, refactor, docs, test, etc.)
- Pattern recognition for common scenarios (refresh token, JWT, login, API, error handling)

---

## 🔒 Security

- Pre-commit secret detection integrated into `flash-dev secure`
- Safe branch cleanup excluding protected branches
- Zero remote API key storage maintained
- Local configuration with restricted permissions

---

## 📦 Installation

```bash
npm install -g flash-dev@latest
```

Or update from previous version:
```bash
npm update flash-dev
```

---

## 🆚 Migration from v2.0.0

### Breaking Changes
- None — fully backward compatible
- Minimum Node.js version remains 18.0.0

### New Commands
- `flash-dev doctor`
- `flash-dev analyze`
- `flash-dev deps`
- `flash-dev explain`
- `flash-dev fix`
- `flash-dev cache`

### Updated Commands
- `flash-dev version` now supports `--check` flag
- `flash-dev push` has improved basic mode

---

## 🙏 Acknowledgments

Thank you to all contributors and users who provided feedback and bug reports. Special thanks to the community for supporting open-source development.

---

## 📚 Full Changelog

For detailed changes, see [CHANGELOG.md](https://github.com/dominiqsoro/flash-dev/blob/master/CHANGELOG.md)

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](https://github.com/dominiqsoro/flash-dev#contributing).

---

## 📄 License

GPL-3.0 — See [LICENSE](https://github.com/dominiqsoro/flash-dev/blob/master/LICENSE) for details.

---

## 🔗 Links

- **GitHub**: https://github.com/dominiqsoro/flash-dev
- **NPM**: https://www.npmjs.com/package/flash-dev
- **Issues**: https://github.com/dominiqsoro/flash-dev/issues
- **Documentation**: https://github.com/dominiqsoro/flash-dev#readme

---

**Made with ❤️ by [dominiqsoro](https://github.com/dominiqsoro)**
