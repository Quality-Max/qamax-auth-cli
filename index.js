#!/usr/bin/env node

/**
 * QualityMax Auth Capture CLI
 *
 * Usage:
 *   qamax-auth login                    - Login to QualityMax
 *   qamax-auth projects                 - List your projects
 *   qamax-auth capture <url> -p ID -n NAME  - Capture auth from a site
 */

const { program } = require('commander');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Version from package.json
const packageJson = require('./package.json');

// Config file location
const CONFIG_DIR = path.join(os.homedir(), '.qamax');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

program
  .name('qamax-auth')
  .description('QualityMax CLI Authentication')
  .version(packageJson.version);

program
  .command('login')
  .description('Log in to QualityMax via your browser')
  .option('-a, --api-url <url>', 'QualityMax app URL', 'https://app.qamax.co/app')
  .option('-p, --port <port>', 'Local callback port', '9876')
  .option('-b, --browser <app>', 'Browser: safari, chrome, firefox, edge (uses default if not specified)')
  .action(async (options) => {
    await login(options);
  });

program
  .command('logout')
  .description('Log out and remove saved credentials')
  .action(() => {
    logout();
  });

program
  .command('token')
  .description('Print the current API token')
  .action(() => {
    printToken();
  });

program
  .command('status')
  .description('Check authentication status')
  .action(() => {
    checkStatus();
  });

program
  .command('projects')
  .description('List your QualityMax projects')
  .action(async () => {
    await listProjects();
  });

program
  .command('capture <url>')
  .description('Capture auth from a website and save as QualityMax auth profile')
  .requiredOption('-p, --project-id <id>', 'QualityMax project ID')
  .requiredOption('-n, --name <name>', 'Name for the auth profile')
  .option('-o, --output <file>', 'Also save storage state to local file')
  .action(async (url, options) => {
    await captureAndUpload(url, options);
  });

program.parse();

async function login(options) {
  const chalk = (await import('chalk')).default;

  console.log(chalk.cyan('\n  QualityMax CLI Login\n'));

  const port = parseInt(options.port);
  const callbackUrl = `http://localhost:${port}/callback`;
  // Remove trailing slash from apiUrl before adding hash
  const baseUrl = options.apiUrl.replace(/\/$/, '');
  const loginUrl = `${baseUrl}#/cli-login?callback=${encodeURIComponent(callbackUrl)}`;

  console.log(chalk.gray(`  Opening browser to:\n  ${loginUrl}\n`));

  // Create a promise that resolves when we get the token
  const tokenPromise = new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);

      if (url.pathname === '/callback') {
        const token = url.searchParams.get('token');
        const error = url.searchParams.get('error');

        // Send response to browser
        res.writeHead(200, { 'Content-Type': 'text/html' });

        if (token) {
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>QualityMax CLI - Success</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                       display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;
                       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                .card { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
                h1 { color: #22c55e; margin: 0 0 10px 0; }
                p { color: #666; margin: 0; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>&#10003; Authenticated!</h1>
                <p>You can close this window and return to the terminal.</p>
              </div>
            </body>
            </html>
          `);
          resolve(token);
        } else {
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>QualityMax CLI - Error</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                       display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;
                       background: #fee2e2; }
                .card { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
                h1 { color: #ef4444; margin: 0 0 10px 0; }
                p { color: #666; margin: 0; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>&#10007; Authentication Failed</h1>
                <p>${error || 'Unknown error'}</p>
              </div>
            </body>
            </html>
          `);
          reject(new Error(error || 'Authentication failed'));
        }

        // Close server after response
        setTimeout(() => server.close(), 100);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, 'localhost', () => {
      console.log(chalk.gray(`  Waiting for authentication on port ${port}...\n`));
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Try --port <other-port>`));
      } else {
        reject(err);
      }
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authentication timed out'));
    }, 5 * 60 * 1000);
  });

  // Open browser using system command (opens in new tab if browser is running)
  try {
    const { exec } = require('child_process');
    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS: use 'open' command
      let cmd;
      if (options.browser && options.browser !== 'default') {
        const browserApps = {
          'safari': 'Safari',
          'chrome': 'Google Chrome',
          'firefox': 'Firefox',
          'edge': 'Microsoft Edge',
          'brave': 'Brave Browser',
          'arc': 'Arc',
        };
        const appName = browserApps[options.browser.toLowerCase()] || options.browser;
        cmd = `open -a "${appName}" "${loginUrl}"`;
        console.log(chalk.gray(`  Using ${appName}...\n`));
      } else {
        cmd = `open "${loginUrl}"`;
      }
      exec(cmd, (err) => {
        if (err) console.log(chalk.yellow(`  Could not open browser: ${err.message}`));
      });
    } else if (platform === 'win32') {
      // Windows
      exec(`start "" "${loginUrl}"`);
    } else {
      // Linux
      exec(`xdg-open "${loginUrl}"`);
    }
  } catch (err) {
    console.log(chalk.yellow(`  Could not open browser automatically.`));
    console.log(chalk.yellow(`  Please open this URL manually:\n`));
    console.log(chalk.cyan(`  ${loginUrl}\n`));
  }

  try {
    const token = await tokenPromise;

    // Save token to config file
    saveConfig({ token, apiUrl: options.apiUrl });

    console.log(chalk.green(`  ✓ Successfully authenticated!\n`));
    console.log(chalk.gray(`  Token saved to: ${CONFIG_FILE}`));
    console.log(chalk.gray(`  \n  You can now use the QualityMax API:\n`));
    console.log(chalk.cyan(`    export QAMAX_API_TOKEN="${token.substring(0, 20)}..."\n`));

    process.exit(0);

  } catch (err) {
    console.error(chalk.red(`\n  ✗ ${err.message}\n`));
    process.exit(1);
  }
}

function logout() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
      console.log('\n  Logged out successfully. Credentials removed.\n');
    } else {
      console.log('\n  No credentials found.\n');
    }
  } catch (err) {
    console.error(`\n  Error: ${err.message}\n`);
    process.exit(1);
  }
}

function printToken() {
  const config = loadConfig();
  if (config && config.token) {
    console.log(config.token);
  } else {
    console.error('Not logged in. Run: qamax-auth login');
    process.exit(1);
  }
}

function checkStatus() {
  const config = loadConfig();
  if (config && config.token) {
    console.log('\n  ✓ Logged in');
    console.log(`  API URL: ${config.apiUrl || 'https://app.qamax.co'}`);
    console.log(`  Config: ${CONFIG_FILE}\n`);
  } else {
    console.log('\n  ✗ Not logged in');
    console.log('  Run: qamax-auth login\n');
  }
}

// Get the base API URL (strip /app suffix if present)
function getApiBaseUrl(config) {
  const url = config.apiUrl || 'https://app.qamax.co/app';
  return url.replace(/\/app\/?$/, '');
}

async function listProjects() {
  const chalk = (await import('chalk')).default;

  const config = loadConfig();
  if (!config || !config.token) {
    console.error(chalk.red('\n  Not logged in. Run: qamax-auth login\n'));
    process.exit(1);
  }

  try {
    const apiUrl = getApiBaseUrl(config);
    const response = await fetch(`${apiUrl}/api/projects`, {
      headers: {
        'Authorization': `Bearer ${config.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const projects = data.projects || data || [];

    console.log(chalk.cyan('\n  Your Projects:\n'));
    console.log(chalk.gray('  ID\t\tName'));
    console.log(chalk.gray('  ──\t\t────'));

    if (projects.length === 0) {
      console.log(chalk.yellow('  No projects found.\n'));
    } else {
      for (const project of projects) {
        console.log(`  ${project.id}\t\t${project.name}`);
      }
      console.log(chalk.gray(`\n  Use --project-id with the ID above.\n`));
    }

  } catch (err) {
    console.error(chalk.red(`\n  Error: ${err.message}\n`));
    process.exit(1);
  }
}

function saveConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  fs.chmodSync(CONFIG_FILE, 0o600); // Secure permissions
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (err) {
    // Ignore
  }
  return null;
}

// Capture auth from a website and upload to QualityMax
async function captureAndUpload(url, options) {
  const chalk = (await import('chalk')).default;
  const readline = require('readline');
  const chromeLauncher = await import('chrome-launcher');
  const CDP = (await import('chrome-remote-interface')).default;

  console.log(chalk.cyan('\n  QualityMax Auth Capture\n'));

  // Check if logged in to QualityMax
  const config = loadConfig();
  if (!config || !config.token) {
    console.error(chalk.red('  Not logged in to QualityMax.'));
    console.error(chalk.red('  Run: qamax-auth login\n'));
    process.exit(1);
  }

  console.log(chalk.gray(`  Target URL: ${url}`));
  console.log(chalk.gray(`  Project ID: ${options.projectId}`));
  console.log(chalk.gray(`  Profile name: ${options.name}\n`));

  let chrome = null;
  let client = null;

  try {
    console.log(chalk.gray(`  Launching Chrome...\n`));

    // Launch Chrome using chrome-launcher (handles all the complexity)
    chrome = await chromeLauncher.launch({
      startingUrl: url,
      chromeFlags: ['--disable-gpu', '--no-first-run']
    });

    console.log(chalk.gray(`  Chrome started on port ${chrome.port}`));

    console.log(chalk.cyan('\n  ┌─────────────────────────────────────────────┐'));
    console.log(chalk.cyan('  │  Chrome opened. Please log in to the site   │'));
    console.log(chalk.cyan('  │                                             │'));
    console.log(chalk.cyan('  │  When done, come back here and press ENTER  │'));
    console.log(chalk.cyan('  └─────────────────────────────────────────────┘\n'));

    // Wait for user to press Enter
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await new Promise(resolve => {
      rl.question(chalk.yellow('  Press ENTER when login is complete... '), () => {
        rl.close();
        resolve();
      });
    });

    console.log(chalk.gray('\n  Capturing cookies via Chrome DevTools Protocol...\n'));

    // Connect to Chrome via CDP
    client = await CDP({ port: chrome.port });
    const { Network } = client;

    // Get all cookies
    const { cookies } = await Network.getAllCookies();

    console.log(chalk.gray(`  Captured ${cookies.length} cookies\n`));

    // Close CDP connection
    await client.close();
    client = null;

    // Kill Chrome
    await chrome.kill();
    chrome = null;

    // Format as storage state
    const storageState = {
      cookies: cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite || 'Lax'
      })),
      origins: []
    };

    // Save locally if requested
    if (options.output) {
      fs.writeFileSync(options.output, JSON.stringify(storageState, null, 2));
      console.log(chalk.gray(`  Saved locally to: ${options.output}`));
    }

    // Upload to QualityMax User Data Variables
    console.log(chalk.gray('  Uploading to QualityMax...\n'));

    const apiUrl = getApiBaseUrl(config);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.token}`,
    };

    // Step 1: Get existing categories to find or create "Authentication"
    const categoriesResponse = await fetch(
      `${apiUrl}/api/projects/${options.projectId}/user-data/all`,
      { headers }
    );

    if (!categoriesResponse.ok) {
      const error = await categoriesResponse.text();
      throw new Error(`Failed to get categories (${categoriesResponse.status}): ${error}`);
    }

    const categoriesData = await categoriesResponse.json();
    let authCategory = categoriesData.categories?.find(c => c.name === 'Authentication');

    // Step 2: Create "Authentication" category if it doesn't exist
    if (!authCategory) {
      console.log(chalk.gray('  Creating "Authentication" category...'));
      const createCategoryResponse = await fetch(
        `${apiUrl}/api/projects/${options.projectId}/user-data/categories`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: 'Authentication',
            description: 'Authentication credentials and session data',
            display_order: 0,
          }),
        }
      );

      if (!createCategoryResponse.ok) {
        const error = await createCategoryResponse.text();
        throw new Error(`Failed to create category (${createCategoryResponse.status}): ${error}`);
      }

      const categoryResult = await createCategoryResponse.json();
      authCategory = categoryResult.category;
    }

    // Step 3: Create the storage_state field (secret)
    const fieldKey = options.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    const createFieldResponse = await fetch(
      `${apiUrl}/api/projects/${options.projectId}/user-data/categories/${authCategory.id}/fields`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: fieldKey,
          value: JSON.stringify(storageState),
          is_secret: true,
          description: `Storage state captured from ${url} on ${new Date().toISOString()}`,
          display_order: 0,
        }),
      }
    );

    if (!createFieldResponse.ok) {
      const error = await createFieldResponse.text();
      throw new Error(`Failed to create field (${createFieldResponse.status}): ${error}`);
    }

    const fieldResult = await createFieldResponse.json();

    console.log(chalk.green('  ✓ Auth data saved successfully!\n'));
    console.log(chalk.gray(`  Category: Authentication`));
    console.log(chalk.gray(`  Variable: {{Authentication.${fieldKey}}}`));
    console.log(chalk.gray(`  Project: ${options.projectId}\n`));
    console.log(chalk.cyan('  Use this variable in your test code to access the storage state.\n'));

    process.exit(0);

  } catch (err) {
    if (client) try { await client.close(); } catch (e) {}
    if (chrome) try { await chrome.kill(); } catch (e) {}
    console.error(chalk.red(`\n  ✗ Error: ${err.message}\n`));
    process.exit(1);
  }
}
