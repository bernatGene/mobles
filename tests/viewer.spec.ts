import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

test('solid viewer loads, inspects, moves, rebuilds and exports', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#visible-count')).toHaveText('30 / 30 visible');
  await page.screenshot({ path: testInfo.outputPath('assembled.png') });
  const hardwareOn = await page.locator('canvas').screenshot();
  await page.locator('#hardware').uncheck();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const hardwareOff = await page.locator('canvas').screenshot();
  expect(hardwareOn.equals(hardwareOff)).toBe(false);
  await page.locator('#hardware').check();
  await page.locator('#joinery').check();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const joineryOn = await page.locator('canvas').screenshot({ path: testInfo.outputPath('joinery.png') });
  expect(joineryOn.equals(hardwareOn)).toBe(false);
  await page.locator('#joinery').uncheck();
  await page.locator('[data-part="door-left"]').click();
  await expect(page.locator('#inspect')).toContainText('510 mm');

  await page.locator('[data-part="center"]').click();
  await expect(page.locator('#inspect h2')).toHaveText('Center panel');
  await expect(page.locator('#inspect')).toContainText('Threaded insert · Ø8.5 × 18 mm');
  await page.locator('#inspect-part').click();
  await expect(page.locator('#visible-count')).toHaveText('1 / 30 visible');
  await page.locator('[data-view="side"]').click();
  await page.screenshot({ path: testInfo.outputPath('center-panel.png') });

  await page.locator('[data-mode="exploded"]').click();
  await expect(page.locator('#visible-count')).toHaveText('30 / 30 visible');
  await page.screenshot({ path: testInfo.outputPath('exploded.png') });
  await page.locator('[data-mode="assembled"]').click();
  await page.locator('[data-view="iso"]').click();
  await page.locator('#doors').fill('95');
  await page.locator('#drawer-left-upper').fill('0.7');
  await expect(page.locator('#drawer-left-upper-value')).toHaveText('70%');
  for (const id of ['drawer-right-upper', 'drawer-left-lower', 'drawer-right-lower']) {
    await expect(page.locator(`#${id}-value`)).toHaveText('0%');
  }
  await page.locator('#drawer-right-upper').fill('0.3');
  await page.locator('#drawer-left-lower').fill('0.5');
  await page.locator('#drawer-right-lower').fill('0.9');
  await expect(page.locator('#drawer-left-upper-value')).toHaveText('70%');
  await expect(page.locator('#drawer-right-upper-value')).toHaveText('30%');
  await expect(page.locator('#drawer-left-lower-value')).toHaveText('50%');
  await expect(page.locator('#drawer-right-lower-value')).toHaveText('90%');
  await expect(page.locator('#doors-value')).toHaveText('95°');
  await page.screenshot({ path: testInfo.outputPath('open.png') });

  await page.locator('[data-category="fronts"]').uncheck();
  await expect(page.locator('#visible-count')).toHaveText('26 / 30 visible');
  await page.locator('#show-all').click();
  await page.locator('[data-tab="parameters"]').click();
  await page.locator('[name="L"]').fill('1200');
  await page.getByRole('button', { name: 'Apply dimensions' }).click();
  await expect(page.locator('#size-caption')).toHaveText('1,200 × 300 × 950 mm');
  await expect(page.locator('#errors')).toBeEmpty();
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#size-caption')).toHaveText('1,200 × 300 × 950 mm');
  await page.locator('[data-tab="parameters"]').click();
  await page.locator('[name="Hd"]').fill('2');
  await page.getByRole('button', { name: 'Apply dimensions' }).click();
  await expect(page.locator('#errors')).not.toBeEmpty();
  await expect(page.locator('#visible-count')).toHaveText('30 / 30 visible');
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(page.locator('#errors')).toBeEmpty();
  expect(errors).toEqual([]);
});

test('compact layout keeps the canvas and controls accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-mode="part"]').click();
  await expect(page.locator('#visible-count')).toHaveText('1 / 30 visible');
  await page.locator('[data-page="drawings"]').click();
  await expect(page.locator('#drawing-select')).toBeVisible();
  await expect(page.locator('#drawing-pdf')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('drawings cover all parts and export vector A4 PDFs', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  await page.locator('[data-part="center"]').click();
  await page.locator('[data-page="drawings"]').click();
  await expect(page.locator('#drawing-select option')).toHaveCount(11);
  await expect(page.locator('#drawing-select')).toHaveValue('center');
  await expect(page.locator('#drawing-paper')).toContainText('both faces');
  await page.screenshot({ path: testInfo.outputPath('center-drawing.png') });
  const options = await page.locator('#drawing-select option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
  for (const id of options) {
    await page.locator('#drawing-select').selectOption(id);
    await expectReadableSheet(page, id);
  }
  await page.locator('#drawing-select').selectOption(options[0]);
  await page.locator('#drawing-prev').click();
  await expect(page.locator('#drawing-select')).toHaveValue(options.at(-1)!);
  await page.locator('#drawing-next').click();
  await page.locator('#drawing-next').click();
  await expect(page.locator('#drawing-select')).toHaveValue(options[1]);
  await page.locator('#drawing-select').selectOption('side-left');
  await page.screenshot({ path: testInfo.outputPath('side-drawing.png') });
  for (const [button, filename] of [
    ['#drawing-pdf', 'side-left-drawing.pdf'],
    ['#drawing-set', 'consola-entrada-drawings.pdf'],
  ]) {
    const downloadPromise = page.waitForEvent('download');
    await page.locator(button).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(filename);
    const path = testInfo.outputPath(filename);
    await download.saveAs(path);
    const pdf = await PDFDocument.load(await readFile(path));
    expect(pdf.getPageCount()).toBe(button === '#drawing-set' ? 11 : 1);
    for (const sheet of pdf.getPages()) {
      expect(sheet.getWidth()).toBeCloseTo(297 / 25.4 * 72, 1);
      expect(sheet.getHeight()).toBeCloseTo(210 / 25.4 * 72, 1);
    }
  }
  await page.locator('[data-page="assembly"]').click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.locator('[data-tab="parameters"]').click();
  await page.locator('[name="L"]').fill('1200');
  await page.getByRole('button', { name: 'Apply dimensions' }).click();
  await page.locator('[data-part="door-left"]').click();
  await page.locator('[data-page="drawings"]').click();
  await expect(page.locator('#drawing-paper')).toContainText('566.5');
  expect(errors).toEqual([]);
});

async function expectReadableSheet(page: Page, id: string) {
  const overflowingText = await page.locator('#drawing-paper svg').evaluate(svg => [...svg.querySelectorAll('text')].filter(text => {
    const box = text.getBBox();
    const matrix = text.getCTM()!;
    const rootMatrix = (svg as SVGSVGElement).getCTM()!.inverse();
    return [[box.x, box.y], [box.x + box.width, box.y + box.height]].some(([x, y]) => {
      const point = new DOMPoint(x, y).matrixTransform(matrix).matrixTransform(rootMatrix);
      return point.x < 10 || point.x > 287 || point.y < 10 || point.y > 200;
    });
  }).map(text => text.textContent));
  expect(overflowingText, id).toEqual([]);
  const overlappingText = await page.locator('#drawing-paper svg').evaluate(svg => {
    const boxes = [...svg.querySelectorAll('text')].map(text => ({ label: text.textContent, box: text.getBoundingClientRect() }));
    return boxes.flatMap((a, i) => boxes.slice(i + 1).filter(b => a.box.left < b.box.right && b.box.left < a.box.right
      && a.box.top < b.box.bottom && b.box.top < a.box.bottom).map(b => `${a.label} / ${b.label}`));
  });
  expect(overlappingText, id).toEqual([]);
}

test('Catalan sheets keep their text readable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('PARAGLIDE_LOCALE', 'ca'));
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ca');
  await page.locator('[data-page="drawings"]').click();
  await expect(page.locator('#drawing-select option')).toHaveCount(11);
  const options = await page.locator('#drawing-select option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
  for (const id of options) {
    await page.locator('#drawing-select').selectOption(id);
    await expectReadableSheet(page, id);
  }
  await page.locator('#drawing-select').selectOption('center');
  await expect(page.locator('#drawing-paper')).toContainText('a les dues cares');
});
