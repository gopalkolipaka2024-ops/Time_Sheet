// End-to-end tests: drive the real app in headless Chromium on an iPhone-sized screen.
// Run with: npm test
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const { start } = require('../scripts/serve.js');

// Wednesday, Oct 28 2026 at noon in New York: the current period is Oct 16 – 31.
const NOW = new Date('2026-10-28T16:00:00Z');

let server;
let browser;

before(async () => {
  server = await start(0);
  browser = await chromium.launch();
});

after(async () => {
  await browser.close();
  await server.close();
});

async function openApp({ onboard = true, viewport } = {}) {
  const ctx = await browser.newContext({
    ...devices['iPhone 13'],
    ...(viewport ? { viewport } : {}),
    timezoneId: 'America/New_York',
    locale: 'en-US'
  });
  await ctx.clock.setFixedTime(NOW);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    // Fonts may be unreachable on offline CI runners; that's not an app error.
    if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errors.push(m.text());
  });
  page.on('dialog', d => d.accept());
  await page.goto(server.url);
  if (onboard) {
    await page.waitForSelector('#welcomeOverlay.show');
    await page.fill('#wName', 'Test Worker');
    await page.fill('#wRate', '20');
    await page.click('#wStart');
    await page.waitForSelector('#welcomeOverlay:not(.show)');
  }
  return { ctx, page, errors };
}

async function close(app) {
  assert.deepEqual(app.errors, [], 'no errors in the browser console');
  await app.ctx.close();
}

// Log a shift on the nth day card using the keypad flow: HH MM, AM/PM, HH MM, AM/PM.
async function logShift(page, index, { start = '0800', sap = 'AM', end = '0430', eap = 'PM', brk } = {}) {
  const card = page.locator('.card').nth(index);
  if (!(await card.evaluate(el => el.classList.contains('open')))) await card.locator('.card-head').click();
  await card.locator('[data-act=status][data-v=worked]').click();
  await card.locator('[data-f=sh]').click();
  await page.keyboard.type(start, { delay: 25 });
  await card.locator(`[data-act=ampm][data-w=s][data-v=${sap}]`).click();
  await card.locator('[data-f=eh]').click();
  await page.keyboard.type(end, { delay: 25 });
  await card.locator(`[data-act=ampm][data-w=e][data-v=${eap}]`).click();
  if (brk) await card.locator(`[data-act=brk][data-v="${brk}"]`).click();
  return card;
}

async function addReimbursement(page, { newType, emoji, pick, amount, date, note }) {
  await page.click('#addReimbBtn');
  await page.waitForSelector('#reimbOverlay.show');
  if (newType) {
    await page.click('#rCatGrid [data-newcat]');
    await page.fill('#rNewEmoji', emoji);
    await page.fill('#rNewName', newType);
    await page.click('#rNewAdd');
  } else if (pick) {
    await page.click(`#rCatGrid .cat-chip:has-text("${pick}")`);
  }
  await page.fill('#rAmount', amount);
  if (date) await page.selectOption('#rDate', date);
  if (note) await page.fill('#rDesc', note);
  await page.click('#rSave');
  await page.waitForSelector('#reimbOverlay:not(.show)');
}

const text = (page, sel) => page.locator(sel).first().innerText();

test('first run: welcome sheet saves the profile and shows the half-monthly period', async () => {
  const app = await openApp();
  const { page } = app;
  assert.equal(await text(page, '#whoLabel'), 'Test Worker');
  assert.equal(await text(page, '#periodMain'), 'Oct 16 – 31, 2026');
  assert.equal(await page.locator('#strip .dot').count(), 16);
  assert.equal(await page.inputValue('#rateInput'), '20');
  await close(app);
});

test('logs a shift with AM/PM and an unpaid break', async () => {
  const app = await openApp();
  const { page } = app;
  const card = await logShift(page, 0, { brk: '30' }); // Oct 16, 8:00 AM – 4:30 PM, 30m break
  assert.equal((await card.locator('.hval').innerText()).replace(/\s/g, ''), '8.00hrs');
  assert.match(await card.locator('.calc').innerText(), /8h 30m − 30m break = 8h 00m/);
  assert.equal(await text(page, '#totHours'), '8.00');
  assert.equal(await text(page, '#totAmount'), '$160.00');
  await close(app);
});

test('day off is marked and counted', async () => {
  const app = await openApp();
  const { page } = app;
  const card = page.locator('.card').nth(1);
  await card.locator('.card-head').click();
  await card.locator('[data-act=status][data-v=off]').click();
  assert.match(await card.locator('.dname').innerText(), /Day off/);
  assert.equal(await text(page, '#stOff'), '1');
  await close(app);
});

test('reimbursements: custom type, edit, delete and undo', async () => {
  const app = await openApp();
  const { page } = app;
  await addReimbursement(page, { newType: 'Train', emoji: '🚆', amount: '12.5', date: '2026-10-17', note: 'Metro' });
  const item = page.locator('#reimbList .ritem');
  assert.equal(await item.count(), 1);
  assert.match(await item.innerText(), /Train/);
  assert.match(await item.innerText(), /\$12\.50/);
  assert.equal(await text(page, '#stReimb'), '$12.50');
  assert.equal(await text(page, '#totAmount'), '$12.50');

  // Edit the amount
  await item.click();
  await page.fill('#rAmount', '15');
  await page.click('#rSave');
  assert.match(await page.locator('#reimbList .ritem').innerText(), /\$15\.00/);

  // The new type is available in Settings
  await page.click('#settingsBtn');
  const names = await page.locator('#catList [data-cf=name]').evaluateAll(els => els.map(e => e.value));
  assert.ok(names.includes('Train'));
  assert.ok(names.includes('Cab'));
  await page.click('#settingsOverlay [data-close]');

  // Delete, then undo
  await page.locator('#reimbList .ritem').click();
  await page.click('#rDelete');
  assert.equal(await page.locator('#reimbList .ritem').count(), 0);
  await page.click('#toastUndo');
  assert.equal(await page.locator('#reimbList .ritem').count(), 1);
  await close(app);
});

test('reimbursement types can be removed in Settings', async () => {
  const app = await openApp();
  const { page } = app;
  await page.click('#settingsBtn');
  const before = await page.locator('#catList .cat-row').count();
  await page.locator('#catList .cat-row').filter({ has: page.locator('input[value="Cab"]') }).locator('[data-cdel]').click();
  assert.equal(await page.locator('#catList .cat-row').count(), before - 1);
  await page.click('#settingsOverlay [data-close]');
  await page.click('#addReimbBtn');
  const chips = await page.locator('#rCatGrid [data-cat]').allInnerTexts();
  assert.ok(!chips.some(c => c.includes('Cab')), 'Cab no longer offered');
  await close(app);
});

test('data persists after closing and reopening', async () => {
  const app = await openApp();
  const { page } = app;
  await logShift(page, 0);
  await addReimbursement(page, { pick: 'Cab', amount: '18', date: '2026-10-16', note: 'Airport' });
  await page.waitForTimeout(600); // debounced save
  await page.reload();
  await page.waitForSelector('#days .card');
  assert.equal(await page.locator('#welcomeOverlay.show').count(), 0, 'welcome is not shown again');
  assert.equal(await text(page, '#totHours'), '8.50');
  assert.equal(await text(page, '#totAmount'), '$188.00');
  assert.match(await page.locator('#reimbList').innerText(), /Cab/);
  await close(app);
});

test('message report has name, period, days, reimbursements and grand total', async () => {
  const app = await openApp();
  const { page } = app;
  await logShift(page, 0, { brk: '30' });
  await addReimbursement(page, { pick: 'Cab', amount: '18', date: '2026-10-16' });
  await page.click('#sendBtn');
  await page.waitForSelector('#shareOverlay.show');
  const report = await page.locator('#sharePreview').textContent();
  for (const expected of ['Name: Test Worker', 'Period: Oct 16 – 31, 2026', 'Fri, Oct 16',
    '8:00 AM – 4:30 PM (30m break) | 8.00 hrs | $160.00', '🚕 Cab | $18.00', '💵 GRAND TOTAL: $178.00']) {
    assert.ok(report.includes(expected), `report includes "${expected}"\n---\n${report}`);
  }
  await close(app);
});

test('page image is generated for sharing', async () => {
  const app = await openApp();
  const { page } = app;
  await logShift(page, 0);
  await page.click('#sendBtn');
  await page.click('#shareMode [data-mode=page]');
  const img = page.locator('#pagePreview img');
  await img.waitFor({ timeout: 10000 });
  const width = await img.evaluate(el => el.decode().then(() => el.naturalWidth));
  assert.ok(width >= 390, `image width ${width}`);
  await close(app);
});

test('pay period types: weekly, bi-weekly and monthly', async () => {
  const app = await openApp();
  const { page } = app;
  await page.click('#settingsBtn');
  await page.selectOption('#setPeriod', 'week');
  assert.equal(await text(page, '#periodMain'), 'Oct 26 – Nov 1, 2026');
  assert.equal(await page.locator('#strip .dot').count(), 7);
  await page.selectOption('#setPeriod', 'biweek');
  assert.equal(await page.locator('#strip .dot').count(), 14);
  await page.selectOption('#setPeriod', 'month');
  assert.equal(await text(page, '#periodMain'), 'Oct 1 – 31, 2026');
  assert.equal(await page.locator('#strip .dot').count(), 31);
  await page.selectOption('#setPeriod', 'half');
  assert.equal(await text(page, '#periodMain'), 'Oct 16 – 31, 2026');
  await close(app);
});

test('currency can be changed', async () => {
  const app = await openApp();
  const { page } = app;
  await logShift(page, 0);
  await page.click('#settingsBtn');
  await page.selectOption('#setCurrency', 'EUR');
  await page.click('#settingsOverlay [data-close]');
  assert.match(await text(page, '#totAmount'), /€/);
  await close(app);
});

test('imports a backup from the previous version', async () => {
  const app = await openApp();
  const { page } = app;
  const v1 = {
    app: 'timesheet', version: 1,
    settings: { name: 'Old User', rate: '25', periodRates: { '2026-10-2': '25' } },
    days: [{ date: '2026-10-20', status: 'worked', sh: '09', sm: '00', eh: '17', em: '00', site: 'Yard', notes: '',
      reimb: [{ id: 'a1', type: 'Cab', amount: '10', desc: 'ride' }] }]
  };
  await page.click('#settingsBtn');
  await page.setInputFiles('#importFile', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(v1)) });
  await page.waitForFunction(() => document.querySelector('#whoLabel').textContent === 'Old User');
  await page.click('#settingsOverlay [data-close]');
  assert.equal(await text(page, '#totHours'), '8.00');
  assert.equal(await text(page, '#totAmount'), '$210.00');
  assert.match(await page.locator('#reimbList').innerText(), /🚕\s*Cab/);
  await close(app);
});

test('view-only link opens like the app, cannot be edited and leaves the viewer’s data alone', async () => {
  // Sender
  const sender = await openApp();
  await logShift(sender.page, 0, { brk: '30' });
  await addReimbursement(sender.page, { newType: 'Train', emoji: '🚆', amount: '9.5', date: '2026-10-16', note: 'Metro' });
  await sender.page.click('#sendBtn');
  await sender.page.click('#shareMode [data-mode=link]');
  await sender.page.waitForFunction(() => document.querySelector('#linkOpen').getAttribute('href').includes('#v='));
  const link = await sender.page.getAttribute('#linkOpen', 'href');
  assert.ok(link.startsWith(server.url), link);
  await close(sender);

  // Viewer: has their own timesheet on this phone
  const viewer = await openApp();
  const { page } = viewer;
  await page.fill('#rateInput', '30');
  await page.waitForTimeout(500);

  const view = await viewer.ctx.newPage();
  view.on('pageerror', e => viewer.errors.push(e.message));
  await view.goto(link);
  await view.waitForSelector('body.readonly #days .card');
  assert.equal(await view.locator('#whoLabel').innerText(), 'Test Worker');
  assert.equal(await view.locator('#periodMain').innerText(), 'Oct 16 – 31, 2026');
  assert.equal(await view.locator('#totHours').innerText(), '8.00');
  assert.equal(await view.inputValue('#rateInput'), '20.00');
  assert.equal(await view.locator('#totAmount').innerText(), '$169.50');
  assert.match(await view.locator('#roBanner').innerText(), /View-only timesheet from Test Worker/);
  assert.match(await view.locator('#reimbList').innerText(), /🚆\s*Train/);
  assert.equal(await view.locator('#welcomeOverlay.show').count(), 0);
  for (const sel of ['#settingsBtn', '#sendBtn', '#addReimbBtn', '#prevBtn']) {
    assert.equal(await view.locator(sel).isVisible(), false, `${sel} hidden`);
  }
  // Tap a day: details are shown, with no editing controls
  await view.locator('.card').nth(0).locator('.card-head').click();
  const body = view.locator('.card').nth(0).locator('.card-body');
  assert.match(await body.innerText(), /8:00 AM – 4:30 PM/);
  assert.match(await body.innerText(), /Metro/);
  assert.equal(await body.locator('input, textarea, select, button').count(), 0);

  // The viewer's own data is untouched
  await view.goto(server.url);
  await view.waitForSelector('#days .card');
  assert.equal(await view.inputValue('#rateInput'), '30');
  assert.equal(await view.locator('#totHours').innerText(), '0.00');
  await close(viewer);
});

test('a damaged view link shows a friendly message', async () => {
  const app = await openApp({ onboard: false });
  const page = await app.ctx.newPage();
  await page.goto(server.url + '#v=zNotARealLink');
  await page.waitForSelector('text=This timesheet link is incomplete or damaged');
  await app.ctx.close();
});

test('fits a 320px-wide phone without sideways scrolling', async () => {
  const app = await openApp({ viewport: { width: 320, height: 568 } });
  const { page } = app;
  await logShift(page, 0, { brk: '45' });
  await page.locator('.card').nth(0).locator('[data-act=add-reimb]').click();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(width <= 320, `page is ${width}px wide`);
  await close(app);
});
