/**
 * CLI Test Runner for Node.js.
 * Executes the exact same test files and models as the browser runner.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Ensure Web Crypto API and TextEncoder/Decoder are globally available
if (!global.crypto && typeof require !== 'undefined') {
  try {
    global.crypto = require('crypto').webcrypto;
  } catch (e) {
    // Already modern node with globalThis.crypto
  }
}

// 1. Load Browser Mock
require('./mocks/browser-mock.js');

// 2. Load Test Framework
require('./framework.js');

// Helper to load and evaluate model script in global context
function loadScript(relPath) {
  const fullPath = path.resolve(__dirname, relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  vm.runInThisContext(code, { filename: fullPath });
}

// 3. Load Extension Models
loadScript('../Extension/Models/account.js');
loadScript('../Extension/Models/totp.js');
loadScript('../Extension/Models/hotp.js');
loadScript('../Extension/Models/converter.js');
loadScript('../Extension/Models/encryption.js');
loadScript('../Extension/Models/settingsModel.js');

// 4. Load Test Suites
loadScript('./totp.test.js');
loadScript('./hotp.test.js');
loadScript('./converter.test.js');
loadScript('./encryption.test.js');
loadScript('./account.test.js');
loadScript('./settings.test.js');

// ANSI Color Helpers for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
};

async function main() {
  console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}   TOTP Authenticator Extension Tests   ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}\n`);

  function logSuite(suite, depth = 0) {
    const indent = '  '.repeat(depth);
    if (depth === 0) {
      console.log(`\n${colors.bold}📦 Suite: ${suite.name}${colors.reset}`);
    } else {
      console.log(`${indent}${colors.dim}↳ ${suite.name}${colors.reset}`);
    }

    suite.tests.forEach(test => {
      const isPass = test.status === 'passed';
      const symbol = isPass ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
      const durationStr = `${colors.dim}(${test.duration.toFixed(1)}ms)${colors.reset}`;
      console.log(`${indent}  ${symbol} ${test.name} ${durationStr}`);

      if (test.error) {
        console.log(`${indent}    ${colors.red}${test.error.stack || test.error.message}${colors.reset}`);
      }
    });

    suite.suites.forEach(child => logSuite(child, depth + 1));
  }

  const results = await globalThis.testRunner.run();

  results.suites.forEach(suite => logSuite(suite));

  console.log(`\n${colors.bold}----------------------------------------${colors.reset}`);
  console.log(`${colors.bold}Summary:${colors.reset}`);
  console.log(`  Total:     ${results.total}`);
  console.log(`  Passed:    ${colors.green}${results.passed}${colors.reset}`);
  console.log(`  Failed:    ${results.failed > 0 ? colors.red : colors.dim}${results.failed}${colors.reset}`);
  console.log(`  Duration:  ${results.duration.toFixed(1)}ms`);
  console.log(`${colors.bold}----------------------------------------${colors.reset}\n`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});