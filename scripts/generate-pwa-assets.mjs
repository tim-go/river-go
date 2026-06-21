// Generates the PWA icon set + the full iOS splash matrix from assets/icon.svg.
// Run with: node scripts/generate-pwa-assets.mjs
import sharp from "sharp";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";

const SRC = "assets/icon.svg";
const OUT = "public";
const BG = "#060a1a"; // Surge navy — matches manifest background_color
const svg = readFileSync(SRC);

mkdirSync(OUT, { recursive: true });

// Re-rasterise the source SVG crisply at each requested size.
const render = (size) =>
  sharp(svg, { density: 384 }).resize(size, size, { fit: "contain" });

// device CSS width/height + devicePixelRatio → portrait launch-image px is dw*r × dh*r.
const DEVICES = [
  { dw: 430, dh: 932, r: 3 }, // iPhone 15/16 Pro Max, 14 Pro Max
  { dw: 393, dh: 852, r: 3 }, // iPhone 15/16, 16 Pro, 14 Pro
  { dw: 428, dh: 926, r: 3 }, // iPhone 13/12 Pro Max, 14 Plus
  { dw: 390, dh: 844, r: 3 }, // iPhone 13/12, 13/12 Pro, 14
  { dw: 375, dh: 812, r: 3 }, // iPhone X/XS/11 Pro, 12/13 mini
  { dw: 414, dh: 896, r: 3 }, // iPhone XS Max, 11 Pro Max
  { dw: 414, dh: 896, r: 2 }, // iPhone XR, 11
  { dw: 375, dh: 667, r: 2 }, // iPhone SE 2/3, 8, 7, 6s
  { dw: 414, dh: 736, r: 3 }, // iPhone 8/7/6s Plus
  { dw: 320, dh: 568, r: 2 }, // iPhone SE 1
  { dw: 768, dh: 1024, r: 2 }, // iPad 9.7, mini, Air
  { dw: 810, dh: 1080, r: 2 }, // iPad 10.2
  { dw: 820, dh: 1180, r: 2 }, // iPad Air 10.9
  { dw: 834, dh: 1112, r: 2 }, // iPad Pro 10.5
  { dw: 834, dh: 1194, r: 2 }, // iPad Pro 11
  { dw: 744, dh: 1133, r: 2 }, // iPad mini 8.3
  { dw: 1024, dh: 1366, r: 2 }, // iPad Pro 12.9
];

async function main() {
  // Icons (full-bleed gradient → works for any + maskable)
  await render(192).png().toFile(`${OUT}/pwa-192x192.png`);
  await render(512).png().toFile(`${OUT}/pwa-512x512.png`);
  await render(512).png().toFile(`${OUT}/pwa-maskable-512x512.png`);
  await render(180).flatten({ background: BG }).png().toFile(`${OUT}/apple-touch-icon.png`);
  await render(32).png().toFile(`${OUT}/favicon-32x32.png`);
  copyFileSync(SRC, `${OUT}/favicon.svg`);
  copyFileSync(SRC, `${OUT}/icon.svg`);

  // iOS splash screens (portrait + landscape) + their <link> media queries
  const links = [];
  for (const { dw, dh, r } of DEVICES) {
    const pw = dw * r;
    const ph = dh * r;
    for (const orientation of ["portrait", "landscape"]) {
      const [w, h] = orientation === "portrait" ? [pw, ph] : [ph, pw];
      const iconSize = Math.round(Math.min(w, h) * 0.38);
      const icon = await render(iconSize).png().toBuffer();
      const file = `apple-splash-${w}-${h}.png`;
      await sharp({
        create: { width: w, height: h, channels: 4, background: BG },
      })
        .composite([{ input: icon, gravity: "center" }])
        .png()
        .toFile(`${OUT}/${file}`);
      links.push(
        `    <link rel="apple-touch-startup-image" media="screen and (device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: ${orientation})" href="/${file}" />`,
      );
    }
  }
  writeFileSync("assets/apple-splash-links.html", links.join("\n") + "\n");
  console.log(`Generated icons + ${links.length} iOS splash images.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
