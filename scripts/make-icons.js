#!/usr/bin/env node
// Renders the app icons (PNG) into icons/ using headless Chromium.
// Usage: npm run icons
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.resolve(__dirname, '..', 'icons');
const ICONS = [
  { file: 'apple-touch-icon.png', size: 180, safe: 1 },
  { file: 'icon-192.png', size: 192, safe: 1 },
  { file: 'icon-512.png', size: 512, safe: 1 },
  // Maskable icons get cropped by Android; keep the clock inside the central safe zone.
  { file: 'icon-maskable-512.png', size: 512, safe: 0.72 }
];

function draw({ size, safe }) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#3B82F6');
  grad.addColorStop(1, '#1D4ED8');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const k = (size / 180) * safe;
  const cx = size / 2, cy = size / 2;
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 12 * k;
  g.beginPath(); g.arc(cx, cy, 54 * k, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 11 * k;
  g.beginPath(); g.moveTo(cx, cy - 30 * k); g.lineTo(cx, cy + 2 * k); g.lineTo(cx + 22 * k, cy + 14 * k); g.stroke();
  return c.toDataURL('image/png');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const icon of ICONS) {
    const dataUrl = await page.evaluate(draw, { size: icon.size, safe: icon.safe });
    fs.writeFileSync(path.join(OUT, icon.file), Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(`icons/${icon.file} (${icon.size}px)`);
  }
  await browser.close();
})().catch(err => { console.error(err); process.exit(1); });
