# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-01

### Added
- **Git automation** - Single command workflow (add + commit + push)
- **AI-powered commit messages** - Integration with Gemini 2.5 Flash for Conventional Commits
- **Basic mode** - Fallback without AI for local commit message generation
- **Security scan** - Vulnerability detection for API keys, hardcoded URLs, debug statements, SQL injection patterns, and vulnerable dependencies
- **BYOK architecture** - Bring Your Own Key with zero remote storage
- **User validation** - Interactive confirmation before commits
- **Ethical monetization** - Discrete sponsor messages (30% support, 20% ads, 50% silence)
- **NPM-ready** - Global installation via `npm install -g flash-dev`

### Features
- Multi-language support (English commit messages, French CLI interface)
- Automatic file filtering (binaries, package-lock.json, yarn.lock, minified files)
- Token limit management (4,000 character diff truncation)
- Config storage in `~/.flash-dev/config.json`
- Environment variable support (`GEMINI_API_KEY`)
- Security patterns optimized for false positive reduction
- Color-coded terminal output with picocolors

### Security
- Zero remote API key storage
- Local configuration with restricted permissions
- Automatic exclusion of sensitive files from git diff
- Secure dependency scanning

### Commands
- `flash-dev push` - Automate Git workflow
- `flash-dev scan` - Security vulnerability analysis
- `flash-dev status` - System status and version info
- `flash-dev --help` - Command help

### Documentation
- Complete README with installation guide
- Security and privacy documentation
- Contribution guidelines
- Sponsorship information

### Sponsorship Links
- Ko-fi: https://ko-fi.com/dominiqsoro
- Buy Me a Coffee: https://www.buymeacoffee.com/dominiqsoro
- GitHub: https://github.com/dominiqsoro/flash-dev
- Hostinger promo code: 1BY1403

### Technical Details
- Node.js >= 18.0.0 required
- Dependencies: @google/genai, commander, picocolors, prompts
- GPL-3.0 License
- GitHub repository: https://github.com/dominiqsoro/flash-dev

---

## [Unreleased]

### Planned
- Command `flash-dev clean` for local branch cleanup
- Command `flash-dev deploy` for deployment automation
- Multi-model AI support (OpenAI, Anthropic, etc.)
- Customizable prompt configuration
- Advanced interactive mode with file selection
