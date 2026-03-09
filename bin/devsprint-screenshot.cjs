#!/usr/bin/env node

/**
 * devsprint-screenshot — Take a browser screenshot for UI verification
 *
 * Usage:
 *   node devsprint-screenshot.cjs --url <url> --output <path> [--width 1280] [--height 900] [--wait 2000] [--full-page]
 *
 * Requires puppeteer. Auto-installs if not found.
 * Uses Node.js built-ins only for orchestration; puppeteer for browser control.
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ─── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}
const hasFlag = (name) => args.includes(name);

const url = getArg('--url', null);
const output = getArg('--output', null);
const width = parseInt(getArg('--width', '1280'), 10);
const height = parseInt(getArg('--height', '900'), 10);
const waitMs = parseInt(getArg('--wait', '2000'), 10);
const fullPage = hasFlag('--full-page');

if (!url || !output) {
  console.error('Usage: node devsprint-screenshot.cjs --url <url> --output <path> [--width 1280] [--height 900] [--wait 2000] [--full-page]');
  process.exit(1);
}

// ─── Ensure puppeteer is installed ───────────────────────────────────────────

function ensurePuppeteer() {
  try {
    require.resolve('puppeteer');
    return require('puppeteer');
  } catch {
    console.error('puppeteer not found — installing...');
    try {
      execSync('npm install -g puppeteer', { stdio: 'pipe', timeout: 120000 });
      // Try global require path
      const globalPath = execSync('npm root -g', { encoding: 'utf-8', timeout: 5000 }).trim();
      return require(path.join(globalPath, 'puppeteer'));
    } catch (installErr) {
      // Try local install as fallback
      try {
        const tmpDir = path.join(require('os').tmpdir(), 'devsprint-puppeteer');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        if (!fs.existsSync(path.join(tmpDir, 'node_modules', 'puppeteer'))) {
          execSync('npm init -y && npm install puppeteer', { cwd: tmpDir, stdio: 'pipe', timeout: 120000 });
        }
        return require(path.join(tmpDir, 'node_modules', 'puppeteer'));
      } catch (localErr) {
        console.error('Failed to install puppeteer:', localErr.message);
        process.exit(1);
      }
    }
  }
}

// ─── Take Screenshot ─────────────────────────────────────────────────────────

async function takeScreenshot() {
  const puppeteer = ensurePuppeteer();

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for content to render
    if (waitMs > 0) {
      await new Promise(r => setTimeout(r, waitMs));
    }

    // Ensure output directory exists
    const dir = path.dirname(output);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await page.screenshot({
      path: output,
      fullPage,
      type: 'png',
    });

    console.log(JSON.stringify({
      status: 'ok',
      output: path.resolve(output),
      url,
      viewport: { width, height },
    }));
  } finally {
    await browser.close();
  }
}

takeScreenshot().catch((err) => {
  console.error(JSON.stringify({ status: 'error', message: err.message }));
  process.exit(1);
});
