#!/usr/bin/env node
// Static checks for the app: syntax, element ids, versions, offline file list and size budget.
// Usage: npm run check
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const errors = [];
const fail = msg => errors.push(msg);
const ok = msg => console.log(`  ✓ ${msg}`);

const html = read('index.html');
const sw = read('sw.js');
const pkg = JSON.parse(read('package.json'));

// 1. Inline script parses.
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (scripts.length !== 1) fail(`expected exactly one inline <script>, found ${scripts.length}`);
scripts.forEach((code, i) => {
  try { new vm.Script(code, { filename: `index.html#script${i}` }); ok('inline script parses'); }
  catch (e) { fail(`inline script syntax error: ${e.message}`); }
});
try { new vm.Script(sw, { filename: 'sw.js' }); ok('sw.js parses'); }
catch (e) { fail(`sw.js syntax error: ${e.message}`); }

// 2. Single-file promise: no external scripts, only Google Fonts as an external stylesheet.
if (/<script[^>]+src=/i.test(html)) fail('index.html must not load external scripts');
else ok('no external scripts');
const sheets = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(m => m[0]);
if (sheets.some(l => !l.includes('https://fonts.googleapis.com/'))) fail('only Google Fonts stylesheets are allowed');
else ok('stylesheets limited to Google Fonts');

// 3. Every #id the script looks up exists in the markup.
const ids = new Set([...html.matchAll(/\sid="([\w-]+)"/g)].map(m => m[1]));
const used = new Set([...scripts.join('\n').matchAll(/\$\('#([\w-]+)['\s)]/g)].map(m => m[1]));
const missing = [...used].filter(id => !ids.has(id));
if (missing.length) fail(`script references missing element ids: ${missing.join(', ')}`);
else ok(`${used.size} element ids referenced, all present`);
const dupes = [...html.matchAll(/\sid="([\w-]+)"/g)].map(m => m[1]).filter((id, i, a) => a.indexOf(id) !== i);
if (dupes.length) fail(`duplicate ids: ${[...new Set(dupes)].join(', ')}`);
else ok('no duplicate ids');

// 4. One version everywhere.
const appVersion = (html.match(/const APP_VERSION = '([^']+)'/) || [])[1];
const swVersion = (sw.match(/const VERSION = '([^']+)'/) || [])[1];
if (!appVersion || appVersion !== pkg.version || swVersion !== pkg.version) {
  fail(`version mismatch: package.json ${pkg.version}, index.html ${appVersion}, sw.js ${swVersion}`);
} else ok(`version ${pkg.version} matches in package.json, index.html and sw.js`);
const changelog = read('CHANGELOG.md');
if (!changelog.includes(`## ${pkg.version}`)) fail(`CHANGELOG.md has no "## ${pkg.version}" entry`);
else ok('CHANGELOG.md has an entry for this version');

// 5. Offline files and manifest icons exist.
const core = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
const manifest = JSON.parse(read('manifest.webmanifest'));
const files = new Set([...core, ...manifest.icons.map(i => i.src)]);
const absent = [...files].filter(f => !fs.existsSync(path.join(ROOT, f)));
if (absent.length) fail(`missing files: ${absent.join(', ')}`);
else ok(`${files.size} offline/manifest files present`);

// 6. Size budget keeps the single file fast on mobile data.
const kb = Buffer.byteLength(html) / 1024;
if (kb > 250) fail(`index.html is ${kb.toFixed(0)} KB (budget 250 KB)`);
else ok(`index.html is ${kb.toFixed(0)} KB (budget 250 KB)`);

if (errors.length) {
  console.error(`\n✗ ${errors.length} check(s) failed:`);
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}
console.log('\nAll checks passed.');
