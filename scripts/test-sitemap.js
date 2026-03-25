const zlib = require('zlib');
const { promisify } = require('util');
const gunzip = promisify(zlib.gunzip);

async function main() {
  const url = 'https://truyenfull.vision/sitemap/truyen_sitemap.xml.gz';
  console.log('Fetching:', url);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' }
  });
  console.log('Status:', res.status, res.headers.get('content-type'));

  const buffer = Buffer.from(await res.arrayBuffer());
  console.log('Downloaded:', buffer.length, 'bytes (compressed)');

  const xml = (await gunzip(buffer)).toString('utf-8');
  console.log('Decompressed:', xml.length, 'chars');

  // Count <loc> entries
  const locs = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map(m => m[1].trim());
  console.log('\nTotal <loc> entries:', locs.length);

  // Filter story URLs (1-segment paths)
  const EXCLUDE = new Set(['the-loai','tac-gia','tim-kiem','dang-nhap','danh-sach','truyen-moi','sitemap']);
  const stories = locs.filter(loc => {
    try {
      const u = new URL(loc);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length !== 1) return false;
      const slug = parts[0];
      if (EXCLUDE.has(slug)) return false;
      if (slug.includes('.')) return false;
      return true;
    } catch { return false; }
  });

  console.log('Story URLs (1-segment paths):', stories.length);
  console.log('\nSample (first 5):');
  stories.slice(0, 5).forEach(u => console.log(' -', u));
  console.log('\nSample (last 5):');
  stories.slice(-5).forEach(u => console.log(' -', u));
}

main().catch(console.error);
