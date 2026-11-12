// Export the subtitle timeline the page burns in (window.SUBS) → subs.json. Run with LIB set: node subs.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { openDemo, closeServer } = await import(path.join(process.env.LIB, 'core/render/page.mjs'));
const { browser, page } = await openDemo(HERE);
const subs = await page.evaluate(() => window.SUBS.map(s => ({ t0: +s.t0.toFixed(3), t1: +s.t1.toFixed(3), text: s.text })));
fs.writeFileSync(path.join(HERE, 'subs.json'), JSON.stringify(subs, null, 1));
console.log('subs', subs.length);
await browser.close(); closeServer();
