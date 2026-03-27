/**
 * Capture HTP page as a full-page screenshot for trailer.
 * Scrolls through to trigger all GSAP animations, then captures the full page.
 *
 * Usage: npx tsx scripts/capture-htp-scroll.ts
 * Output: public/htp-fullpage.png
 */
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

const HTP_URL = 'https://undercover-mob-boss.vercel.app/how-to-play.html';
const OUTPUT_FILE = resolve('public/htp-fullpage.png');
const VIEWPORT = { width: 1920, height: 1080 };

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });

  console.log(`Navigating to ${HTP_URL}...`);
  await page.goto(HTP_URL, { waitUntil: 'networkidle' });

  // Wait for hero GSAP timeline to complete
  console.log('Waiting for hero animations...');
  await page.waitForTimeout(4000);

  // Scroll through the entire page in increments to trigger all ScrollTrigger animations
  console.log('Scrolling through page to trigger GSAP animations...');
  const scrollHeight = Number(await page.evaluate('document.documentElement.scrollHeight'));
  const step = 200; // pixels per scroll increment
  let scrolled = 0;

  while (scrolled < scrollHeight) {
    await page.evaluate(`window.scrollTo(0, ${scrolled})`);
    await page.waitForTimeout(80); // Give GSAP time to trigger
    scrolled += step;
  }

  // Scroll to very bottom to ensure everything triggered
  await page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
  await page.waitForTimeout(500);

  // Now scroll back to top for the full-page capture
  await page.evaluate('window.scrollTo(0, 0)');
  await page.waitForTimeout(300);

  // Capture full page screenshot
  console.log('Capturing full-page screenshot...');
  await page.screenshot({
    path: OUTPUT_FILE,
    fullPage: true,
    type: 'png',
  });

  const stats = await import('node:fs/promises').then(fs => fs.stat(OUTPUT_FILE));
  console.log(`Screenshot saved: ${OUTPUT_FILE} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);

  // Get page dimensions for reference
  const height = Number(await page.evaluate('document.documentElement.scrollHeight'));
  console.log(`Page height: ${height}px (viewport: ${VIEWPORT.width}x${VIEWPORT.height})`);
  console.log(`Scroll distance in Remotion: ${height - VIEWPORT.height}px`);

  await browser.close();
  console.log('Done!');
}

main().catch(function(err) {
  console.error(err);
  process.exit(1);
});
