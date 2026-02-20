#!/usr/bin/env node

// Downloads all Pokémon Ruby/Sapphire sprite sheets from The Spriters Resource.
// Usage: node scripts/download-pokemon-assets.js [--dry-run]
// Requirements: Node.js 20+ (uses native fetch)

import { mkdir, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ──────────────────────────────────────────────
const BASE_URL = 'https://www.spriters-resource.com';
const LISTING_URL = `${BASE_URL}/game_boy_advance/pokemonrubysapphire/`;
const OUTPUT_DIR = join(__dirname, '..', 'resources', 'pokemon');
const DELAY_MS = 1500;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DRY_RUN = process.argv.includes('--dry-run');

// ── Helpers ────────────────────────────────────────────────────
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function sanitizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[/\\]/g, '-')
    .replace(/[()[\]{}]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function deriveDownloadUrl(iconSrc) {
  return iconSrc.replace('/media/asset_icons/', '/media/assets/');
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// ── Parsing ────────────────────────────────────────────────────
function parseListingPage(html) {
  const categories = [];

  // HTML structure:
  //   <div class="section text-shadow end-border" id="section-NNNN">
  //     <span class="section-toggle ...">arrow_drop_down</span>
  //     <span class="asset-count">[N]</span>
  //   Category Name
  //   </div>
  //   <div class="icondisplay">
  //   <a href="/game_boy_advance/pokemonrubysapphire/asset/NNNNN/" class="iconlink">
  //     <div class="iconcontainer">
  //       <div class="iconheader" title="Name">Name</div>
  //       <div class="iconbody ..."><img src="/media/asset_icons/X/NNNNN.png?updated=..."></div>
  //     </div>
  //   </a>
  //   </div>

  // Pass 1: find category sections
  const sectionRegex =
    /<div class="section text-shadow[^"]*"[^>]*>\s*<span class="section-toggle[^"]*"[^>]*>[^<]*<\/span>\s*<span class="asset-count">\[\d+\]<\/span>\s*\n?\s*([^\n<]+)/g;

  const sectionMatches = [];
  let match;
  while ((match = sectionRegex.exec(html)) !== null) {
    sectionMatches.push({
      name: match[1].trim(),
      index: match.index,
    });
  }

  // Pass 2: for each section, extract assets until the next section
  for (let i = 0; i < sectionMatches.length; i++) {
    const section = sectionMatches[i];
    const startIdx = section.index;
    const endIdx = i + 1 < sectionMatches.length ? sectionMatches[i + 1].index : html.length;
    const sectionHtml = html.slice(startIdx, endIdx);

    const assets = [];
    const assetRegex =
      /href="\/game_boy_advance\/pokemonrubysapphire\/asset\/(\d+)\/"[^>]*class="iconlink"[\s\S]*?<div class="iconheader"[^>]*title="([^"]*)"[\s\S]*?<img[^>]*src="(\/media\/asset_icons\/[^"]*)"[^>]*>/g;

    let assetMatch;
    while ((assetMatch = assetRegex.exec(sectionHtml)) !== null) {
      assets.push({
        id: parseInt(assetMatch[1], 10),
        name: assetMatch[2].trim(),
        iconSrc: assetMatch[3],
      });
    }

    if (assets.length > 0) {
      categories.push({
        category: section.name,
        assets,
      });
    }
  }

  return categories;
}

// ── Download ───────────────────────────────────────────────────
async function tryFetch(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Referer: LISTING_URL,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

// Some assets are GIFs, not PNGs. Try PNG first, then GIF fallback.
async function downloadWithRetry(url, destPath) {
  const extensions = ['.png', '.gif'];

  for (const ext of extensions) {
    const tryUrl = url.replace(/\.\w+\?/, `${ext}?`);
    const tryDest = destPath.replace(/\.\w+$/, ext);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const buffer = await tryFetch(tryUrl);
        await writeFile(tryDest, buffer);
        return { ok: true, ext };
      } catch (error) {
        if (error.message.includes('404') && ext === '.png') {
          // Don't retry 404 for PNG — try GIF instead
          break;
        }
        console.error(`    Attempt ${attempt}/${MAX_RETRIES} failed (${ext}): ${error.message}`);
        if (attempt < MAX_RETRIES) {
          await delay(RETRY_DELAY_MS * attempt);
        }
      }
    }
  }
  return { ok: false, ext: '.png' };
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log(`Fetching asset listing from ${LISTING_URL}...`);

  const response = await fetch(LISTING_URL, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch listing: HTTP ${response.status}`);
  }

  const html = await response.text();
  const categories = parseListingPage(html);

  if (categories.length === 0) {
    // Fallback: try alternative HTML structure patterns
    console.error('No categories parsed. The HTML structure may have changed.');
    console.error('Dumping a sample of the HTML for debugging:');
    console.error(html.slice(0, 2000));
    process.exit(1);
  }

  const allAssets = categories.flatMap((cat) =>
    cat.assets.map((a) => ({ ...a, category: cat.category })),
  );

  console.log(`Found ${allAssets.length} assets in ${categories.length} categories:\n`);
  for (const cat of categories) {
    console.log(`  ${cat.category}: ${cat.assets.length} assets`);
  }
  console.log();

  if (DRY_RUN) {
    console.log('--- DRY RUN: listing all assets ---\n');
    for (const asset of allAssets) {
      const catDir = sanitizeName(asset.category);
      const fileName = `${sanitizeName(asset.name)}.png`;
      const downloadUrl = BASE_URL + deriveDownloadUrl(asset.iconSrc);
      console.log(`  ${catDir}/${fileName}  ←  ${downloadUrl}`);
    }
    console.log('\n--- DRY RUN complete, no files downloaded ---');
    return;
  }

  // Detect duplicate names within each category
  const nameCount = new Map();
  for (const asset of allAssets) {
    const key = `${asset.category}::${sanitizeName(asset.name)}`;
    nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
  }
  const nameSeen = new Map();

  // Create output directory
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const cat of categories) {
    await mkdir(join(OUTPUT_DIR, sanitizeName(cat.category)), { recursive: true });
  }

  const stats = { success: 0, skipped: 0, failed: 0 };
  const manifest = [];
  const total = allAssets.length;

  for (let i = 0; i < allAssets.length; i++) {
    const asset = allAssets[i];
    const catDir = sanitizeName(asset.category);
    const baseName = sanitizeName(asset.name);

    // Handle duplicates by appending asset ID
    const key = `${asset.category}::${baseName}`;
    const isDuplicate = (nameCount.get(key) ?? 0) > 1;
    const fileBase = isDuplicate ? `${baseName}-${asset.id}` : baseName;

    nameSeen.set(key, (nameSeen.get(key) ?? 0) + 1);

    const downloadUrl = BASE_URL + deriveDownloadUrl(asset.iconSrc);

    // Resume support: skip if any extension already exists
    const existingExt = (await fileExists(join(OUTPUT_DIR, catDir, `${fileBase}.png`)))
      ? '.png'
      : (await fileExists(join(OUTPUT_DIR, catDir, `${fileBase}.gif`)))
        ? '.gif'
        : null;

    if (existingExt) {
      const relativePath = `${catDir}/${fileBase}${existingExt}`;
      console.log(`  [${i + 1}/${total}] SKIP (exists): ${relativePath}`);
      stats.skipped++;
      manifest.push({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        file: relativePath,
        sourceUrl: `${BASE_URL}/game_boy_advance/pokemonrubysapphire/sheet/${asset.id}/`,
      });
      continue;
    }

    const relativePath = `${catDir}/${fileBase}.png`;
    const destPath = join(OUTPUT_DIR, catDir, `${fileBase}.png`);
    console.log(`  [${i + 1}/${total}] Downloading: ${relativePath}`);

    const result = await downloadWithRetry(downloadUrl, destPath);
    const finalRelPath = `${catDir}/${fileBase}${result.ext}`;
    if (result.ok) {
      stats.success++;
      if (result.ext !== '.png') {
        console.log(`    → saved as ${result.ext}`);
      }
    } else {
      stats.failed++;
      console.error(`    FAILED: ${relativePath}`);
    }

    manifest.push({
      id: asset.id,
      name: asset.name,
      category: asset.category,
      file: finalRelPath,
      sourceUrl: `${BASE_URL}/game_boy_advance/pokemonrubysapphire/sheet/${asset.id}/`,
    });

    // Rate limiting
    if (i < allAssets.length - 1) {
      await delay(DELAY_MS);
    }
  }

  // Write manifest
  await writeFile(
    join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(
      {
        source: LISTING_URL,
        downloadedAt: new Date().toISOString(),
        totalAssets: manifest.length,
        assets: manifest,
      },
      null,
      2,
    ),
  );

  console.log(`\nDone!`);
  console.log(`  ${stats.success} downloaded`);
  console.log(`  ${stats.skipped} skipped (already existed)`);
  console.log(`  ${stats.failed} failed`);
  console.log(`\nManifest written to resources/pokemon/manifest.json`);

  if (stats.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
