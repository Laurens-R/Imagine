/**
 * Generates resources/icon.png (256×256) and resources/icon.ico from resources/icon.svg
 * Run: node scripts/generate-icons.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'resources', 'icon.svg');
const svgBuffer = readFileSync(svgPath);

// ── PNG sizes ────────────────────────────────────────────────────────────────
const SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

const pngBuffers = {};
for (const size of SIZES) {
  pngBuffers[size] = await sharp(svgBuffer).resize(size, size).png().toBuffer();
  console.log(`  PNG ${size}×${size}`);
}

// Save primary 512px PNG (used by macOS .icns builder and Linux)
writeFileSync(join(root, 'resources', 'icon.png'), pngBuffers[512]);
console.log('✓ resources/icon.png (512×512)');

// ── ICO (Windows) ────────────────────────────────────────────────────────────
// ICO format: file header + directory + image data for each size
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const images = icoSizes.map((s) => pngBuffers[s]);

function writeUint16LE(buf, offset, value) { buf.writeUInt16LE(value, offset); }
function writeUint32LE(buf, offset, value) { buf.writeUInt32LE(value, offset); }

const HEADER_SIZE = 6;
const DIR_ENTRY_SIZE = 16;
const headerAndDir = HEADER_SIZE + DIR_ENTRY_SIZE * images.length;

// Calculate total size
let totalSize = headerAndDir;
for (const img of images) totalSize += img.length;

const ico = Buffer.alloc(totalSize);

// File header
writeUint16LE(ico, 0, 0);        // reserved
writeUint16LE(ico, 2, 1);        // type = ICO
writeUint16LE(ico, 4, images.length);

// Directory entries
let dataOffset = headerAndDir;
for (let i = 0; i < images.length; i++) {
  const size = icoSizes[i];
  const imgBuf = images[i];
  const dirOff = HEADER_SIZE + i * DIR_ENTRY_SIZE;
  ico.writeUInt8(size >= 256 ? 0 : size, dirOff);     // width (0 = 256)
  ico.writeUInt8(size >= 256 ? 0 : size, dirOff + 1); // height
  ico.writeUInt8(0, dirOff + 2);  // colour count
  ico.writeUInt8(0, dirOff + 3);  // reserved
  writeUint16LE(ico, dirOff + 4, 1);   // colour planes
  writeUint16LE(ico, dirOff + 6, 32);  // bits per pixel
  writeUint32LE(ico, dirOff + 8, imgBuf.length);
  writeUint32LE(ico, dirOff + 12, dataOffset);
  dataOffset += imgBuf.length;
}

// Image data
let pos = headerAndDir;
for (const img of images) {
  img.copy(ico, pos);
  pos += img.length;
}

writeFileSync(join(root, 'resources', 'icon.ico'), ico);
console.log('✓ resources/icon.ico');
