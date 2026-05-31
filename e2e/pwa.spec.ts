import { expect, test } from '@playwright/test';

test.describe('PWA install and share target', () => {
  test('manifest, declared assets, and shell metadata are valid', async ({ page, baseURL }) => {
    const index = await page.request.get('/');
    expect(index.ok()).toBe(true);
    const html = await index.text();
    expect(html).toContain('name="theme-color" content="#B91C1C"');
    expect(html).toContain('name="theme-color" content="#111110" media="(prefers-color-scheme: dark)"');
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="apple-mobile-web-app-status-bar-style" content="black-translucent"');
    expect(html).toContain('name="format-detection" content="telephone=no, date=no, address=no, email=no"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('href="/favicon.ico"');

    const manifestResponse = await page.request.get('/manifest.webmanifest');
    expect(manifestResponse.ok()).toBe(true);
    const manifest = await manifestResponse.json();

    expect(manifest.display).toBe('standalone');
    expect(manifest.display_override).toEqual(expect.arrayContaining(['standalone']));
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.theme_color).toBe('#B91C1C');
    expect(manifest.background_color).toBe('#FAFAF7');
    expect(manifest.orientation).toBe('portrait-primary');
    expect(manifest.lang).toBe('ko');
    expect(manifest.categories).toEqual(expect.arrayContaining(['education']));
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: 'pwa-192x192.png', sizes: '192x192' }),
        expect.objectContaining({ src: 'pwa-512x512.png', sizes: '512x512' }),
      ]),
    );
    expect(manifest.share_target?.action).toBe('/add-word');

    const assetPaths = [
      ...manifest.icons.map((icon: { src: string }) => icon.src),
      ...(manifest.screenshots ?? []).map((screenshot: { src: string }) => screenshot.src),
    ];

    for (const assetPath of assetPaths) {
      const url = new URL(assetPath, baseURL ?? 'http://localhost:5173');
      const response = await page.request.get(url.pathname);
      expect(response.ok(), `${assetPath} should be served`).toBe(true);
    }
  });

  test('Android share target opens a usable vocabulary search flow', async ({ page }) => {
    await page.goto('/add-word?text=%E7%B5%8C%E9%A8%93');

    await expect(page.getByRole('heading', { name: /어휘 검색으로 연결|Open in vocabulary search|語彙検索で開く/ })).toBeVisible();
    await expect(page.getByRole('searchbox')).toHaveValue('経験');

    await page.getByRole('button', { name: /어휘에서 검색|Search vocabulary|語彙で検索/ }).click();
    await expect(page).toHaveURL(/\/browse\/vocab\?q=/);
    await expect(page.getByRole('searchbox')).toHaveValue('経験');
  });
});
