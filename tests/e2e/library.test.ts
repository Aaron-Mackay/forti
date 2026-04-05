/**
 * Library page tests (/library).
 *
 * Covers: page load, sidebar nav link, adding a link asset via the dialog,
 * validation, placeholder chip for non-link types, and deleting own assets.
 *
 * ─── IMPORTANT PATTERN — learned from these tests ──────────────────────────
 * Do NOT rely on Jeff/Todd seed data in E2E tests.
 * All E2E tests authenticate as TestUser (testuser@example.com), not as Jeff
 * Demo. Jeff's seeded library assets and his coach relationship with Todd are
 * invisible to TestUser. Every test must create and clean up its own data via
 * the API in beforeEach/afterEach — exactly like supplements.test.ts does.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * State-dependent tests run in serial mode, chromium desktop only, to prevent
 * parallel DB conflicts across browser projects.
 */
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function openNav(page: Page) {
  const menuButton = page.getByRole('button', { name: /menu/i });
  const hasVisibleMenuButton = await menuButton.isVisible().catch(() => false);
  if (hasVisibleMenuButton) {
    await menuButton.click({ timeout: 3_000 }).catch(() => {});
  }
  await expect(page.getByRole('link', { name: 'Home' }).first()).toBeVisible();
  return page.locator('body');
}

test.describe.configure({ mode: 'serial' });

test.describe('Library page', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'State-dependent tests run on desktop Chromium only; mobile projects share the DB user and create race conditions',
  );

  // Tracks IDs created during a test so afterEach can clean up stragglers
  const createdIds: string[] = [];

  async function createAsset(
    page: Page,
    data: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const res = await page.request.post('/api/library', { data });
    if (!res.ok()) throw new Error(`createAsset failed: ${res.status()} ${await res.text()}`);
    const asset = (await res.json()) as { id: string };
    createdIds.push(asset.id);
    return asset;
  }

  async function createUploadedAssetFromBuffer(
    page: Page,
    data: {
      type: 'DOCUMENT' | 'IMAGE' | 'VIDEO';
      title: string;
      description?: string;
      fileName: string;
      mimeType: string;
      buffer: Buffer;
    },
  ): Promise<{ id: string }> {
    const res = await page.request.post('/api/library/upload', {
      multipart: {
        type: data.type,
        title: data.title,
        description: data.description ?? '',
        file: {
          name: data.fileName,
          mimeType: data.mimeType,
          buffer: data.buffer,
        },
      },
    });
    if (!res.ok()) throw new Error(`createUploadedAssetFromBuffer failed: ${res.status()} ${await res.text()}`);
    const asset = (await res.json()) as { id: string };
    createdIds.push(asset.id);
    return asset;
  }

  test.beforeEach(async ({ page }) => {
    // Navigate first so the session cookie is sent as same-origin before
    // making API requests.
    await page.goto('/user');
    // Delete all existing library assets to get a clean slate.
    const res = await page.request.get('/api/library');
    if (res.ok()) {
      const assets = (await res.json()) as { id: string }[];
      for (const a of assets) {
        await page.request.delete(`/api/library/${a.id}`);
      }
    }
    createdIds.length = 0;
  });

  test.afterEach(async ({ page }) => {
    // Safety net: delete any assets whose IDs we tracked but beforeEach
    // of the next test hasn't cleaned up yet.
    for (const id of createdIds) {
      await page.request.delete(`/api/library/${id}`);
    }
    createdIds.length = 0;
  });

  test('renders the Library heading', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByRole('banner')).toContainText('Library');
  });

  test('shows Library link in sidebar', async ({ page }) => {
    await page.goto('/library');
    const nav = await openNav(page);
    await expect(nav.getByRole('link', { name: 'Library' })).toBeVisible();
  });

  test('shows empty state when user has no assets', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByText(/no items yet/i)).toBeVisible();
  });

  test('coach section is not shown when user has no coach', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByText(/from your coach/i)).not.toBeVisible();
  });

  test('pre-existing link asset is visible on page load', async ({ page }) => {
    await createAsset(page, {
      type: 'LINK',
      title: 'My PR Tracker',
      url: 'https://docs.google.com/spreadsheets',
      description: 'Personal records spreadsheet',
    });
    await page.goto('/library');
    await expect(page.getByText('My PR Tracker')).toBeVisible();
  });

  test('image asset opens in the media viewer instead of exposing a raw link', async ({ page }) => {
    await createUploadedAssetFromBuffer(page, {
      type: 'IMAGE',
      title: 'Movement Standards',
      description: 'Reference images for key lifts.',
      fileName: 'movement-standards.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0XQAAAAASUVORK5CYII=',
        'base64',
      ),
    });
    await page.goto('/library');
    const card = page.locator('.MuiCard-root').filter({ hasText: 'Movement Standards' }).first(); // targeted card
    await expect(card.locator('img')).toBeVisible();
    await expect(card.getByText(/vercel-storage|blob\.vercel-storage|https?:\/\//i)).not.toBeVisible();
    await card.click();
    await expect(page.getByRole('dialog', { name: 'Movement Standards' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Movement Standards' }).locator('img')).toBeVisible();
  });

  test('pdf document opens in the media viewer', async ({ page }) => {
    await createUploadedAssetFromBuffer(page, {
      type: 'DOCUMENT',
      title: 'Training Programme Overview',
      description: 'Weekly expectation notes.',
      fileName: 'overview.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'),
    });

    await page.goto('/library');
    const card = page.locator('.MuiCard-root').filter({ hasText: 'Training Programme Overview' }).first();
    await card.click();

    const dialog = page.getByRole('dialog', { name: 'Training Programme Overview' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('iframe')).toBeVisible();
  });

  test('txt document opens in the media viewer', async ({ page }) => {
    await createUploadedAssetFromBuffer(page, {
      type: 'DOCUMENT',
      title: 'Cue Sheet',
      description: 'Session reminders.',
      fileName: 'cues.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Brace hard\nDrive through the floor\nKeep the bar close\n'),
    });

    await page.goto('/library');
    const card = page.locator('.MuiCard-root').filter({ hasText: 'Cue Sheet' }).first();
    await card.click();

    const dialog = page.getByRole('dialog', { name: 'Cue Sheet' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Brace hard')).toBeVisible();
  });

  test('can add a link asset via the dialog', async ({ page }) => {
    await page.goto('/library');
    await page.getByRole('button', { name: /^upload$/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel('Title').fill('Test Resource');
    await page.getByLabel('URL').fill('https://example.com/test');

    // Listen for the POST response to capture the ID for afterEach cleanup
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/library') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /^upload$/i }).click();
    const response = await responsePromise;
    if (response.ok()) {
      const body = (await response.json()) as { id: string };
      createdIds.push(body.id);
    }

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Test Resource')).toBeVisible();
  });

  test('add dialog keeps Add disabled until title is entered', async ({ page }) => {
    await page.goto('/library');
    await page.getByRole('button', { name: /^upload$/i }).click();
    const addButton = page.getByRole('button', { name: /^upload$/i });

    await expect(addButton).toBeDisabled();

    await page.getByLabel('URL').fill('https://example.com/ready');
    await expect(addButton).toBeDisabled();

    await page.getByLabel('Title').fill('Ready to save');
    await expect(addButton).toBeEnabled();
  });

  test('add dialog keeps Add disabled until URL is valid for links', async ({ page }) => {
    await page.goto('/library');
    await page.getByRole('button', { name: /^upload$/i }).click();
    const addButton = page.getByRole('button', { name: /^upload$/i });

    await page.getByLabel('Title').fill('No URL Link');
    await expect(addButton).toBeDisabled();

    await page.getByLabel('URL').fill('not-a-url');
    await expect(addButton).toBeDisabled();

    await page.getByLabel('URL').fill('https://example.com/link');
    await expect(addButton).toBeEnabled();
  });

  test('non-link type hides URL field and shows the file picker in the dialog', async ({ page }) => {
    await page.goto('/library');
    await page.getByRole('button', { name: /^upload$/i }).click();
    await page.getByRole('button', { name: 'Document' }).click();
    await expect(page.getByRole('button', { name: /choose file/i })).toBeVisible();
    await expect(page.getByLabel('URL')).not.toBeVisible();
  });

  test('can cancel the add dialog', async ({ page }) => {
    await page.goto('/library');
    await page.getByRole('button', { name: /^upload$/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('can delete an own asset', async ({ page }) => {
    // Create via API; do NOT push to createdIds — we expect UI delete to succeed.
    // If it doesn't, beforeEach of the next test will clean it up via GET+DELETE.
    const res = await page.request.post('/api/library', {
      data: { type: 'LINK', title: 'Delete Me', url: 'https://example.com/delete' },
    });
    if (!res.ok()) throw new Error('createAsset failed');

    await page.goto('/library');
    await expect(page.getByText('Delete Me')).toBeVisible();

    const card = page.locator('.MuiCard-root').filter({ hasText: 'Delete Me' }).first(); // targeted card
    await card.getByRole('button', { name: /delete/i }).click();
    await expect(card.getByRole('button', { name: /confirm delete/i })).toBeVisible();
    await card.getByRole('button', { name: /confirm delete/i }).click();
    await expect(page.getByText('Delete Me')).not.toBeVisible();
  });

  test('can edit an own asset title and description', async ({ page }) => {
    await createAsset(page, {
      type: 'LINK',
      title: 'Original Asset',
      url: 'https://example.com/original',
      description: 'Original description',
    });

    await page.goto('/library');
    const card = page.locator('.MuiCard-root').filter({ hasText: 'Original Asset' }).first();

    await card.getByRole('button', { name: /edit asset/i }).click();
    await expect(page.getByRole('dialog', { name: 'Edit Asset' })).toBeVisible();

    await page.getByLabel('Title').fill('Updated Asset');
    await page.getByLabel('Description (optional)').fill('Updated description');
    await page.getByRole('button', { name: /^save$/i }).click();

    await expect(page.getByRole('dialog', { name: 'Edit Asset' })).not.toBeVisible();
    await expect(page.getByText('Updated Asset')).toBeVisible();
    await expect(page.getByText('Updated description')).toBeVisible();
  });

  // ── Bulk Upload Links ────────────────────────────────────────────────────

  test('Bulk Upload Links button opens the import dialog', async ({ page }) => {
    await page.goto('/library');
    await page.getByRole('button', { name: /bulk upload links/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bulk Upload Links' })).toBeVisible();
  });

  test('pasting CSV shows a preview with valid and invalid rows', async ({ page }) => {
    await page.goto('/library');
    await page.getByRole('button', { name: /bulk upload links/i }).click();

    const csv = [
      'name,url',
      'Squat Guide,https://youtube.com/squat',
      'Bad Row,not-a-url',
    ].join('\n');
    await page.getByLabel('Paste CSV or TSV text').fill(csv);

    // Preview section appears
    await expect(page.getByText('Preview')).toBeVisible();
    // One valid, one invalid
    await expect(page.getByText('1 valid · 1 will be skipped')).toBeVisible();
  });

  test('can import links from pasted CSV', async ({ page }) => {
    await page.goto('/library');
    await page.getByRole('button', { name: /bulk upload links/i }).click();

    const csv = [
      'name,url',
      'Bulk Link A,https://example.com/a',
      'Bulk Link B,https://example.com/b',
    ].join('\n');
    await page.getByLabel('Paste CSV or TSV text').fill(csv);
    await expect(page.getByText('2 valid')).toBeVisible();

    // Capture both POST responses for afterEach cleanup
    const responses: string[] = [];
    page.on('response', async (r) => {
      if (r.url().includes('/api/library') && r.request().method() === 'POST' && r.ok()) {
        const body = (await r.json()) as { id: string };
        responses.push(body.id);
      }
    });

    await page.getByRole('button', { name: /import 2 links/i }).click();

    // Dialog closes and both assets appear
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Bulk Link A')).toBeVisible();
    await expect(page.getByText('Bulk Link B')).toBeVisible();

    // Register for cleanup (responses may arrive slightly after dialog closes)
    await page.waitForTimeout(300);
    createdIds.push(...responses);
  });

  test('Import button is disabled when no valid rows exist', async ({ page }) => {
    await page.goto('/library');
    await page.getByRole('button', { name: /bulk upload links/i }).click();

    // Paste only invalid rows
    await page.getByLabel('Paste CSV or TSV text').fill('name,url\nBad,not-a-url');
    await expect(page.getByRole('button', { name: /import 0/i })).toBeDisabled();
  });

  test('can cancel the import dialog without changes', async ({ page }) => {
    await page.goto('/library');
    await page.getByRole('button', { name: /bulk upload links/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
