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
- [3.1.0 — 2026-09-22](#en-v310)
- [3.0.0 — 2026-08-05](#en-v300)
- [2.0.0 — 2026-08-04](#en-v200)
- [1.1.0 — 2026-08-01](#en-v110)
- [1.0.0 — 2026-08-01](#en-v100)

</details>

<a name="en-unreleased"></a>
### [Unreleased]

**Planned**

- Command `flash-dev prepare` for pre-commit quality checks
- Command `flash-dev comments` for intelligent comment management
- Multi-model AI support (OpenAI, Anthropic, etc.)
- Customizable prompt configuration
- Advanced interactive mode with file selection

---

<a name="en-v310"></a>
### [3.1.0] — 2026-09-22

Audit de sécurité complet du projet, correction des défauts bloquants et quatre nouvelles commandes.

#### Fixed — Critical

- **`deps` and `fix` crashed on every invocation.** Both required `fs.promises` and then called `fs.existsSync`, which does not exist on that handle. Two of the advertised commands were entirely unusable.
- **Command injection in `node-switch`.** The version argument was interpolated into a `curl`/`powershell` shell string; `flash-dev node-switch '1";touch /tmp/PWNED;"' ` executed arbitrary commands. Same class of defect fixed in `create`, `laravel make-crud`, `sql-dump`, `scripts`, `nuke` and `sync`. All child processes now use discrete argv arrays and never a shell.
- **`sync` consumed unrelated stashes.** `git stash push` was allowed to fail silently on a clean tree, then `git stash pop` ran unconditionally and dumped an unrelated, previously saved stash into the current branch. The command now tracks its own stash by label and restores only that one.
- **`node-switch` installed unverified binaries.** Node.js archives were downloaded and extracted with no integrity check. `SHASUMS256.txt` is now fetched and verified; a mismatched archive is deleted and the install aborts.
- **`kill-node` sent SIGKILL to every Node process** with no listing and no confirmation, killing dev servers, watchers and editor language servers. It now lists candidates with their command line, protects editors/LSP/ancestors, asks for confirmation, and escalates SIGTERM → SIGKILL.

#### Fixed — Security engine correctness

- **`secure` blocked the removal of a secret.** Deleted lines were scanned, so committing the fix for a leak was impossible. Only added lines are audited now.
- **`secure` reported false positives.** A rule's `context` was tested against the whole diff instead of the line, so any 40-character string became a "critical AWS secret" when the word `aws_secret` appeared elsewhere. Context is now line-scoped.
- **`secure` reported diff offsets as line numbers.** A proper unified-diff parser now yields real `file:line` locations, and matched values are redacted in the output.
- **`scan` missed every second occurrence.** Rules used `/g` regexes with `.test()` in a loop, so `lastIndex` persisted between lines. Verified with a regression test on four identical lines.
- **`scan`'s "SQL injection" rule flagged all string concatenation**, and its bare `JOIN` keyword matched `array.join()`. Rules now require an actual SQL statement shape plus a dynamic value.
- **`nuke` matched branch names by substring.** An unmerged `fea` was listed as merged whenever `feature-done` was merged. Branch listing is now exact and uses a single git call instead of one per branch.
- **`sql-dump` exposed the database password** on the command line (readable via `ps aux`). Credentials now travel through `MYSQL_PWD`/`PGPASSWORD` only, dumps are written with mode 600, and empty dumps are discarded.

#### Fixed — Correctness & honesty

- `analyze` imported `scan` and `size` but never called them, despite advertising a security and quality audit. It now runs a real security scan and reports it.
- The "architecture score" was a constant formula (`70` + fixed bonuses) that returned 90 for any Git repository. It is now derived from measured signals, and every deduction is explained.
- `--json`, `--verbose` and `--quiet` are now real global flags. The README documented `analyze --json`, which previously failed with `unknown option`.
- `deps` reported scoped packages as unused (`@google/generative-ai` was read as `@google`) and flagged tooling that is never imported. It also now restores `package.json` when `npm install` fails after a removal.
- `env` no longer overwrites an existing `.env.example` without asking, and keeps a `.bak`.
- `pack` built the archive inside the directory it was reading, making `tar` exit 1 with "file changed as we read it" on every run. The archive is now staged outside the tree.
- `package.json` declared `"main": "index.js"`, a file that does not exist.

#### Added

- **`flash-dev hooks`** — installs and manages Git hooks: secret audit on `pre-commit`, Conventional Commits validation on `commit-msg`, security scan on `pre-push`. Foreign hooks are backed up, never clobbered; a missing `flash-dev` binary warns instead of making the repository un-committable.
- **`flash-dev changelog`** — generates a Keep a Changelog section from Conventional Commits, infers the semver bump (including `BREAKING CHANGE`), and inserts it without duplicating an existing version.
- **`flash-dev licenses`** — classifies dependency licenses (permissive / weak / strong copyleft / proprietary) and supports `--fail-on` as a CI gate.
- **`flash-dev ports [port]`** — lists listening TCP ports and frees an occupied one, via `lsof`, `ss` or `netstat`.
- **`flash-dev push` now runs the secret audit before committing** — the product's core promise was never wired in. Bypass with `--no-secure`.
- **`.flashdevignore`** support, plus an inline `flash-dev-ignore-secret` escape hatch.

#### Changed

- New `src/utils/exec.js`: every child process goes through a shell-free argv API.
- New shared modules: `core/secret-patterns.js`, `core/code-rules.js`, `core/diff-parser.js`, `core/conventional.js`, `utils/dotenv.js`, `utils/walk.js`.
- `core/errors.js` (84 lines, previously imported nowhere) now backs solution-oriented error rendering; `Logger` (created in six commands and never used) is wired to `--verbose`.
- The Gemini model is overridable via `FLASH_DEV_GEMINI_MODEL`; the default returns to a published identifier.
- Test suite: 17 → 282 tests, coverage 5% → 24% (94–100% on the security engines).
- CI runs on Node 18/20/22 plus Windows, fails on a stale lockfile, and makes flash-dev audit itself.

<a name="en-v300"></a>
### [3.0.0] - 2026-08-05

**Added**

- **Environment Diagnostics** — `flash-dev doctor` performs complete health checks (Git, Node, Docker, PHP, Database, Framework)
- **Project Analysis** — `flash-dev analyze` provides comprehensive project audits with architecture scoring
- **Dependency Management** — `flash-dev deps` analyzes unused packages, vulnerabilities, and outdated dependencies
- **Error Explanation** — `flash-dev explain` provides AI-powered error analysis with local fallback
- **Auto-Fix** — `flash-dev fix` automatically corrects ESLint, TypeScript, imports, and formatting issues
- **Cache Management** — `flash-dev cache` provides unified cache management (npm, pnpm, yarn, docker, Vite, Next.js)
- **Version Check** — `flash-dev version --check` verifies if updates are available on npm
- **Unit Tests** — Jest-based test suite for core modules
- **CI/CD** — GitHub Actions workflow for automated testing

**Features**

- Complete environment diagnostics with status indicators (✓ success, ⚠ warning, ✗ error)
- Framework detection (Next.js, React, Vue, Laravel, etc.)
- Dependency analysis with auto-fix mode (`--fix`)
- AI-powered error explanation with Gemini 2.5 Flash
- Local knowledge base fallback for error explanations
- Automatic backup creation before applying fixes
- Multi-tool cache detection and cleanup
- JSON output support for automation (`--json`)
- Improved basic mode for commit messages without API key
- Intelligent commit message generation based on file paths, extensions, and code patterns

**Improvements**

- Enhanced error handling with graceful exits (replaced `process.exit()` with `return`)
- Updated Gemini model from `gemini-1.5-flash` to `gemini-2.5-flash`
- Fallback to basic mode when AI fails (429 errors, depleted credits)
- Reduced sponsor messages (20%) and ads (10%) for better UX
- Updated README with detailed examples for all new commands
- Improved documentation with usage patterns and best practices

**Security**

- Pre-commit secret detection integrated into `flash-dev secure`
- Safe branch cleanup excluding protected branches
- Zero remote API key storage maintained
- Local configuration with restricted permissions

**Commands**

| Command | Description |
|---|---|
| `flash-dev doctor` | Complete environment diagnostics |
| `flash-dev analyze` | Project audit with architecture scoring |
| `flash-dev deps [--fix]` | Dependency analysis and auto-fix |
| `flash-dev explain [error]` | AI-powered error explanation |
| `flash-dev fix` | Auto-correction for code issues |
| `flash-dev cache [list/stats/clean]` | Unified cache management |
| `flash-dev version --check` | Check for updates on npm |

**Technical Changes**

- Added Jest for unit testing
- Added GitHub Actions CI/CD workflow
- Updated package.json to v3.0.0
- Updated description to "Copilote intelligent pour votre terminal"
- Added test scripts (test, test:watch, test:coverage)
- Improved error handling across all commands
- Enhanced monetization probabilities (20% sponsors, 10% ads, 70% silence)

**Documentation**

- Comprehensive README updates with examples for all v3.0.0 commands
- Added basic mode documentation for `flash-dev push`
- Updated CHANGELOG.md with v3.0.0 release notes
- Added test coverage documentation

---

<a name="en-v200"></a>
### [2.0.0] - 2026-08-04

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
- [3.1.0 — 2026-09-22](#fr-v310)
- [3.0.0 — 2026-08-05](#fr-v300)
- [2.0.0 — 2026-08-04](#fr-v200)
- [1.1.0 — 2026-08-01](#fr-v110)
- [1.0.0 — 2026-08-01](#fr-v100)

</details>

<a name="fr-unreleased"></a>
### [Non publié]

**Prévu**

- Commande `flash-dev prepare` pour les vérifications de qualité avant commit
- Commande `flash-dev comments` pour la gestion intelligente des commentaires
- Support multi-modèles IA (OpenAI, Anthropic, etc.)
- Configuration de prompt personnalisable
- Mode interactif avancé avec sélection de fichiers

---

<a name="fr-v310"></a>
### [3.1.0] — 2026-09-22

Audit de sécurité complet du projet, correction des défauts bloquants et quatre nouvelles commandes.

#### Corrigé — Critique

- **`deps` et `fix` plantaient à chaque appel.** Les deux importaient `fs.promises` puis appelaient `fs.existsSync`, qui n'existe pas sur cet objet. Deux commandes mises en avant étaient totalement inutilisables.
- **Injection de commande dans `node-switch`.** L'argument de version était interpolé dans une chaîne shell `curl`/`powershell` : `flash-dev node-switch '1";touch /tmp/PWNED;"'` exécutait des commandes arbitraires. Même classe de faille corrigée dans `create`, `laravel make-crud`, `sql-dump`, `scripts`, `nuke` et `sync`. Tous les processus fils utilisent désormais des tableaux argv, sans shell.
- **`sync` consommait un stash qui ne lui appartenait pas.** Le `git stash push` pouvait échouer silencieusement sur un arbre propre, puis le `git stash pop` s'exécutait inconditionnellement et déversait un stash sauvegardé des jours plus tôt dans la branche courante. La commande suit désormais son propre stash par label et ne restaure que celui-là.
- **`node-switch` installait des binaires non vérifiés.** Les archives Node.js étaient téléchargées et extraites sans aucun contrôle d'intégrité. `SHASUMS256.txt` est maintenant récupéré et vérifié ; une archive dont l'empreinte diffère est supprimée et l'installation annulée.
- **`kill-node` envoyait SIGKILL à tous les processus Node**, sans liste ni confirmation, tuant serveurs de dev, watchers et serveurs de langage des éditeurs. La commande liste désormais les candidats avec leur ligne de commande, protège éditeurs/LSP/ancêtres, demande confirmation et applique SIGTERM puis SIGKILL.

#### Corrigé — Justesse des moteurs de sécurité

- **`secure` empêchait de supprimer un secret.** Les lignes supprimées étaient analysées : il était impossible de committer la correction d'une fuite. Seules les lignes ajoutées sont auditées.
- **`secure` produisait des faux positifs.** Le `context` d'une règle était testé sur tout le diff au lieu de la ligne : toute chaîne de 40 caractères devenait un « secret AWS critique » dès que le mot `aws_secret` apparaissait ailleurs. Le contexte est désormais limité à la ligne.
- **`secure` affichait des offsets de diff comme numéros de ligne.** Un vrai analyseur de diff unifié fournit maintenant des emplacements `fichier:ligne` exacts, et les valeurs détectées sont masquées dans le rapport.
- **`scan` manquait une occurrence sur deux.** Les règles utilisaient des regex `/g` avec `.test()` en boucle : `lastIndex` persistait entre les lignes. Vérifié par un test de non-régression sur quatre lignes identiques.
- **La règle « injection SQL » de `scan` signalait toute concaténation de chaînes**, et son mot-clé `JOIN` isolé correspondait à `array.join()`. Les règles exigent désormais une vraie forme de requête SQL accompagnée d'une valeur dynamique.
- **`nuke` comparait les noms de branches par sous-chaîne.** Une branche `fea` non fusionnée était listée comme fusionnée dès que `feature-done` l'était. Le listage est maintenant exact et tient en un seul appel git au lieu d'un par branche.
- **`sql-dump` exposait le mot de passe** sur la ligne de commande (lisible via `ps aux`). Les identifiants transitent désormais uniquement par `MYSQL_PWD`/`PGPASSWORD`, les dumps sont écrits en mode 600 et un dump vide est supprimé.

#### Corrigé — Cohérence et sincérité

- `analyze` importait `scan` et `size` sans jamais les appeler, tout en annonçant un audit sécurité et qualité. Un vrai scan de sécurité est désormais exécuté et restitué.
- Le « score d'architecture » était une formule constante (`70` + bonus fixes) donnant 90 à tout dépôt Git. Il est maintenant dérivé de signaux mesurés, et chaque pénalité est expliquée.
- `--json`, `--verbose` et `--quiet` sont de véritables options globales. Le README documentait `analyze --json`, qui échouait avec `unknown option`.
- `deps` signalait les paquets scopés comme inutilisés (`@google/generative-ai` était lu comme `@google`) et les outils jamais importés. Il restaure aussi `package.json` si `npm install` échoue après une suppression.
- `env` n'écrase plus un `.env.example` existant sans demander, et conserve une sauvegarde `.bak`.
- `pack` créait l'archive dans le dossier qu'il lisait, faisant sortir `tar` en code 1 avec « file changed as we read it » à chaque exécution. L'archive est désormais construite hors de l'arborescence.
- `package.json` déclarait `"main": "index.js"`, un fichier inexistant.

#### Ajouté

- **`flash-dev hooks`** — installe et gère les hooks Git : audit des secrets sur `pre-commit`, validation Conventional Commits sur `commit-msg`, analyse de sécurité sur `pre-push`. Les hooks existants sont sauvegardés, jamais écrasés ; si le binaire `flash-dev` est absent, le hook avertit au lieu de rendre le dépôt non committable.
- **`flash-dev changelog`** — génère une section Keep a Changelog depuis les Conventional Commits, déduit la version semver (y compris `BREAKING CHANGE`) et l'insère sans dupliquer une version existante.
- **`flash-dev licenses`** — classe les licences des dépendances (permissive / copyleft faible / copyleft fort / propriétaire) et gère `--fail-on` comme garde-fou CI.
- **`flash-dev ports [port]`** — liste les ports TCP en écoute et libère un port occupé, via `lsof`, `ss` ou `netstat`.
- **`flash-dev push` lance désormais l'audit des secrets avant le commit** — la promesse centrale du produit n'était branchée nulle part. Contournement : `--no-secure`.
- Prise en charge de **`.flashdevignore`** et du marqueur inline `flash-dev-ignore-secret`.

#### Modifié

- Nouveau `src/utils/exec.js` : tout processus fils passe par une API argv sans shell.
- Nouveaux modules partagés : `core/secret-patterns.js`, `core/code-rules.js`, `core/diff-parser.js`, `core/conventional.js`, `utils/dotenv.js`, `utils/walk.js`.
- `core/errors.js` (84 lignes, importé nulle part) alimente désormais un rendu d'erreur orienté solution ; le `Logger` (créé dans six commandes, jamais utilisé) est branché sur `--verbose`.
- Le modèle Gemini est surchargeable via `FLASH_DEV_GEMINI_MODEL` ; la valeur par défaut revient à un identifiant publié.
- Suite de tests : 17 → 282 tests, couverture 5 % → 24 % (94–100 % sur les moteurs de sécurité).
- CI sur Node 18/20/22 et Windows, échec sur lockfile désynchronisé, et flash-dev s'audite lui-même.

<a name="fr-v300"></a>
### [3.0.0] - 2026-08-05

**Ajouté**

- **Diagnostics d'environnement** — `flash-dev doctor` effectue des vérifications de santé complètes (Git, Node, Docker, PHP, Base de données, Framework)
- **Analyse de projet** — `flash-dev analyze` fournit des audits complets de projet avec scoring d'architecture
- **Gestion des dépendances** — `flash-dev deps` analyse les packages inutilisés, les vulnérabilités et les dépendances obsolètes
- **Explication d'erreurs** — `flash-dev explain` fournit une analyse d'erreurs propulsée par IA avec repli local
- **Auto-correction** — `flash-dev fix` corrige automatiquement les problèmes ESLint, TypeScript, imports et formatage
- **Gestion des caches** — `flash-dev cache` fournit une gestion unifiée des caches (npm, pnpm, yarn, docker, Vite, Next.js)
- **Vérification de version** — `flash-dev version --check` vérifie si des mises à jour sont disponibles sur npm
- **Tests unitaires** — Suite de tests basée sur Jest pour les modules principaux
- **CI/CD** — Workflow GitHub Actions pour les tests automatisés

**Fonctionnalités**

- Diagnostics complets de l'environnement avec indicateurs de statut (✓ succès, ⚠ avertissement, ✗ erreur)
- Détection de framework (Next.js, React, Vue, Laravel, etc.)
- Analyse des dépendances avec mode auto-correction (`--fix`)
- Explication d'erreurs propulsée par IA avec Gemini 2.5 Flash
- Base de connaissances locale de repli pour les explications d'erreurs
- Création automatique de sauvegardes avant application des corrections
- Détection et nettoyage multi-outils des caches
- Support de sortie JSON pour l'automatisation (`--json`)
- Mode basique amélioré pour les messages de commit sans clé API
- Génération intelligente de messages de commit basée sur les chemins de fichiers, extensions et patterns de code

**Améliorations**

- Gestion d'erreurs améliorée avec sorties gracieuses (remplacement de `process.exit()` par `return`)
- Mise à jour du modèle Gemini de `gemini-1.5-flash` à `gemini-2.5-flash`
- Repli vers le mode basique lorsque l'IA échoue (erreurs 429, crédits épuisés)
- Réduction des messages de sponsors (20 %) et de publicités (10 %) pour une meilleure UX
- README mis à jour avec des exemples détaillés pour toutes les nouvelles commandes
- Documentation améliorée avec des patterns d'utilisation et meilleures pratiques

**Sécurité**

- Détection des secrets avant commit intégrée dans `flash-dev secure`
- Nettoyage de branches sécurisé excluant les branches protégées
- Maintien du stockage zéro des clés API à distance
- Configuration locale avec permissions restreintes

**Commandes**

| Commande | Description |
|---|---|
| `flash-dev doctor` | Diagnostics complets de l'environnement |
| `flash-dev analyze` | Audit de projet avec scoring d'architecture |
| `flash-dev deps [--fix]` | Analyse des dépendances et auto-correction |
| `flash-dev explain [error]` | Explication d'erreurs propulsée par IA |
| `flash-dev fix` | Auto-correction des problèmes de code |
| `flash-dev cache [list/stats/clean]` | Gestion unifiée des caches |
| `flash-dev version --check` | Vérifier les mises à jour sur npm |

**Changements techniques**

- Ajout de Jest pour les tests unitaires
- Ajout du workflow CI/CD GitHub Actions
- Mise à jour de package.json à v3.0.0
- Mise à jour de la description en "Copilote intelligent pour votre terminal"
- Ajout de scripts de test (test, test:watch, test:coverage)
- Amélioration de la gestion d'erreurs dans toutes les commandes
- Amélioration des probabilités de monétisation (20 % sponsors, 10 % publicités, 70 % silence)

**Documentation**

- Mises à jour complètes du README avec des exemples pour toutes les commandes v3.0.0
- Ajout de la documentation du mode basique pour `flash-dev push`
- Mise à jour de CHANGELOG.md avec les notes de version v3.0.0
- Ajout de la documentation de couverture de tests

---

<a name="fr-v200"></a>
### [2.0.0] - 2026-08-04

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