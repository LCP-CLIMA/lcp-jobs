import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function png(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function draw(size, pad = 0) {
  const data = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  };
  const rect = (x0, y0, x1, y1, color) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, ...color);
  };
  const S = (n) => Math.round(pad + ((size - pad * 2) * n) / 100);
  rect(0, 0, size, size, [27, 67, 50]);
  rect(S(14), S(18), S(86), S(40), [251, 246, 236]);
  rect(S(20), S(24), S(58), S(30), [198, 134, 42]);
  rect(S(28), S(50), S(72), S(86), [232, 194, 122]);
  for (let i = 0; i < 4; i++) rect(S(34), S(56 + i * 7), S(66), S(59 + i * 7), [27, 67, 50]);
  return data;
}

mkdirSync("public", { recursive: true });
writeFileSync("public/apple-touch-icon.png", png(180, draw(180)));
writeFileSync("public/pwa-192.png", png(192, draw(192)));
writeFileSync("public/pwa-512.png", png(512, draw(512)));
writeFileSync("public/pwa-512-maskable.png", png(512, draw(512, 56)));
