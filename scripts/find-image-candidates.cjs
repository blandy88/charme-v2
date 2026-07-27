const query = process.argv.slice(2).join(' ');
if (!query) {
  console.error('Usage: node scripts/find-image-candidates.cjs <query>');
  process.exit(1);
}

function extractToken(html) {
  const marker = 'vqd="';
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const tokenStart = start + marker.length;
  const tokenEnd = html.indexOf('"', tokenStart);
  return tokenEnd === -1 ? null : html.slice(tokenStart, tokenEnd);
}

(async () => {
  const page = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
    headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'en-US,en;q=0.9' },
  }).then((response) => response.text());
  const token = extractToken(page);
  if (!token) throw new Error('No DuckDuckGo image token found');

  const url = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(token)}&f=type:transparent`;
  const data = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://duckduckgo.com/' },
  }).then((response) => response.json());

  for (const [index, result] of (data.results || []).slice(0, 30).entries()) {
    console.log(`${index + 1}. ${result.title || ''}`);
    console.log(`   image: ${result.image}`);
    console.log(`   page: ${result.url || ''}`);
  }
})();
