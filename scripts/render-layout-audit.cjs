const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 4177;

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
};

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
    const relative = urlPath === '/' ? 'index.html' : urlPath.slice(1);
    const filePath = path.normalize(path.join(ROOT, relative));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'content-type': mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  const report = await page.evaluate(() => {
    const sectionIds = [...document.querySelectorAll('section[id]')]
      .map((section) => section.id)
      .filter((id) => id && !id.includes('transition') && id !== 'databaseFragrancesSection');

    function rect(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    }

    function isVisible(el) {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 1 && r.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
    }

    return sectionIds.map((id) => {
      const section = document.getElementById(id);
      const product = section.querySelector('[class$="-product-section"], .product-title');
      const profiles = section.querySelector('[class$="-profiles-container"], .layton-notes, .haltane-notes, .pegasus-scent-profile');
      const noteCards = [...section.querySelectorAll('.note-item, [class$="-note-item"], .crystal-card, [class$="-crystal-card"], [class*="-noir-card"], [class*="-heritage-tag"], .chip, [class$="-chip"], [class*="-note-pill"], [class*="-note-card"], [class*="-ingredient-card"], [class$="-leaf"], [class$="-star-note"], [class$="-petal"], [class$="-petal-inner"]')].filter(isVisible);
      const hydrated = noteCards.filter((card) => card.querySelector('img.note-real-image')).length;
      const duplicateEmoji = noteCards.filter((card) => card.querySelector('img.note-real-image') && /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(card.textContent)).length;
      const sectionRect = rect(section);
      const productRect = rect(product);
      const profilesRect = rect(profiles);
      const horizontalOverflow = section.scrollWidth - section.clientWidth;
      const viewportOverflow = sectionRect ? Math.max(0, sectionRect.right - window.innerWidth) : 0;
      const imageCount = section.querySelectorAll('img.note-real-image').length;
      return {
        id,
        className: section.className,
        sectionRect,
        productRect,
        profilesRect,
        horizontalOverflow,
        viewportOverflow,
        noteCards: noteCards.length,
        hydrated,
        missingHydration: noteCards.length - hydrated,
        duplicateEmoji,
        imageCount,
      };
    });
  });

  const bad = report.filter((row) =>
    row.horizontalOverflow > 4 ||
    row.viewportOverflow > 4 ||
    row.missingHydration > 0 ||
    row.duplicateEmoji > 0 ||
    (row.noteCards > 0 && row.hydrated === 0)
  );

  fs.writeFileSync(path.join(ROOT, 'scripts/render-layout-audit.json'), JSON.stringify({ generatedAt: new Date().toISOString(), report, bad }, null, 2));
  console.log(`sections ${report.length}`);
  console.log(`bad ${bad.length}`);
  for (const row of bad) {
    console.log(`${row.id}\toverflow=${row.horizontalOverflow}/${row.viewportOverflow}\tnotes=${row.noteCards}\thydrated=${row.hydrated}\tmissing=${row.missingHydration}\tdup=${row.duplicateEmoji}`);
  }

  await browser.close();
  server.close();
  if (bad.length) process.exitCode = 1;
})();
