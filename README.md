# QualityMax Auth Capture CLI

CLI tool to capture authentication sessions for QualityMax AI crawling.

## Installation

### One-line Install (macOS/Linux)

```bash
curl https://github.com/Quality-Max/qamax-rag-app/releases/latest/download/install.sh | sh
```

This installs the CLI to `/usr/local/lib/qamax` and creates a symlink at `/usr/local/bin/qamax-auth`.

### Manual Download

Download the appropriate binary from [GitHub Releases](https://github.com/Quality-Max/qamax-rag-app/releases):

| Platform | File |
|----------|------|
| macOS (Intel) | `qamax-auth-darwin-x64.tar.gz` |
| macOS (Apple Silicon) | `qamax-auth-darwin-arm64.tar.gz` |
| Linux (x64) | `qamax-auth-linux-x64.tar.gz` |
| Windows (x64) | `qamax-auth-win-x64.zip` |

### Uninstall

```bash
curl https://github.com/Quality-Max/qamax-rag-app/releases/latest/download/uninstall.sh | sh
```

## Usage

### Login

Authenticate with your QualityMax account:

```bash
qamax-auth login
```

### List Projects

```bash
qamax-auth projects
```

### Capture Authentication

Open a browser, log into your app, then save the session:

```bash
qamax-auth capture https://myapp.com -p PROJECT_ID -n "Profile Name"
```

Options:
- `-p, --project <id>` - Project ID (required)
- `-n, --name <name>` - Auth profile name (required)
- `-t, --timeout <ms>` - Browser timeout (default: 300000)

### Example Workflow

```bash
# 1. Login to QualityMax
qamax-auth login

# 2. List your projects
qamax-auth projects

# 3. Capture auth for staging environment
qamax-auth capture https://staging.myapp.com -p 42 -n "staging-auth"

# 4. Now run AI crawl with authentication
#    (via QualityMax web UI, select the auth profile)
```

## How It Works

1. Opens Chrome with remote debugging enabled
2. You log into your application manually
3. CLI captures cookies, localStorage, and session storage
4. Encrypts and uploads as an "Auth Profile" to QualityMax
5. AI crawl uses this profile to authenticate before crawling

## Development

### Prerequisites

- Node.js 18+
- Chrome browser installed

### Run from Source

```bash
cd tools/auth-capture-cli
npm install
node index.js login
```

### Build Standalone Binaries

```bash
npm run build
```

Outputs tarballs to `dist/`:
- `qamax-auth-vX.X.X-darwin-x64.tar.gz`
- `qamax-auth-vX.X.X-darwin-arm64.tar.gz`
- `qamax-auth-vX.X.X-linux-x64.tar.gz`
- `qamax-auth-vX.X.X-win-x64.zip`

### Release Process

1. Update version in `package.json`
2. Commit changes
3. Create and push a git tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. GitHub Actions automatically builds and publishes to Releases

## Architecture

```
tools/auth-capture-cli/
├── index.js              # CLI entry point (Commander.js)
├── lib/
│   ├── api.js            # QualityMax API client
│   ├── auth.js           # Login/token management
│   ├── browser.js        # Chrome launcher + CDP
│   └── config.js         # Config file (~/.qamax/config.json)
├── scripts/
│   ├── build.sh          # Build standalone binaries
│   ├── install.sh        # User install script
│   └── uninstall.sh      # User uninstall script
├── .github/workflows/
│   └── release.yml       # Auto-build on git tag
└── package.json
```

## Troubleshooting

### "Chrome not found"

Install Chrome or set the path:
```bash
export CHROME_PATH=/path/to/chrome
```

### "Permission denied" on install

The install script requires sudo:
```bash
sudo bash -c "curl ... | sh"
```

### Session not working in AI crawl

- Ensure you completed the full login flow before closing the browser
- Check if the session has expired (some sites have short session timeouts)
- Try capturing again with a fresh login
