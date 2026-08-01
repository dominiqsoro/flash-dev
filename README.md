# 🚀 flash-dev

**Boîte à outils d'automatisation intelligente en ligne de commande (CLI) pour développeurs — 100% Gratuit & Open-Source**

Flash-dev automatise votre workflow Git en une seule commande : `git add` + `commit intelligent via IA` + `git push`. Plus besoin de quitter le terminal ni de manipuler la souris !

## ✨ Fonctionnalités

- ⚡ **Workflow Git automatisé** : Une seule commande pour add, commit et push
- 🤖 **Messages de commit intelligents** : Utilise Gemini 2.5 Flash pour générer des messages Conventional Commits (optionnel)
- 🔄 **Mode basique** : Fonctionne sans IA avec génération de messages simples
- 🔍 **Analyse de sécurité** : Détecte les vulnérabilités dans votre code
- 🔒 **Sécurité maximale** : Architecture BYOK (Bring Your Own Key) - zéro stockage distant de clés
- 🎯 **Validation utilisateur** : Garde-fou interactif avant chaque commit
- 📦 **Installation simple** : Disponible sur NPM avec `npm install -g flash-dev`
- 💜 **Open Source** : Code entièrement gratuit et transparent

## 📋 Prérequis

- **Node.js** (Version LTS ≥ 18.0.0)
- **Git** installé et configuré
- Une **clé API Google Gemini** (gratuite, mais optionnelle - fonctionne sans)

## 🔧 Installation

### Installation globale via NPM

```bash
npm install -g flash-dev
```

### Test local (pour le développement)

```bash
# Cloner le dépôt
git clone https://github.com/dominiqsoro/flash-dev.git
cd flash-dev

# Installer les dépendances
npm install

# Lier le package localement
npm link
```

## 🔑 Obtenir une clé API Gemini

Flash-dev utilise le modèle **Gemini 2.5 Flash** de Google pour générer des messages de commit intelligents. Voici comment obtenir votre clé API gratuitement :

1. Visitez [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Create API Key"
4. Copiez votre clé API

⚠️ **Important** : Votre clé API est stockée **uniquement localement** sur votre machine. Elle n'est jamais envoyée à nos serveurs.

## 🚀 Utilisation

### Commande principale : `flash-dev push`

Automatise le workflow Git complet :

```bash
flash-dev push
```

**Ce que fait la commande :**

1. ✅ Vérifie que le dossier est un dépôt Git valide
2. 📦 Exécute `git add .` pour indexer tous les fichiers
3. 🔍 Capture les modifications via `git diff --cached`
4. 🤖 Envoie le diff à Gemini pour générer un message Conventional Commits (si clé API configurée)
5. 👤 Affiche le message généré et demande votre confirmation
6. 💾 Exécute `git commit` avec le message validé
7. 📤 Détecte automatiquement la branche et fait `git push`

### Analyse de sécurité : `flash-dev scan`

Analyse votre projet pour détecter les vulnérabilités de sécurité :

```bash
flash-dev scan
```

**Ce que détecte la commande :**

- 🔑 Clés API exposées dans le code
- 🔗 URLs hardcodées
- 🐛 Instructions de debug (console.log, debugger)
- 💉 Patterns d'injection SQL
- ⚠️ Utilisation dangereuse de eval/exec
- 📦 Dépendances vulnérables connues

### Vérifier l'état : `flash-dev status`

Affiche l'état du système et la version :

```bash
flash-dev status
```

### Aide

```bash
flash-dev --help
```

## 📝 Exemples de messages de commit générés

L'IA génère des messages conformes aux **Conventional Commits** :

- `feat(ui): add navbar component`
- `fix(auth): resolve login timeout issue`
- `docs(readme): update installation guide`
- `refactor(api): simplify user endpoint`
- `test(utils): add unit tests for parser`

**Mode basique (sans IA) :**

- `feat(core): add 2 files`
- `fix(general): update 1 file`
- `docs(docs): add 1 file`

## 🔒 Sécurité & Vie Privée

### Architecture de sécurité

- **Zéro stockage distant** : Les clés API ne sont jamais stockées sur nos serveurs
- **Transfert direct** : Les données transitent directement de votre machine vers l'API sécurisée de Google
- **Permissions locales** : Le fichier de configuration est restreint aux permissions de votre utilisateur système
- **Filtrage automatique** : Les fichiers binaires et volumineux sont automatiquement exclus du diff envoyé à l'IA

### Gestion de la clé API

**Priorité des sources :**
1. Variable d'environnement `GEMINI_API_KEY`
2. Fichier de configuration local (~/.herozion/config.json)

**Premier lancement :**
Si aucune clé n'est détectée, flash-dev vous propose de configurer une clé API ou d'utiliser le mode basique.

**Pour configurer la clé via variable d'environnement :**

```bash
# Linux/Mac
export GEMINI_API_KEY="votre_clé_ici"

# Windows (PowerShell)
$env:GEMINI_API_KEY="votre_clé_ici"

# Windows (CMD)
set GEMINI_API_KEY=votre_clé_ici
```

## 🛠️ Configuration avancée

### Limite de tokens

Le diff envoyé à l'IA est automatiquement tronqué à **4 000 caractères** pour éviter les dépassements de limites de l'API.

### Fichiers exclus automatiquement

Les fichiers suivants sont automatiquement exclus du diff :
- Fichiers binaires
- `package-lock.json`
- `yarn.lock`
- Fichiers `.min.js` et `.min.css`

## 🤝 Contribution

Flash-dev est un projet open-source ! Les contributions sont les bienvenues :

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`flash-dev push` 😉)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request sur [dominiqsoro/flash-dev](https://github.com/dominiqsoro/flash-dev)

## 📄 Licence

ISC License - Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 💜 Soutenir le projet

Flash-dev est **100% gratuit** grâce au modèle BYOK. Si l'outil vous fait gagner du temps, envisagez de :

- ⭐ **Donner une étoile** sur GitHub : [dominiqsoro/flash-dev](https://github.com/dominiqsoro/flash-dev)
- ☕ **Offrir un café** sur Ko-fi : [dominiqsoro](https://ko-fi.com/dominiqsoro)
- ☕ **Soutenir** sur Buy Me a Coffee : [dominiqsoro](https://www.buymeacoffee.com/dominiqsoro)
- 🐛 **Signaler** des bugs ou proposer des fonctionnalités

## 📞 Support

- **Issues** : [GitHub Issues](https://github.com/dominiqsoro/flash-dev/issues)
- **Documentation** : [README.md](https://github.com/dominiqsoro/flash-dev#readme)
- **Développeur** : [dominiqsoro](https://github.com/dominiqsoro)

## 🚧 Roadmap

- [x] Mode basique sans IA
- [x] Analyse de sécurité intégrée
- [ ] Commande `flash-dev clean` pour nettoyer les branches locales
- [ ] Commande `flash-dev deploy` pour automatiser les déploiements
- [ ] Support multi-modèles IA (OpenAI, Anthropic, etc.)
- [ ] Configuration personnalisable des prompts
- [ ] Mode interactif avancé avec sélection de fichiers

---

**Développé avec ❤️ pour les développeurs, par des développeurs**
