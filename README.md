# flash-dev

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![NPM Version](https://img.shields.io/npm/v/flash-dev.svg)](https://www.npmjs.com/package/flash-dev)
[![Node.js Version](https://img.shields.io/node/v/flash-dev.svg)](https://www.npmjs.com/package/flash-dev)
[![Downloads](https://img.shields.io/npm/dw/flash-dev.svg)](https://www.npmjs.com/package/flash-dev)

**Intelligent CLI automation tool for developers - 100% Free & Open-Source**

Flash-dev automates your Git workflow in a single command: `git add` + `AI-powered commit` + `git push`. No need to leave the terminal or use the mouse!

## Features

- **Git Automation** - Single command for add, commit and push
- **AI-Powered Commits** - Uses Gemini 2.5 Flash to generate Conventional Commits (optional)
- **Basic Mode** - Works without AI with simple message generation
- **Security Scan** - Detects vulnerabilities in your code
- **Maximum Security** - BYOK (Bring Your Own Key) architecture - zero remote key storage
- **User Validation** - Interactive confirmation before each commit
- **Easy Installation** - Available on NPM with `npm install -g flash-dev`
- **Open Source** - Completely free and transparent code

## Requirements

- **Node.js** (Version LTS >= 18.0.0)
- **Git** installed and configured
- A **Google Gemini API key** (free, but optional - works without it)

## Installation

### Global Installation via NPM

```bash
npm install -g flash-dev
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/dominiqsoro/flash-dev.git
cd flash-dev

# Install dependencies
npm install

# Link package locally
npm link
```

## Getting a Gemini API Key

Flash-dev uses the **Gemini 2.5 Flash** model from Google to generate intelligent commit messages. Here's how to get your API key for free:

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

**Important**: Your API key is stored **only locally** on your machine. It is never sent to our servers.

## Usage

### Main Command: `flash-dev push`

Automates the complete Git workflow:

```bash
flash-dev push
```

**What the command does:**

1. **Check** - Verifies the folder is a valid Git repository
2. **Index** - Executes `git add .` to stage all files
3. **Capture** - Captures changes via `git diff --cached`
4. **Generate** - Sends diff to Gemini to generate a Conventional Commits message (if API key configured)
5. **Validate** - Displays generated message and asks for confirmation
6. **Commit** - Executes `git commit` with validated message
7. **Push** - Automatically detects branch and does `git push`

### Security Analysis: `flash-dev scan`

Analyzes your project to detect security vulnerabilities:

```bash
flash-dev scan
```

**What the command detects:**

- **API Keys** - Exposed API keys in code
- **URLs** - Hardcoded URLs
- **Debug** - Debug statements (console.log, debugger)
- **SQL** - SQL injection patterns
- **Eval** - Dangerous eval/exec usage
- **Dependencies** - Known vulnerable dependencies

### Check Status: `flash-dev status`

Displays system status and version:

```bash
flash-dev status
```

### Help

```bash
flash-dev --help
```

## Example Commit Messages

The AI generates messages following **Conventional Commits**:

- `feat(ui): add navbar component`
- `fix(auth): resolve login timeout issue`
- `docs(readme): update installation guide`
- `refactor(api): simplify user endpoint`
- `test(utils): add unit tests for parser`

**Basic mode (without AI):**

- `feat(core): add 2 files`
- `fix(general): update 1 file`
- `docs(docs): add 1 file`

## Security & Privacy

### Security Architecture

- **Zero Remote Storage** - API keys are never stored on our servers
- **Direct Transfer** - Data flows directly from your machine to Google's secure API
- **Local Permissions** - Configuration file restricted to your system user permissions
- **Automatic Filtering** - Binary and large files are automatically excluded from diff sent to AI

### API Key Management

**Source Priority:**
1. Environment variable `GEMINI_API_KEY`
2. Local configuration file (~/.flash-dev/config.json)

**First Launch:**
If no key is detected, flash-dev prompts you to configure an API key or use basic mode.

**To configure key via environment variable:**

```bash
# Linux/Mac
export GEMINI_API_KEY="your_key_here"

# Windows (PowerShell)
$env:GEMINI_API_KEY="your_key_here"

# Windows (CMD)
set GEMINI_API_KEY=your_key_here
```

## Advanced Configuration

### Token Limit

The diff sent to AI is automatically truncated to **4,000 characters** to avoid API limit overruns.

### Automatically Excluded Files

The following files are automatically excluded from diff:
- Binary files
- `package-lock.json`
- `yarn.lock`
- `.min.js` and `.min.css` files

## Contributing

Flash-dev is an open-source project! Contributions are welcome:

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`flash-dev push`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request on [dominiqsoro/flash-dev](https://github.com/dominiqsoro/flash-dev)

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Support the Project

Flash-dev is **100% free** thanks to the BYOK model. If the tool saves you time, consider:

- **Star** - Give a star on GitHub: [dominiqsoro/flash-dev](https://github.com/dominiqsoro/flash-dev)
- **Coffee** - Buy me a coffee on Ko-fi: [dominiqsoro](https://ko-fi.com/dominiqsoro)
- **Support** - Support on Buy Me a Coffee: [dominiqsoro](https://www.buymeacoffee.com/dominiqsoro)
- **Report** - Report bugs or suggest features

## Support

- **Issues** - [GitHub Issues](https://github.com/dominiqsoro/flash-dev/issues)
- **Documentation** - [README.md](https://github.com/dominiqsoro/flash-dev#readme)
- **Developer** - [dominiqsoro](https://github.com/dominiqsoro)

## Roadmap

- [x] Basic mode without AI
- [x] Integrated security scan
- [ ] Command `flash-dev clean` for local branch cleanup
- [ ] Command `flash-dev deploy` for deployment automation
- [ ] Multi-model AI support (OpenAI, Anthropic, etc.)
- [ ] Customizable prompt configuration
- [ ] Advanced interactive mode with file selection

---

**Developed with passion for developers, by developers**
