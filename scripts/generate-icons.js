const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SVG_PATH = path.join(process.cwd(), "public", "icons", "logopicfoto.svg");
const PNG_FALLBACK = path.join(process.cwd(), "public", "icons", "logopicfoto-01.png");
const ICONS_DIR = path.join(process.cwd(), "public", "icons");

async function generate() {
  let source;
  try {
    source = sharp(fs.readFileSync(SVG_PATH));
    console.log("Using SVG source (Illustrator paths)");
  } catch {
    source = sharp(PNG_FALLBACK);
    console.log("Falling back to PNG source");
  }

  await source.clone().resize(192, 192).flatten({ background: "#FFFFFF" }).png().toFile(path.join(ICONS_DIR, "icon-192.png"));
  console.log("✓ icon-192.png");

  await source.clone().resize(512, 512).flatten({ background: "#FFFFFF" }).png().toFile(path.join(ICONS_DIR, "icon-512.png"));
  console.log("✓ icon-512.png");

  await source.clone().resize(128, 128).flatten({ background: "#FFFFFF" }).png().toFile(path.join(ICONS_DIR, "icon-128.png"));
  console.log("✓ icon-128.png");

  const logo154 = await source.clone().resize(154, 154).flatten({ background: "#FFFFFF" }).png().toBuffer();
  await sharp({
    create: { width: 192, height: 192, channels: 4, background: { r: 30, g: 64, b: 175, alpha: 1 } },
  })
    .composite([{ input: logo154, left: 19, top: 19 }])
    .png()
    .toFile(path.join(ICONS_DIR, "icon-maskable-192.png"));
  console.log("✓ icon-maskable-192.png");

  const logo410 = await source.clone().resize(410, 410).flatten({ background: "#FFFFFF" }).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 30, g: 64, b: 175, alpha: 1 } },
  })
    .composite([{ input: logo410, left: 51, top: 51 }])
    .png()
    .toFile(path.join(ICONS_DIR, "icon-maskable-512.png"));
  console.log("✓ icon-maskable-512.png");

  console.log("\nDone! Source: Illustrator SVG (paths, no text).");
}

generate().catch(console.error);
