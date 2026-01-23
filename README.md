# QualityMax Auth Capture CLI

CLI tool to capture authentication sessions for QualityMax AI crawling.

## Installation

```bash
npm install -g qamax-auth-cli
```

Or run directly with npx (no install needed):

```bash
npx qamax-auth-cli login
```

### Requirements

- Node.js 18+
- Chrome browser installed

## Usage

### 1. Login to QualityMax

```bash
qamax-auth login
```

This opens your browser to authenticate with QualityMax and saves your token locally.

### 2. List Your Projects

```bash
qamax-auth projects
```

### 3. Capture Authentication

Open Chrome, log into your app manually, then the CLI captures and uploads the session:

```bash
qamax-auth capture https://myapp.com -p PROJECT_ID -n "profile-name"
```

**Options:**
- `-p, --project <id>` - Project ID (required)
- `-n, --name <name>` - Auth profile name (required)
- `-t, --timeout <ms>` - Browser timeout (default: 300000)

### Example Workflow

```bash
# Login to QualityMax
qamax-auth login

# List your projects to find the ID
qamax-auth projects

# Capture auth for your staging environment
qamax-auth capture https://staging.myapp.com -p 42 -n "staging_auth"

# The captured auth is now available in your project's User Data Variables
# Use it in AI Crawl to authenticate before crawling
```

## How It Works

1. Opens Chrome with remote debugging enabled
2. You log into your application manually
3. When you press ENTER, CLI captures cookies, localStorage, and session storage
4. Uploads encrypted storage state to your QualityMax project (User Data Variables)
5. AI Crawl can use this auth data to access authenticated pages

## Troubleshooting

### "Chrome not found"

Install Chrome or set the path:
```bash
export CHROME_PATH=/path/to/chrome
```

### Session not working in AI Crawl

- Ensure you completed the full login flow before pressing ENTER
- Check if the session has expired (some sites have short session timeouts)
- Try capturing again with a fresh login

## Links

- [npm package](https://www.npmjs.com/package/qamax-auth-cli)
- [GitHub repo](https://github.com/Quality-Max/qamax-auth-cli)
- [QualityMax](https://app.qamax.co)
