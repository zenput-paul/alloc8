import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import { createConnection } from 'net';

const PORT = 5199;
const BASE_URL = `http://localhost:${PORT}/alloc8/`;

/** Check if something is already listening on the port. */
function isPortOpen(port) {
  return new Promise((resolve) => {
    const sock = createConnection({ port }, () => {
      sock.destroy();
      resolve(true);
    });
    sock.once('error', () => resolve(false));
  });
}

/** Start a Vite dev server on PORT if one is not already running. */
let devServerProcess = null;
async function ensureDevServer() {
  if (await isPortOpen(PORT)) return;

  devServerProcess = spawn(
    'npx',
    ['vite', '--port', String(PORT), '--strictPort'],
    { stdio: 'ignore', detached: true },
  );
  devServerProcess.unref();

  // Wait for the server to be ready (up to 15 s)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isPortOpen(PORT)) return;
  }
  throw new Error(`Dev server did not start on port ${PORT} within 15 s`);
}

const server = new McpServer({ name: 'screenshot-server', version: '1.0.0' });

server.registerTool(
  'screenshot',
  {
    description:
      'Take a screenshot of the running app at a given viewport size. Returns a PNG image. Starts the dev server automatically if needed.',
    inputSchema: {
      path: z
        .string()
        .regex(/^[a-zA-Z0-9/_#-]*$/)
        .default('/')
        .describe('URL path to navigate to. Defaults to "/".'),
      viewport: z
        .enum(['mobile', 'desktop'])
        .default('desktop')
        .describe(
          'Viewport size: "mobile" (375x667) or "desktop" (1280x800). Defaults to "desktop".',
        ),
      click: z
        .array(z.string())
        .optional()
        .describe(
          'Ordered list of aria-labels or text labels to click before taking the screenshot. Example: ["Calculator"] clicks the Calculator tab.',
        ),
    },
  },
  async ({ path, viewport, click }) => {
    const clicks = click ?? [];
    const dimensions =
      viewport === 'mobile'
        ? { width: 375, height: 667 }
        : { width: 1280, height: 800 };

    let browser;
    try {
      await ensureDevServer();

      browser = await chromium.launch();
      const context = await browser.newContext({ viewport: dimensions });
      const page = await context.newPage();

      await page.goto(`${BASE_URL}${path.replace(/^\//, '')}`, {
        waitUntil: 'networkidle',
      });

      // Wait for the app bar to be visible (MUI finished rendering)
      await page.getByRole('banner').waitFor({ state: 'visible' });

      // Click elements in order (by aria-label, role, or text)
      for (const label of clicks) {
        const locator = page
          .getByRole('tab', { name: label })
          .or(page.getByRole('button', { name: label }))
          .or(page.getByText(label, { exact: true }));
        await locator.first().click();
        await page.waitForLoadState('networkidle');
      }

      // Screenshot directly to buffer — no temp file
      const buffer = await page.screenshot({ fullPage: true });

      return {
        content: [
          {
            type: 'image',
            data: buffer.toString('base64'),
            mimeType: 'image/png',
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Screenshot failed: ${error.message}`,
          },
        ],
      };
    } finally {
      if (browser) await browser.close();
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
