import { expect, test, Page } from '@playwright/test';

const project = { id: 'browser-project', name: 'Browser Project', description: '', createdAt: '2026-01-01T00:00:00.000Z' };
const data = {
    streams: [{ id: 'source', name: 'source', description: '', type: 'kafka', partitions: 1 }, { id: 'sink', name: 'sink', description: '', type: 'kafka', partitions: 1 }],
    consumers: [{ id: 'worker', name: 'worker', description: '', sources: [{ streamId: 'source', eventIds: [] }], sinks: [{ streamId: 'sink', eventIds: [] }] }],
    flows: [], events: [], nodePositions: { source: { x: 0, y: 0 }, worker: { x: 650, y: 0 }, sink: { x: 1300, y: 0 } }, edgeRoutings: {},
};
async function seed(page: Page) {
    await page.addInitScript(({ project, data }) => {
        if (localStorage.getItem('fw_projects')) return;
        localStorage.setItem('fw_projects', JSON.stringify([project]));
        localStorage.setItem(`fw_proj_${project.id}`, JSON.stringify(data));
        localStorage.setItem('fw_prefs', JSON.stringify({ activeProjectId: project.id, theme: 'dark' }));
    }, { project, data });
    await page.goto('/');
    await expect(page.locator('.react-flow__node')).toHaveCount(3);
}

test('dragged nodes autosave, survive reload and appear in exported JSON', async ({ page }) => {
    await seed(page);
    const node = page.locator('.react-flow__node[data-id="source"]');
    await expect(node).toBeVisible();
    // Wait for initial fit-view animation to settle before dragging the rendered node.
    await expect.poll(async () => node.boundingBox()).not.toBeNull();
    await page.getByRole('button', { name: 'Lock Canvas', exact: true }).click();
    await page.getByRole('button', { name: 'Unlock Canvas', exact: true }).click();
    const box = (await node.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 100, box.y + 100, { steps: 12 });
    await page.mouse.up();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fw_proj_browser-project')!).nodePositions.source);
    expect(saved).not.toEqual({ x: 0, y: 0 });
    await page.reload();
    await expect(page.locator('.react-flow__node')).toHaveCount(3);
    await expect(node).toHaveAttribute('style', new RegExp(`translate\\(${saved.x}px, ${saved.y}px\\)`));
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export project', exact: true }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    expect(JSON.parse(Buffer.concat(chunks).toString()).data.nodePositions.source).toEqual(saved);
});

test('a completed simulation permits firing another event', async ({ page }) => {
    await seed(page);
    await page.getByRole('button', { name: 'Fire Event', exact: true }).click();
    await page.getByRole('button', { name: 'Inject Event & Start Simulation' }).click();
    await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
    await expect(page.getByText('LIVE', { exact: true })).toBeHidden({ timeout: 15000 });
    await page.getByRole('button', { name: 'Close execution trace' }).click();
    await page.getByRole('button', { name: 'Fire Event', exact: true }).click();
    await expect(page.getByText('Simulation is already running.')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Inject Event & Start Simulation' })).toBeEnabled();
});

test('search highlights matching nodes and clearing it restores the graph', async ({ page }) => {
    await seed(page);
    await page.getByRole('button', { name: 'Search canvas', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Search canvas nodes' });
    await input.fill('source');
    await expect(page.getByText('1 match', { exact: true })).toBeVisible();
    await expect(page.locator('.react-flow__node[data-id="sink"]')).toHaveCSS('opacity', '0.15');
    await input.press('Escape');
    await expect(page.locator('.react-flow__node[data-id="sink"]')).toHaveCSS('opacity', '1');
});

test('invalid transformations stay in the editor and valid quoted strings save', async ({ page }) => {
    await seed(page);
    await page.locator('.react-flow__node[data-id="worker"]').click();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('tab', { name: '2. Logic & Mapping' }).click();
    const script = page.getByRole('textbox', { name: 'Consumer transformation' });
    await script.fill('payload.url = window.location;');
    await expect(script).toHaveAttribute('aria-invalid', 'true');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(script).toBeVisible();
    await script.fill('payload.url = "https://example.com/a;b"; return payload;');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(script).toBeHidden();
    const consumer = await page.evaluate(() => JSON.parse(localStorage.getItem('fw_proj_browser-project')!).consumers[0]);
    expect(consumer.transformScript).toContain('https://example.com/a;b');
});

test('a malformed import shows an error and leaves the current project intact', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await seed(page);
    await page.locator('input[type="file"]').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, project: { ...project, id: 'bad' }, data: { ...data, streams: [{ id: 'bad' }] } })) });
    await expect(page.getByRole('status')).toContainText('Import failed');
    await expect(page.locator('.react-flow__node')).toHaveCount(3);
    expect(errors).toEqual([]);
});

test('failed saves keep the editor open and preserve the saved project', async ({ page }) => {
    await seed(page);
    await page.locator('.react-flow__node[data-id="worker"]').click();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('textbox', { name: 'Consumer Name' }).fill('Unsaved worker');
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('could not save');
    await expect(page.getByRole('textbox', { name: 'Consumer Name' })).toHaveValue('Unsaved worker');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fw_proj_browser-project')!).consumers[0].name)).toBe('worker');
});

test('damaged saved data remains downloadable for recovery', async ({ page }) => {
    await seed(page);
    await page.evaluate(() => localStorage.setItem('fw_proj_browser-project', '{damaged'));
    await page.reload();
    await expect(page.getByRole('alert')).toContainText('Your saved data has been preserved');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download recovery backup' }).click();
    const stream = await (await downloadPromise).createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    expect(JSON.parse(Buffer.concat(chunks).toString())['fw_proj_browser-project']).toBe('{damaged');
});

test('switching projects with shared node IDs restores each project layout', async ({ page }) => {
    await seed(page);
    await page.evaluate(({ project, data }) => {
        const other = { ...project, id: 'other', name: 'Other Project' };
        localStorage.setItem('fw_projects', JSON.stringify([project, other]));
        localStorage.setItem('fw_proj_other', JSON.stringify({ ...data, nodePositions: { ...data.nodePositions, source: { x: 420, y: 360 } } }));
    }, { project, data });
    await page.reload();
    await page.getByRole('button', { name: 'Browser Project', exact: true }).click();
    await page.getByRole('menuitem', { name: /Other Project/ }).click();
    await expect(page.locator('.react-flow__node[data-id="source"]')).toHaveAttribute('style', /translate\(420px, 360px\)/);
    await page.getByRole('button', { name: 'Other Project', exact: true }).click();
    await page.getByRole('menuitem', { name: /Browser Project/ }).click();
    await expect(page.locator('.react-flow__node[data-id="source"]')).toHaveAttribute('style', /translate\(0px, 0px\)/);
});
