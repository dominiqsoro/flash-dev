<a name="top"></a>
<div align="center">

# Changelog — Flash-Dev

**All notable changes to this project are documented in this file.**
**Toutes les modifications notables de ce projet sont documentées dans ce fichier.**

[![Keep a Changelog](https://img.shields.io/badge/changelog-Keep%20a%20Changelog-orange.svg)](https://keepachangelog.com/en/1.0.0/)
[![Semantic Versioning](https://img.shields.io/badge/versioning-SemVer%202.0.0-blue.svg)](https://semver.org/spec/v2.0.0.html)

<a href="#english"><strong>English</strong></a>
&nbsp;·&nbsp;
<a href="#francais"><strong>Français</strong></a>

</div>

<br />

---

<a name="english"></a>
## English

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<details>
<summary><strong>Versions</strong></summary>

- [Unreleased](#en-unreleased)
- [1.1.0 — 2026-08-01](#en-v110)
- [1.0.0 — 2026-08-01](#en-v100)

</details>

<a name="en-unreleased"></a>
### [Unreleased]

**Planned**

- Command `flash-dev deploy` for deployment automation
- Multi-model AI support (OpenAI, Anthropic, etc.)
- Customizable prompt configuration
- Advanced interactive mode with file selection

---

<a name="en-v110"></a>
### [1.1.0] - 2026-08-01

**Added**

- **Environment Generator** — `flash-dev env` creates secure `.env.example` files
- **Secret Audit** — `flash-dev secure` prevents accidental secret leaks before a commit
- **Disk Cleanup** — `flash-dev clean` frees space by cleaning caches and old projects
- **Branch Sync** — `flash-dev sync` synchronizes the working branch with main
- **Branch Cleanup** — `flash-dev nuke` safely removes merged local branches

**Features**

- Automated `.env.example` generation with sensitive value filtering
- Pre-commit secret detection (SSH keys, AWS/Stripe/Google API keys, JWT tokens, database passwords)
- Recursive disk cleanup for `node_modules`, build caches, and old projects
- Automatic branch synchronization with a stash/rebase workflow
- Batch deletion of merged local branches, excluding protected branches

**Security Enhancements**

- Comprehensive secret pattern detection (11 patterns, including SSH, AWS, Stripe, Google, GitHub)
- Git diff analysis limited to staged changes only
- Automatic commit blocking when secrets are detected
- Safe branch cleanup, excluding `main`/`master`/`dev`/`develop`/`staging`/`production`

**Commands**

| Command | Description |
|---|---|
| `flash-dev env` | Generate `.env.example` from `.env` |
| `flash-dev secure` | Audit staged changes for secrets |
| `flash-dev clean` | Clean disk space and caches |
| `flash-dev sync` | Sync branch with main |
| `flash-dev nuke` | Clean merged branches |

**Documentation**

- Updated README with new commands
- Added usage examples for each new command
- Updated `package.json` keywords and version

---

<a name="en-v100"></a>
### [1.0.0] - 2026-08-01

**Added**

- **Git automation** — single-command workflow (add + commit + push)
- **AI-powered commit messages** — integration with Gemini 2.5 Flash for Conventional Commits
- **Basic mode** — fallback without AI for local commit message generation
- **Security scan** — vulnerability detection for API keys, hardcoded URLs, debug statements, SQL injection patterns, and vulnerable dependencies
- **BYOK architecture** — Bring Your Own Key, with zero remote storage
- **User validation** — interactive confirmation before commits
- **Ethical monetization** — discreet sponsor messages (30% support, 20% ads, 50% silence)
- **NPM-ready** — global installation via `npm install -g flash-dev`

**Features**

- Multi-language support (English commit messages, French CLI interface)
- Automatic file filtering (binaries, `package-lock.json`, `yarn.lock`, minified files)
- Token limit management (4,000-character diff truncation)
- Config storage in `~/.flash-dev/config.json`
- Environment variable support (`GEMINI_API_KEY`)
- Security patterns optimized for false-positive reduction
- Color-coded terminal output with picocolors

**Security**

- Zero remote API key storage
- Local configuration with restricted permissions
- Automatic exclusion of sensitive files from the git diff
- Secure dependency scanning

**Commands**

| Command | Description |
|---|---|
| `flash-dev push` | Automate the Git workflow |
| `flash-dev scan` | Security vulnerability analysis |
| `flash-dev status` | System status and version info |
| `flash-dev --help` | Command help |

**Documentation**

- Complete README with installation guide
- Security and privacy documentation
- Contribution guidelines
- Sponsorship information

**Sponsorship Links**

| Platform | Link |
|---|---|
| Ko-fi | https://ko-fi.com/dominiqsoro |
| Buy Me a Coffee | https://www.buymeacoffee.com/dominiqsoro |
| GitHub | https://github.com/dominiqsoro/flash-dev |
| Hostinger promo code | `1BY1403` |

**Technical Details**

| Item | Value |
|---|---|
| Node.js | >= 18.0.0 required |
| Dependencies | `@google/genai`, `commander`, `picocolors`, `prompts` |
| License | GPL-3.0 |
| Repository | https://github.com/dominiqsoro/flash-dev |

<div align="right"><a href="#top">Back to top</a></div>

---

<a name="francais"></a>
## Français

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), et ce projet respecte le [Versionnage Sémantique](https://semver.org/spec/v2.0.0.html).

<details>
<summary><strong>Versions</strong></summary>

- [Non publié](#fr-unreleased)
- [1.1.0 — 2026-08-01](#fr-v110)
- [1.0.0 — 2026-08-01](#fr-v100)

</details>

<a name="fr-unreleased"></a>
### [Non publié]

**Prévu**

- Commande `flash-dev deploy` pour l'automatisation du déploiement
- Support multi-modèles IA (OpenAI, Anthropic, etc.)
- Configuration de prompt personnalisable
- Mode interactif avancé avec sélection de fichiers

---

<a name="fr-v110"></a>
### [1.1.0] - 2026-08-01

**Ajouté**

- **Générateur d'environnement** — `flash-dev env` crée des fichiers `.env.example` sécurisés
- **Audit des secrets** — `flash-dev secure` empêche les fuites accidentelles de secrets avant un commit
- **Nettoyage du disque** — `flash-dev clean` libère de l'espace en nettoyant les caches et les anciens projets
- **Synchronisation de branche** — `flash-dev sync` synchronise la branche de travail avec main
- **Nettoyage des branches** — `flash-dev nuke` supprime en toute sécurité les branches locales fusionnées

**Fonctionnalités**

- Génération automatisée de `.env.example` avec filtrage des valeurs sensibles
- Détection des secrets avant commit (clés SSH, clés API AWS/Stripe/Google, tokens JWT, mots de passe de base de données)
- Nettoyage récursif du disque pour `node_modules`, les caches de build et les anciens projets
- Synchronisation automatique des branches avec un workflow stash/rebase
- Suppression par lot des branches locales fusionnées, à l'exclusion des branches protégées

**Améliorations de sécurité**

- Détection exhaustive de motifs de secrets (11 motifs, dont SSH, AWS, Stripe, Google, GitHub)
- Analyse du diff Git limitée aux changements indexés
- Blocage automatique du commit en cas de détection de secrets
- Nettoyage de branches sécurisé, à l'exclusion de `main`/`master`/`dev`/`develop`/`staging`/`production`

**Commandes**

| Commande | Description |
|---|---|
| `flash-dev env` | Génère un `.env.example` à partir de `.env` |
| `flash-dev secure` | Audite les changements indexés à la recherche de secrets |
| `flash-dev clean` | Nettoie l'espace disque et les caches |
| `flash-dev sync` | Synchronise la branche avec main |
| `flash-dev nuke` | Nettoie les branches fusionnées |

**Documentation**

- README mis à jour avec les nouvelles commandes
- Ajout d'exemples d'utilisation pour chaque nouvelle commande
- Mots-clés et version mis à jour dans `package.json`

---

<a name="fr-v100"></a>
### [1.0.0] - 2026-08-01

**Ajouté**

- **Automatisation Git** — workflow en une seule commande (add + commit + push)
- **Messages de commit propulsés par IA** — intégration de Gemini 2.5 Flash pour Conventional Commits
- **Mode basique** — solution de repli sans IA pour la génération locale de messages de commit
- **Scan de sécurité** — détection de vulnérabilités pour les clés API, URLs codées en dur, instructions de débogage, schémas d'injection SQL et dépendances vulnérables
- **Architecture BYOK** — Bring Your Own Key, sans aucun stockage à distance
- **Validation utilisateur** — confirmation interactive avant chaque commit
- **Monétisation éthique** — messages sponsor discrets (30 % soutien, 20 % publicité, 50 % silence)
- **Prêt pour NPM** — installation globale via `npm install -g flash-dev`

**Fonctionnalités**

- Support multilingue (messages de commit en anglais, interface CLI en français)
- Filtrage automatique des fichiers (binaires, `package-lock.json`, `yarn.lock`, fichiers minifiés)
- Gestion de la limite de tokens (troncature du diff à 4 000 caractères)
- Stockage de la configuration dans `~/.flash-dev/config.json`
- Support des variables d'environnement (`GEMINI_API_KEY`)
- Motifs de sécurité optimisés pour réduire les faux positifs
- Sortie terminal colorée avec picocolors

**Sécurité**

- Aucun stockage à distance des clés API
- Configuration locale avec permissions restreintes
- Exclusion automatique des fichiers sensibles du diff git
- Analyse sécurisée des dépendances

**Commandes**

| Commande | Description |
|---|---|
| `flash-dev push` | Automatise le workflow Git |
| `flash-dev scan` | Analyse des vulnérabilités de sécurité |
| `flash-dev status` | Statut du système et informations de version |
| `flash-dev --help` | Aide sur les commandes |

**Documentation**

- README complet avec guide d'installation
- Documentation sur la sécurité et la confidentialité
- Consignes de contribution
- Informations de sponsoring

**Liens de sponsoring**

| Plateforme | Lien |
|---|---|
| Ko-fi | https://ko-fi.com/dominiqsoro |
| Buy Me a Coffee | https://www.buymeacoffee.com/dominiqsoro |
| GitHub | https://github.com/dominiqsoro/flash-dev |
| Code promo Hostinger | `1BY1403` |

**Détails techniques**

| Élément | Valeur |
|---|---|
| Node.js | >= 18.0.0 requis |
| Dépendances | `@google/genai`, `commander`, `picocolors`, `prompts` |
| Licence | GPL-3.0 |
| Dépôt | https://github.com/dominiqsoro/flash-dev |

<div align="right"><a href="#top">Back to top / Haut de page</a></div>