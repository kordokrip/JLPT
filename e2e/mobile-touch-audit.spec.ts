import { expect, test } from '@playwright/test';

const ROUTES = [
  '/',
  '/review',
  '/browse/vocab',
  '/browse/grammar',
  '/browse/kanji',
  '/browse/vocab/1',
  '/browse/grammar/1',
  '/browse/kanji/1',
  '/quiz',
  '/quiz/vocab_mc',
  '/quiz/listening',
  '/characters',
  '/reading',
  '/reading/1',
  '/curriculum',
  '/self-check',
  '/stats',
  '/settings',
  '/add-word',
  '/audio-qa',
] as const;

const IPHONE_VIEWPORTS = [
  { name: 'iphone-se', width: 320, height: 568 },
  { name: 'iphone-13', width: 390, height: 844 },
  { name: 'iphone-15-plus', width: 430, height: 932 },
] as const;

type ControlIssue = {
  tag: string;
  text: string;
  width: number;
  height: number;
};

async function visibleSmallControls() {
  const isInViewport = (rect: DOMRect) => rect.right > 0
    && rect.bottom > 0
    && rect.left < window.innerWidth
    && rect.top < window.innerHeight;
  const isTopLevelHitTarget = (node: HTMLElement, rect: DOMRect) => {
    const x = Math.min(Math.max(rect.left + rect.width / 2, 1), window.innerWidth - 1);
    const y = Math.min(Math.max(rect.top + rect.height / 2, 1), window.innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    return Boolean(hit && node.contains(hit));
  };
  const controlSelector = [
    'button',
    'a[href]',
    '[role="button"]',
    '[role="switch"]',
    'input:not([type="hidden"])',
    'select',
    'textarea',
  ].join(',');

  return Array.from(document.querySelectorAll<HTMLElement>(controlSelector))
    .filter((node) => {
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      if (window.innerWidth < 768 && node.closest('nav[data-state]')) return false;
      if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) return false;
      if (style.pointerEvents === 'none') return false;
      if (!isInViewport(rect) || !isTopLevelHitTarget(node, rect)) return false;
      if (Number(style.opacity) === 0) return false;
      if (rect.width <= 2 && rect.height <= 2) return false;
      if (node.closest('[aria-hidden="true"]')) return false;
      if (node.closest('main') === null && node.closest('nav') === null) return false;
      return true;
    })
    .map((node): ControlIssue => {
      const rect = node.getBoundingClientRect();
      return {
        tag: node.tagName.toLowerCase(),
        text: (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 48),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    })
    .filter((item) => item.width < 40 || item.height < 40);
}

async function visibleOverlaps() {
  const isInViewport = (rect: DOMRect) => rect.right > 0
    && rect.bottom > 0
    && rect.left < window.innerWidth
    && rect.top < window.innerHeight;
  const isTopLevelHitTarget = (node: HTMLElement, rect: DOMRect) => {
    const x = Math.min(Math.max(rect.left + rect.width / 2, 1), window.innerWidth - 1);
    const y = Math.min(Math.max(rect.top + rect.height / 2, 1), window.innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    return Boolean(hit && node.contains(hit));
  };
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('main button, main a[href], main [role="button"], main input, main select, nav button, nav a[href]'))
    .filter((node) => {
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      if (window.innerWidth < 768 && node.closest('nav[data-state]')) return false;
      if (Number(style.opacity) === 0) return false;
      if (rect.width <= 2 && rect.height <= 2) return false;
      if (style.pointerEvents === 'none') return false;
      if (!isInViewport(rect) || !isTopLevelHitTarget(node, rect)) return false;
      if (node.closest('[aria-hidden="true"]')) return false;
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    })
    .slice(0, 120);

  const rects = nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return {
      zone: node.closest('nav') ? 'nav' : 'main',
      label: (node.getAttribute('aria-label') || node.textContent || node.tagName).trim().slice(0, 32),
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      area: rect.width * rect.height,
    };
  });

  const issues: string[] = [];
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const a = rects[i]!;
      const b = rects[j]!;
      if (a.zone !== b.zone) continue;
      const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const overlapArea = overlapX * overlapY;
      if (overlapArea > 0 && overlapArea / Math.min(a.area, b.area) > 0.65) {
        issues.push(`${a.label} overlaps ${b.label}`);
      }
    }
  }
  return issues;
}

test.describe('iPhone 터치/겹침 감사', () => {
  for (const viewport of IPHONE_VIEWPORTS) {
    test(`${viewport.name}: 전체 주요 라우트 터치 타깃과 overflow`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of ROUTES) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#root > *').first()).toBeVisible();

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        expect(overflow, `${viewport.name} ${route} horizontal overflow`).toBe(false);

        const smallControls = await page.evaluate(visibleSmallControls);
        expect(smallControls, `${viewport.name} ${route} small controls`).toEqual([]);

        const mainSeparatedFromBottomNav = await page.evaluate(() => {
          const isInViewport = (rect: DOMRect) => rect.right > 0
            && rect.bottom > 0
            && rect.left < window.innerWidth
            && rect.top < window.innerHeight;
          const nav = document.querySelector('nav[aria-label]');
          if (!nav || window.getComputedStyle(nav).display === 'none') return true;
          const navRect = nav.getBoundingClientRect();
          const controls = Array.from(document.querySelectorAll<HTMLElement>('main button, main a[href], main [role="button"], main input, main select, main textarea'));
          return controls.every((node) => {
            const style = window.getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return true;
            if (!isInViewport(rect) || Number(style.opacity) === 0 || node.closest('[aria-hidden="true"]')) return true;
            return rect.bottom <= navRect.top + 1 || rect.top >= navRect.bottom - 1;
          });
        });
        expect(mainSeparatedFromBottomNav, `${viewport.name} ${route} main bottom nav separation`).toBe(true);

        const overlaps = await page.evaluate(visibleOverlaps);
        expect(overlaps, `${viewport.name} ${route} severe control overlaps`).toEqual([]);
      }
    });
  }
});
