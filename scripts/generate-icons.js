import fs from 'fs';
import zlib from 'zlib';

function createCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(width, height) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Gradient background from emerald-600 (5, 150, 105) to teal-600 (13, 148, 136)
      const t = (x + y) / (width + height);
      let r = Math.round(5 + t * 8);
      let g = Math.round(150 - t * 2);
      let b = Math.round(105 + t * 31);
      let a = 255;

      // Corner radius rounding
      const radius = width * 0.22;
      let inCorner = false;
      let dx = 0;
      let dy = 0;

      if (x < radius && y < radius) {
        dx = radius - x;
        dy = radius - y;
        inCorner = true;
      } else if (x > width - radius && y < radius) {
        dx = x - (width - radius);
        dy = radius - y;
        inCorner = true;
      } else if (x < radius && y > height - radius) {
        dx = radius - x;
        dy = y - (height - radius);
        inCorner = true;
      } else if (x > width - radius && y > height - radius) {
        dx = x - (width - radius);
        dy = y - (height - radius);
        inCorner = true;
      }

      if (inCorner && (dx * dx + dy * dy > radius * radius)) {
        a = 0; // transparent outside rounded corner
      }

      // Draw stylized white symbol in center
      const cx = width / 2;
      const cy = height / 2;
      const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      if (distFromCenter < width * 0.28 && a > 0) {
        // Inner badge
        r = 255;
        g = 255;
        b = 255;
      }

      if (distFromCenter < width * 0.22 && a > 0) {
        // Gold coin center
        r = 245;
        g = 158;
        b = 11;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

fs.writeFileSync('public/pwa-192x192.png', createPng(192, 192));
fs.writeFileSync('public/pwa-512x512.png', createPng(512, 512));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPng(512, 512));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180));

console.log('PWA PNG icons generated successfully in public/');
