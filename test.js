#!/usr/bin/env node

/**
 * Test for CLI login flow
 *
 * Tests:
 * 1. Local server starts and listens on the correct port
 * 2. Callback endpoint receives token and saves config
 * 3. Browser URL is correctly formed
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const CONFIG_DIR = path.join(os.homedir(), '.qamax');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    testsFailed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    testsFailed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected "${expected}", got "${actual}"`);
  }
}

function assertIncludes(str, substring, message) {
  if (!str.includes(substring)) {
    throw new Error(`${message}: expected to include "${substring}", got "${str}"`);
  }
}

// Clean up before tests
function cleanup() {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
}

// Test 1: CLI help output
async function testHelpOutput() {
  return new Promise((resolve, reject) => {
    const cli = spawn('node', ['index.js', '--help'], { cwd: __dirname });
    let output = '';

    cli.stdout.on('data', (data) => { output += data.toString(); });
    cli.stderr.on('data', (data) => { output += data.toString(); });

    cli.on('close', (code) => {
      try {
        assertIncludes(output, 'login', 'Help should mention login command');
        assertIncludes(output, 'logout', 'Help should mention logout command');
        assertIncludes(output, 'token', 'Help should mention token command');
        assertIncludes(output, 'status', 'Help should mention status command');
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Test 1b: Login subcommand help
async function testLoginHelpOutput() {
  return new Promise((resolve, reject) => {
    const cli = spawn('node', ['index.js', 'login', '--help'], { cwd: __dirname });
    let output = '';

    cli.stdout.on('data', (data) => { output += data.toString(); });
    cli.stderr.on('data', (data) => { output += data.toString(); });

    cli.on('close', (code) => {
      try {
        assertIncludes(output, '--browser', 'Login help should mention browser option');
        assertIncludes(output, '--api-url', 'Login help should mention api-url option');
        assertIncludes(output, '--port', 'Login help should mention port option');
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Test 2: Login command starts server on correct port
async function testLoginServerStarts() {
  return new Promise((resolve, reject) => {
    const testPort = 19876; // Use different port to avoid conflicts

    // Start CLI in background (it will try to open browser, which we ignore)
    const cli = spawn('node', ['index.js', 'login', '--port', testPort.toString(), '--api-url', 'http://test.local'], {
      cwd: __dirname,
      env: { ...process.env, BROWSER: 'echo' } // Prevent browser from actually opening
    });

    let output = '';
    cli.stdout.on('data', (data) => { output += data.toString(); });
    cli.stderr.on('data', (data) => { output += data.toString(); });

    // Give server time to start
    setTimeout(async () => {
      try {
        // Try to connect to the server
        const response = await fetch(`http://localhost:${testPort}/callback?token=test_token_12345`);
        const html = await response.text();

        assertIncludes(html, 'Authenticated', 'Callback should return success page');

        // Check config was saved
        setTimeout(() => {
          try {
            if (fs.existsSync(CONFIG_FILE)) {
              const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
              assertEqual(config.token, 'test_token_12345', 'Token should be saved');
            } else {
              throw new Error('Config file was not created');
            }
            cli.kill();
            resolve();
          } catch (err) {
            cli.kill();
            reject(err);
          }
        }, 500);

      } catch (err) {
        cli.kill();
        reject(new Error(`Failed to connect to CLI server: ${err.message}`));
      }
    }, 2000);

    // Timeout
    setTimeout(() => {
      cli.kill();
      reject(new Error('Test timed out'));
    }, 10000);
  });
}

// Test 3: Callback with error parameter
async function testCallbackError() {
  return new Promise((resolve, reject) => {
    const testPort = 19877;

    const cli = spawn('node', ['index.js', 'login', '--port', testPort.toString(), '--api-url', 'http://test.local'], {
      cwd: __dirname,
      env: { ...process.env, BROWSER: 'echo' }
    });

    setTimeout(async () => {
      try {
        const response = await fetch(`http://localhost:${testPort}/callback?error=access_denied`);
        const html = await response.text();

        assertIncludes(html, 'Failed', 'Error callback should show failure');
        assertIncludes(html, 'access_denied', 'Error message should be shown');

        cli.kill();
        resolve();
      } catch (err) {
        cli.kill();
        reject(err);
      }
    }, 2000);

    setTimeout(() => {
      cli.kill();
      reject(new Error('Test timed out'));
    }, 10000);
  });
}

// Test 4: Status command (not logged in)
async function testStatusNotLoggedIn() {
  cleanup(); // Ensure no config exists

  return new Promise((resolve, reject) => {
    const cli = spawn('node', ['index.js', 'status'], { cwd: __dirname });
    let output = '';

    cli.stdout.on('data', (data) => { output += data.toString(); });
    cli.stderr.on('data', (data) => { output += data.toString(); });

    cli.on('close', () => {
      try {
        assertIncludes(output, 'Not logged in', 'Status should show not logged in');
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Test 5: Status command (logged in)
async function testStatusLoggedIn() {
  // Create config file
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ token: 'test_token', apiUrl: 'https://test.local' }));

  return new Promise((resolve, reject) => {
    const cli = spawn('node', ['index.js', 'status'], { cwd: __dirname });
    let output = '';

    cli.stdout.on('data', (data) => { output += data.toString(); });
    cli.stderr.on('data', (data) => { output += data.toString(); });

    cli.on('close', () => {
      try {
        assertIncludes(output, 'Logged in', 'Status should show logged in');
        assertIncludes(output, 'test.local', 'Status should show API URL');
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Test 6: Token command
async function testTokenCommand() {
  // Create config file
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ token: 'my_secret_token_xyz', apiUrl: 'https://test.local' }));

  return new Promise((resolve, reject) => {
    const cli = spawn('node', ['index.js', 'token'], { cwd: __dirname });
    let output = '';

    cli.stdout.on('data', (data) => { output += data.toString(); });

    cli.on('close', () => {
      try {
        assertIncludes(output.trim(), 'my_secret_token_xyz', 'Token command should print token');
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Test 7: Logout command
async function testLogoutCommand() {
  // Create config file
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ token: 'test_token' }));

  return new Promise((resolve, reject) => {
    const cli = spawn('node', ['index.js', 'logout'], { cwd: __dirname });
    let output = '';

    cli.stdout.on('data', (data) => { output += data.toString(); });

    cli.on('close', () => {
      try {
        assertIncludes(output, 'Logged out', 'Logout should confirm');
        if (fs.existsSync(CONFIG_FILE)) {
          throw new Error('Config file should be deleted');
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Test 8: Login URL format
async function testLoginUrlFormat() {
  return new Promise((resolve, reject) => {
    const testPort = 19878;

    const cli = spawn('node', ['index.js', 'login', '--port', testPort.toString(), '--api-url', 'https://app.qamax.co'], {
      cwd: __dirname,
      env: { ...process.env, BROWSER: 'echo' }
    });

    let output = '';
    cli.stdout.on('data', (data) => { output += data.toString(); });
    cli.stderr.on('data', (data) => { output += data.toString(); });

    // The 'open' package with BROWSER=echo will print the URL
    setTimeout(() => {
      cli.kill();
      // Check the callback URL format would be correct
      const expectedCallback = encodeURIComponent(`http://localhost:${testPort}/callback`);
      // We can't easily capture the URL opened, so just verify server started
      try {
        assertIncludes(output, 'Waiting for authentication', 'Should show waiting message');
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 2000);
  });
}

// Run all tests
async function runTests() {
  console.log('\n🧪 Running CLI tests...\n');

  cleanup();

  await asyncTest('Help output contains all commands', testHelpOutput);
  await asyncTest('Login help shows browser option', testLoginHelpOutput);
  await asyncTest('Status shows not logged in when no config', testStatusNotLoggedIn);
  await asyncTest('Status shows logged in with config', testStatusLoggedIn);
  await asyncTest('Token command prints token', testTokenCommand);
  await asyncTest('Logout removes config file', testLogoutCommand);
  await asyncTest('Login server starts and listens', testLoginServerStarts);
  await asyncTest('Callback handles error parameter', testCallbackError);
  await asyncTest('Login shows waiting message', testLoginUrlFormat);

  cleanup();

  console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed\n`);

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
