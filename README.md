<div align="center">

# Flash-Dev

**Intelligent CLI automation tool for developers — 100% Free & Open-Source**
**Outil CLI intelligent d'automatisation pour développeurs — 100 % gratuit et open-source**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![NPM Version](https://img.shields.io/npm/v/flash-dev.svg)](https://www.npmjs.com/package/flash-dev)
[![Node.js Version](https://img.shields.io/node/v/flash-dev.svg)](https://www.npmjs.com/package/flash-dev)
[![Downloads](https://img.shields.io/npm/dw/flash-dev.svg)](https://www.npmjs.com/package/flash-dev)

<a href="#english"><strong>English</strong></a>
&nbsp;·&nbsp;
<a href="#francais"><strong>Français</strong></a>

</div>

<br />

---

<a name="english"></a>
## English

Flash-dev automates your Git workflow in a single command: `git add` + AI-powered commit + `git push`. No need to leave the terminal or touch the mouse.

<details>
<summary><strong>Table of contents</strong></summary>

- [Features](#en-features)
- [Requirements](#en-requirements)
- [Installation](#en-installation)
- [Getting a Gemini API Key](#en-api-key)
- [Usage](#en-usage)
- [Example Commit Messages](#en-commit-messages)
- [Security and Privacy](#en-security)
- [Advanced Configuration](#en-advanced-config)
- [Contributing](#en-contributing)
- [License](#en-license)
- [Support the Project](#en-support-project)
- [Support](#en-support)
- [Changelog](#en-changelog)
- [Roadmap](#en-roadmap)

</details>

<a name="en-features"></a>
### Features

#### 🚀 Core Workflow (v3.0.0)
| Feature | Description |
|---|---|
| **Git Automation** | Single command: `git add` + AI commit + `git push` |
| **AI-Powered Commits** | Gemini 2.5 Flash generates Conventional Commits (optional) |
| **Environment Doctor** | Complete diagnostics: Git, Node, Docker, DB, Framework |
| **Project Analysis** | Architecture, stack, dependencies, security audit |
| **Dependency Manager** | Detect unused packages, vulnerabilities, duplicates |
| **AI Error Explainer** | Paste any error, get AI-powered solutions |

#### 🛡️ Security
| Feature | Description |
|---|---|
| **Security Scan** | Detects vulnerabilities in your code |
| **Secret Audit** | Prevents accidental secret leaks before commit |
| **Environment Generator** | Creates secure `.env.example` files |
| **BYOK Architecture** | Zero remote key storage — you control your API keys |

#### ⚙️ System Utilities
| Feature | Description |
|---|---|
| **Disk Cleanup** | Frees space by cleaning caches and build artifacts |
| **Branch Sync** | Synchronizes automatically with main/master |
| **Branch Cleanup** | Safely removes merged local branches |
| **Project Bootstrap** | Configure Next.js, Laravel, Vue projects instantly |
| **Docker Support** | Docker initialization, logs, cleanup |
| **Laravel Ecosystem** | CRUD generation, cache optimization, migrations |

#### 🎯 Framework Support
- **Node.js**: Next.js, React, Vue, Nuxt, NestJS, Express, Fastify
- **PHP**: Laravel, Symfony
- **Python**: Django, Flask (via detectors)
- **Go**: Go modules (via detectors)
- **Docker**: Full Docker/Docker Compose integration

<a name="en-requirements"></a>
### Requirements

- **Node.js** — version LTS >= 18.0.0
- **Git** — installed and configured
- A **Google Gemini API key** — free, but optional; flash-dev also works without one

<a name="en-installation"></a>
### Installation

**Global installation via NPM**

```bash
npm install -g flash-dev
```

**Local development**

```bash
# Clone the repository
git clone https://github.com/dominiqsoro/flash-dev.git
cd flash-dev

# Install dependencies
npm install

# Link the package locally
npm link
```

<a name="en-api-key"></a>
### Getting a Gemini API Key

Flash-dev uses Google's **Gemini 2.5 Flash** model to generate intelligent commit messages. To get a free key:

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

> **Important** — Your API key is stored **only locally** on your machine. It is never sent to our servers.

<a name="en-usage"></a>
### Usage

| Command | Description |
|---|---|
| `flash-dev push` | Stages, commits (AI-assisted or basic), and pushes your changes |
| `flash-dev doctor` | Complete environment diagnostics (Git, Node, Docker, DB, Framework) |
| `flash-dev analyze` | Project audit with architecture scoring and security analysis |
| `flash-dev deps [--fix]` | Dependency analysis (unused, vulnerabilities, outdated) |
| `flash-dev explain [error]` | AI-powered error explanation with local fallback |
| `flash-dev fix` | Auto-correction for ESLint, TypeScript, imports, formatting |
| `flash-dev cache [list/stats/clean]` | Unified cache management (npm, pnpm, yarn, docker) |
| `flash-dev scan` | Scans the project for security vulnerabilities |
| `flash-dev env` | Generates a sanitized `.env.example` from your local `.env` |
| `flash-dev secure` | Audits staged changes for secrets before committing |
| `flash-dev clean` | Cleans development caches and old project directories |
| `flash-dev sync` | Synchronizes your working branch with main |
| `flash-dev nuke` | Removes merged local branches |
| `flash-dev status` | Displays system status and version |

#### Main command: `flash-dev push`

Automates the complete Git workflow:

```bash
flash-dev push
```

1. **Check** — verifies the folder is a valid Git repository
2. **Index** — runs `git add .` to stage all files
3. **Capture** — captures the changes via `git diff --cached`
4. **Generate** — sends the diff to Gemini to generate a Conventional Commits message (if an API key is configured), or uses intelligent basic mode
5. **Validate** — displays the generated message and asks for confirmation
6. **Commit** — runs `git commit` with the validated message
7. **Push** — automatically detects the branch and runs `git push`

**Basic mode (without API key):**
Flash-dev analyzes file paths, extensions, and code patterns to generate intelligent commit messages without requiring an AI API key.

#### Environment diagnostics: `flash-dev doctor`

```bash
flash-dev doctor
```

Performs a complete health check of your development environment:

- **Git**: Installation, repository status, branch, remote, uncommitted changes
- **Node.js**: Version, npm/pnpm/yarn/bun availability, package.json detection
- **Docker**: Engine status, containers, images, compose availability
- **PHP**: Version, Composer, Laravel/Symfony detection
- **Database**: MySQL, PostgreSQL, Redis, SQLite status
- **Framework**: Automatic detection (Next.js, React, Vue, Laravel, etc.)

Output includes status indicators (✓ success, ⚠ warning, ✗ error) and actionable suggestions.

#### Project analysis: `flash-dev analyze`

```bash
flash-dev analyze
```

Comprehensive project audit:

- **Framework detection**: Identifies the technology stack
- **Architecture scoring**: AI-powered or static analysis of code structure
- **Dependency analysis**: Package count and health
- **Security audit**: Basic security checks
- **Size analysis**: Project footprint calculation

Supports JSON output for automation:
```bash
flash-dev analyze --json
```

#### Dependency management: `flash-dev deps`

```bash
flash-dev deps
```

Analyzes project dependencies:

- **Unused packages**: Detects dependencies not imported in source code
- **Vulnerabilities**: Runs `npm audit` to identify security issues
- **Outdated packages**: Shows packages with newer versions available
- **Duplicates**: Identifies duplicate dependency declarations

Auto-fix mode:
```bash
flash-dev deps --fix
```

Automatically runs `npm audit fix` and removes unused packages after confirmation.

#### Error explanation: `flash-dev explain`

```bash
flash-dev explain "TypeError: Cannot read property 'x' of undefined"
```

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

#### Auto-fix: `flash-dev fix`

```bash
flash-dev fix
```

Automatically fixes common code issues:

- **ESLint**: Runs `eslint --fix` for linting issues
- **TypeScript**: Fixes TypeScript errors
- **Imports**: Organizes and removes unused imports
- **Formatting**: Applies Prettier formatting

Creates automatic backups before applying fixes:
```
.flash-dev/backups/backup-1691234567890/
```

#### Cache management: `flash-dev cache`

```bash
flash-dev cache list
```

Lists all detected caches with sizes:
- npm, pnpm, yarn
- Composer
- Docker
- Vite, Next.js

Statistics:
```bash
flash-dev cache stats
```

Shows total cache size and per-tool breakdown.

Clean caches:
```bash
flash-dev cache clean
```

Interactive confirmation before deletion.

#### Security analysis: `flash-dev scan`

```bash
flash-dev scan
```

Detects:

- **API keys** exposed in code
- **URLs** hardcoded in the codebase
- **Debug** statements (`console.log`, `debugger`)
- **SQL** injection patterns
- **Eval** — dangerous `eval`/`exec` usage
- **Dependencies** with known vulnerabilities

#### Environment example: `flash-dev env`

```bash
flash-dev env
```

- **Reads** your local `.env` file
- **Filters** structural configuration variables
- **Sanitizes** sensitive values (API keys, passwords, tokens)
- **Generates** a clean `.env.example` for your team

#### Security audit: `flash-dev secure`

```bash
flash-dev secure
```

Detects:

- SSH private keys
- AWS access/secret keys
- Stripe API keys
- Google API keys
- GitHub tokens
- JWT tokens
- Database passwords
- Generic API/secret keys

#### Disk cleanup: `flash-dev clean`

```bash
flash-dev clean
```

Cleans:

- `node_modules` directories
- Build caches (`.next`, `.nuxt`, `dist`, `build`)
- Package manager caches
- Old projects (not modified in 3 months)

#### Branch synchronization: `flash-dev sync`

```bash
flash-dev sync
```

- **Stashes** your local changes
- **Switches** to the main branch and pulls the latest changes
- **Returns** to your working branch
- **Rebases** your branch on main
- **Restores** your local changes

#### Branch cleanup: `flash-dev nuke`

```bash
flash-dev nuke
```

- **Lists** all merged local branches
- **Excludes** protected branches (`main`, `master`, `dev`, `develop`)
- **Deletes** obsolete branches safely
- **Frees** up your local Git history

#### Check status: `flash-dev status`

```bash
flash-dev status
```

Displays system status and version.

#### 🆕 Environment Doctor: `flash-dev doctor`

```bash
flash-dev doctor
```

Complete diagnostics of your development environment:

- **Git**: Installation, repository status, branch, conflicts
- **Node.js**: Version, package managers (npm, pnpm, yarn, bun)
- **Docker**: Engine status, containers, images
- **Database**: MySQL, PostgreSQL, Redis status
- **Framework**: Auto-detection (Laravel, Next.js, React, etc.)

#### 🆕 Project Analysis: `flash-dev analyze`

```bash
flash-dev analyze
```

Comprehensive project audit:

- **Architecture**: AI-powered scoring (with Gemini) or static analysis
- **Stack**: Framework, language, dependencies
- **Size**: Source code weight vs ignored files
- **Security**: Vulnerability detection
- **Suggestions**: AI-generated improvements

#### 🆕 Dependency Manager: `flash-dev deps`

```bash
flash-dev deps
```

Analyze dependencies:

- **Unused packages**: Detection via import analysis
- **Vulnerabilities**: High/critical severity
- **Outdated**: Packages with newer versions
- **Duplicates**: Deduplication opportunities

Auto-fix mode:

```bash
flash-dev deps --fix
```

#### 🆕 AI Error Explainer: `flash-dev explain`

```bash
flash-dev explain
```

Paste any error and get AI-powered solutions:

- **Cause**: Root cause analysis
- **Solution**: Step-by-step fix
- **Example**: Code snippets
- **Documentation**: Relevant links

Or analyze a log file:

```bash
flash-dev explain error.log
```

#### Help

```bash
flash-dev --help
```

<a name="en-commit-messages"></a>
### Example Commit Messages

The AI generates messages that follow **Conventional Commits**:

- `feat(ui): add navbar component`
- `fix(auth): resolve login timeout issue`
- `docs(readme): update installation guide`
- `refactor(api): simplify user endpoint`
- `test(utils): add unit tests for parser`

**Basic mode (without AI):**

- `feat(core): add 2 files`
- `fix(general): update 1 file`
- `docs(docs): add 1 file`

<a name="en-security"></a>
### Security and Privacy

**Security architecture**

- **Zero remote storage** — API keys are never stored on our servers
- **Direct transfer** — data flows directly from your machine to Google's secure API
- **Local permissions** — the configuration file is restricted to your system user's permissions
- **Automatic filtering** — binary and large files are automatically excluded from the diff sent to the AI

**API key management**

Source priority:

1. Environment variable `GEMINI_API_KEY`
2. Local configuration file (`~/.flash-dev/config.json`)

If no key is detected on first launch, flash-dev prompts you to configure one or to continue in basic mode.

To configure the key via an environment variable:

```bash
# Linux/Mac
export GEMINI_API_KEY="your_key_here"

# Windows (PowerShell)
$env:GEMINI_API_KEY="your_key_here"

# Windows (CMD)
set GEMINI_API_KEY=your_key_here
```

<a name="en-advanced-config"></a>
### Advanced Configuration

**Token limit** — the diff sent to the AI is automatically truncated to **4,000 characters** to avoid exceeding API limits.

**Automatically excluded files:**

- Binary files
- `package-lock.json`
- `yarn.lock`
- `.min.js` and `.min.css` files

<a name="en-contributing"></a>
### Contributing

Flash-dev is an open-source project — contributions are welcome:

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`flash-dev push`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request on [dominiqsoro/flash-dev](https://github.com/dominiqsoro/flash-dev)

<a name="en-license"></a>
### License

This project is licensed under the GNU General Public License v3.0 — see the [LICENSE](LICENSE) file for details.

<a name="en-support-project"></a>
### Support the Project

Flash-dev is **100% free**, thanks to the BYOK model. If the tool saves you time, consider:

- **Star** the repository on GitHub: [dominiqsoro/flash-dev](https://github.com/dominiqsoro/flash-dev)
- **Buy a coffee** on Ko-fi: [dominiqsoro](https://ko-fi.com/dominiqsoro)
- **Support** on Buy Me a Coffee: [dominiqsoro](https://www.buymeacoffee.com/dominiqsoro)
- **Report** bugs or suggest features

<a name="en-support"></a>
### Support

- **Issues** — [GitHub Issues](https://github.com/dominiqsoro/flash-dev/issues)
- **Documentation** — [README.md](https://github.com/dominiqsoro/flash-dev#readme)
- **Developer** — [dominiqsoro](https://github.com/dominiqsoro)

<a name="en-changelog"></a>
### Changelog

#### [v3.0.0] - 2024-08-04

**Major Release — Intelligent Terminal Copilot**

This release transforms Flash-dev from a Git automation tool into a context-aware intelligent terminal copilot.

**🚀 New Features**
- **Environment Doctor** (`flash-dev doctor`): Complete diagnostics of Git, Node.js, Docker, databases, and frameworks with parallel execution
- **Project Analysis** (`flash-dev analyze`): Architecture scoring (AI-powered or static), stack analysis, security audit
- **Dependency Manager** (`flash-dev deps [--fix]`): Detect unused packages, vulnerabilities, outdated dependencies with auto-fix
- **AI Error Explainer** (`flash-dev explain [error]`): Gemini-powered error analysis with local fallback for common patterns
- **Auto-fix Command** (`flash-dev fix`): ESLint, TypeScript, imports, and formatting corrections with automatic backup
- **Cache Manager** (`flash-dev cache [list/stats/clean]`): Unified cache management for npm, pnpm, yarn, composer, docker, vite, next

**🏗️ Architecture**
- New modular system: Core (Config, Logger, Errors), Detectors (Git, Node, Docker, PHP, Database, Framework)
- Centralized error handling with solution-oriented messages
- Parallel execution for diagnostics and analysis
- Context-aware project detection

**📝 Breaking Changes**
- Minimum Node.js version: 18.0.0 (unchanged)
- New positioning: "Intelligent Terminal Copilot" instead of "Git Automation Tool"

**🐛 Bug Fixes**
- Enhanced error handling across all commands
- Fixed async operations in `clean` command to prevent terminal freeze
- Improved validation in `env` command with better error messages
- Added try/catch global wrapper in `version` command

**📚 Documentation**
- Updated README with new v3.0.0 positioning
- Added detailed roadmap for v3.1.0 and v3.2.0
- Enhanced feature descriptions and framework support list

#### [v2.0.0] - Previous Release

**Git Automation & Security Tools**

**🚀 Features**
- Git workflow automation: `git add` + AI commit + `git push`
- AI-powered commits with Gemini 2.5 Flash (Conventional Commits)
- Security scanning and vulnerability detection
- Secret audit pre-commit (API keys, tokens, passwords)
- Environment file generator (`.env.example`)
- Disk cleanup (node_modules, build caches)
- Branch synchronization and cleanup
- Laravel ecosystem tools (CRUD generation, cache optimization)
- System utilities (kill-node, size, sql-dump, scripts, log-tail, pack, node-switch)
- Project bootstrap (Next.js, Laravel, Vue)

**🛡️ Security**
- BYOK architecture (Bring Your Own Key)
- Zero remote key storage
- Direct transfer to Google's secure API

<a name="en-roadmap"></a>
### Roadmap

#### v3.0.0 — Current Release 
- [x] **Core Architecture**: Modular system with Detectors, Services, Logger
- [x] **Environment Doctor**: Complete diagnostics (Git, Node, Docker, DB, Framework)
- [x] **Project Analysis**: Architecture scoring, stack analysis, security audit
- [x] **Dependency Manager**: Unused detection, vulnerabilities, auto-fix
- [x] **AI Error Explainer**: Gemini-powered error analysis with fallback
- [x] **Enhanced Error Handling**: Centralized error types with solutions

#### v3.1.0 — Next Release 
- [ ] **Auto-fix Command**: ESLint, TypeScript, formatting fixes
- [ ] **Docker Namespace**: init, build, logs, clean, shell, doctor
- [ ] **Project Init**: Auto-detection + ESLint, Prettier, Husky, lint-staged
- [ ] **Migration Manager**: Prisma, Laravel, Knex, Drizzle support
- [ ] **Cache Manager**: npm, pnpm, yarn, composer, docker, vite, next

#### v3.2.0 — Future 📋
- [ ] **Deploy Command**: SSH, Docker, Railway, Render, Coolify, VPS
- [ ] **Workflow Engine**: `flash-dev flow release` (test → audit → commit → build → deploy)
- [ ] **Monitor**: Real-time CPU, RAM, Docker, DB, ports monitoring
- [ ] **Benchmark**: Cold build, hot reload, install time, disk usage
- [ ] **Workspace**: Monorepo support (apps, packages, libs, services)
- [ ] **Audit Command**: Complete HTML/PDF report generation

<div align="right"><a href="#flash-dev">Back to top</a></div>

---

<a name="francais"></a>
## Français

Flash-dev automatise votre workflow Git en une seule commande : `git add` + commit propulsé par IA + `git push`. Plus besoin de quitter le terminal ni de toucher la souris.

<details>
<summary><strong>Table des matières</strong></summary>

- [Fonctionnalités](#fr-features)
- [Prérequis](#fr-requirements)
- [Installation](#fr-installation)
- [Obtenir une clé API Gemini](#fr-api-key)
- [Utilisation](#fr-usage)
- [Exemples de messages de commit](#fr-commit-messages)
- [Sécurité et confidentialité](#fr-security)
- [Configuration avancée](#fr-advanced-config)
- [Contribuer](#fr-contributing)
- [Licence](#fr-license)
- [Soutenir le projet](#fr-support-project)
- [Assistance](#fr-support)
- [Feuille de route](#fr-roadmap)

</details>

<a name="fr-features"></a>
### Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| Automatisation Git | Une seule commande pour add, commit et push |
| Commits propulsés par IA | Utilise Gemini 2.5 Flash pour générer des messages Conventional Commits (optionnel) |
| Mode basique | Fonctionne sans IA, avec une génération de message simple |
| Scan de sécurité | Détecte les vulnérabilités dans votre code |
| Audit des secrets | Empêche les fuites accidentelles de secrets avant un commit |
| Générateur d'environnement | Crée des fichiers `.env.example` sécurisés |
| Nettoyage du disque | Libère de l'espace en nettoyant les caches et les anciens projets |
| Synchronisation de branche | Se synchronise automatiquement avec la branche principale |
| Nettoyage des branches | Supprime en toute sécurité les branches locales fusionnées |
| Sécurité maximale | Architecture BYOK (Bring Your Own Key) — aucun stockage de clé à distance |
| Validation utilisateur | Confirmation interactive avant chaque commit |
| Installation simplifiée | Disponible sur NPM via `npm install -g flash-dev` |
| Open Source | Code entièrement gratuit et transparent |

<a name="fr-requirements"></a>
### Prérequis

- **Node.js** — version LTS >= 18.0.0
- **Git** — installé et configuré
- Une **clé API Google Gemini** — gratuite, mais facultative ; flash-dev fonctionne aussi sans elle

<a name="fr-installation"></a>
### Installation

**Installation globale via NPM**

```bash
npm install -g flash-dev
```

**Développement local**

```bash
# Cloner le dépôt
git clone https://github.com/dominiqsoro/flash-dev.git
cd flash-dev

# Installer les dépendances
npm install

# Lier le package localement
npm link
```

<a name="fr-api-key"></a>
### Obtenir une clé API Gemini

Flash-dev utilise le modèle **Gemini 2.5 Flash** de Google pour générer des messages de commit intelligents. Pour obtenir une clé gratuite :

1. Rendez-vous sur [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Create API Key"
4. Copiez votre clé API

> **Important** — Votre clé API est stockée **uniquement en local** sur votre machine. Elle n'est jamais envoyée à nos serveurs.

<a name="fr-usage"></a>
### Utilisation

| Commande | Description |
|---|---|
| `flash-dev push` | Indexe, commit (via IA ou en mode basique) et pousse vos changements |
| `flash-dev scan` | Analyse le projet à la recherche de vulnérabilités de sécurité |
| `flash-dev env` | Génère un `.env.example` assaini à partir de votre `.env` local |
| `flash-dev secure` | Audite les changements indexés à la recherche de secrets avant un commit |
| `flash-dev clean` | Nettoie les caches de développement et les anciens répertoires de projets |
| `flash-dev sync` | Synchronise votre branche de travail avec main |
| `flash-dev nuke` | Supprime les branches locales fusionnées |
| `flash-dev status` | Affiche le statut du système et la version |

#### Commande principale : `flash-dev push`

Automatise l'intégralité du workflow Git :

```bash
flash-dev push
```

1. **Vérification** — vérifie que le dossier est un dépôt Git valide
2. **Indexation** — exécute `git add .` pour indexer tous les fichiers
3. **Capture** — capture les changements via `git diff --cached`
4. **Génération** — envoie le diff à Gemini pour générer un message Conventional Commits (si une clé API est configurée)
5. **Validation** — affiche le message généré et demande une confirmation
6. **Commit** — exécute `git commit` avec le message validé
7. **Push** — détecte automatiquement la branche et exécute `git push`

#### Analyse de sécurité : `flash-dev scan`

```bash
flash-dev scan
```

Détecte :

- Les **clés API** exposées dans le code
- Les **URLs** codées en dur
- Les instructions de **débogage** (`console.log`, `debugger`)
- Les schémas d'**injection SQL**
- Les usages dangereux d'**eval**/exec
- Les **dépendances** avec des vulnérabilités connues

#### Exemple d'environnement : `flash-dev env`

```bash
flash-dev env
```

- **Lit** votre fichier `.env` local
- **Filtre** les variables de configuration structurelles
- **Assainit** les valeurs sensibles (clés API, mots de passe, tokens)
- **Génère** un `.env.example` propre pour votre équipe

#### Audit de sécurité : `flash-dev secure`

```bash
flash-dev secure
```

Détecte :

- Les clés privées SSH
- Les clés d'accès/secrètes AWS
- Les clés API Stripe
- Les clés API Google
- Les tokens GitHub
- Les tokens JWT
- Les mots de passe de base de données
- Les clés API/secrètes génériques

#### Nettoyage du disque : `flash-dev clean`

```bash
flash-dev clean
```

Nettoie :

- Les répertoires `node_modules`
- Les caches de build (`.next`, `.nuxt`, `dist`, `build`)
- Les caches des gestionnaires de paquets
- Les anciens projets (non modifiés depuis 3 mois)

#### Synchronisation de branche : `flash-dev sync`

```bash
flash-dev sync
```

- **Met de côté** (stash) vos changements locaux
- **Bascule** sur la branche main et récupère les derniers changements
- **Revient** sur votre branche de travail
- **Rebase** votre branche sur main
- **Restaure** vos changements locaux

#### Nettoyage des branches : `flash-dev nuke`

```bash
flash-dev nuke
```

- **Liste** toutes les branches locales fusionnées
- **Exclut** les branches protégées (`main`, `master`, `dev`, `develop`)
- **Supprime** les branches obsolètes en toute sécurité
- **Libère** votre historique Git local

#### Vérifier le statut : `flash-dev status`

```bash
flash-dev status
```

Affiche le statut du système et la version.

#### Aide

```bash
flash-dev --help
```

<a name="fr-commit-messages"></a>
### Exemples de messages de commit

L'IA génère des messages qui suivent la convention **Conventional Commits** :

- `feat(ui): add navbar component`
- `fix(auth): resolve login timeout issue`
- `docs(readme): update installation guide`
- `refactor(api): simplify user endpoint`
- `test(utils): add unit tests for parser`

**Mode basique (sans IA) :**

- `feat(core): add 2 files`
- `fix(general): update 1 file`
- `docs(docs): add 1 file`

<a name="fr-security"></a>
### Sécurité et confidentialité

**Architecture de sécurité**

- **Aucun stockage à distance** — les clés API ne sont jamais stockées sur nos serveurs
- **Transfert direct** — les données circulent directement de votre machine vers l'API sécurisée de Google
- **Permissions locales** — le fichier de configuration est restreint aux permissions de votre utilisateur système
- **Filtrage automatique** — les fichiers binaires et volumineux sont automatiquement exclus du diff envoyé à l'IA

**Gestion de la clé API**

Ordre de priorité des sources :

1. Variable d'environnement `GEMINI_API_KEY`
2. Fichier de configuration local (`~/.flash-dev/config.json`)

Si aucune clé n'est détectée au premier lancement, flash-dev vous invite à en configurer une ou à continuer en mode basique.

Pour configurer la clé via une variable d'environnement :

```bash
# Linux/Mac
export GEMINI_API_KEY="votre_cle_ici"

# Windows (PowerShell)
$env:GEMINI_API_KEY="votre_cle_ici"

# Windows (CMD)
set GEMINI_API_KEY=votre_cle_ici
```

<a name="fr-advanced-config"></a>
### Configuration avancée

**Limite de tokens** — le diff envoyé à l'IA est automatiquement tronqué à **4 000 caractères** pour éviter de dépasser les limites de l'API.

**Fichiers automatiquement exclus :**

- Les fichiers binaires
- `package-lock.json`
- `yarn.lock`
- Les fichiers `.min.js` et `.min.css`

<a name="fr-contributing"></a>
### Contribuer

Flash-dev est un projet open-source, les contributions sont les bienvenues :

1. Forkez le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`flash-dev push`)
4. Poussez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request sur [dominiqsoro/flash-dev](https://github.com/dominiqsoro/flash-dev)

<a name="fr-license"></a>
### Licence

Ce projet est distribué sous licence GNU General Public License v3.0 — voir le fichier [LICENSE](LICENSE) pour plus de détails.

<a name="fr-support-project"></a>
### Soutenir le projet

Flash-dev est **100 % gratuit**, grâce au modèle BYOK. Si l'outil vous fait gagner du temps, vous pouvez :

- **Star** le dépôt sur GitHub : [dominiqsoro/flash-dev](https://github.com/dominiqsoro/flash-dev)
- **Offrir un café** sur Ko-fi : [dominiqsoro](https://ko-fi.com/dominiqsoro)
- **Soutenir** sur Buy Me a Coffee : [dominiqsoro](https://www.buymeacoffee.com/dominiqsoro)
- **Signaler** des bugs ou proposer des fonctionnalités

<a name="fr-support"></a>
### Assistance

- **Issues** — [GitHub Issues](https://github.com/dominiqsoro/flash-dev/issues)
- **Documentation** — [README.md](https://github.com/dominiqsoro/flash-dev#readme)
- **Développeur** — [dominiqsoro](https://github.com/dominiqsoro)

<a name="fr-roadmap"></a>
### Feuille de route

- [x] Mode basique sans IA
- [x] Scan de sécurité intégré
- [ ] Commande `flash-dev clean` pour le nettoyage des branches locales
- [ ] Commande `flash-dev deploy` pour l'automatisation du déploiement
- [ ] Support multi-modèles IA (OpenAI, Anthropic, etc.)
- [ ] Configuration de prompt personnalisable
- [ ] Mode interactif avancé avec sélection de fichiers

<div align="right"><a href="#flash-dev">Back to top / Haut de page</a></div>

---

<div align="center">

**Developed with passion for developers, by developers**
**Développé avec passion pour les développeurs, par des développeurs**

</div>