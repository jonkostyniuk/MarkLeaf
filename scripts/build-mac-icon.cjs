const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sourceLogo = path.join(root, "assets", "brand", "markleaf-logo-concept-2.svg");
const iconDir = path.join(root, "build", "icons");
const iconsetDir = path.join(iconDir, "markleaf.iconset");
const outputIcns = path.join(iconDir, "markleaf.icns");
const outputTiff = path.join(iconDir, "markleaf.tiff");
const iconSizes = [
  [16, "icon_16x16.png"],
  [32, "icon_16x16@2x.png"],
  [32, "icon_32x32.png"],
  [64, "icon_32x32@2x.png"],
  [128, "icon_128x128.png"],
  [256, "icon_128x128@2x.png"],
  [256, "icon_256x256.png"],
  [512, "icon_256x256@2x.png"],
  [512, "icon_512x512.png"],
  [1024, "icon_512x512@2x.png"]
];

if (!fs.existsSync(sourceLogo)) {
  throw new Error(`Icon source not found: ${sourceLogo}`);
}

fs.rmSync(iconsetDir, { recursive: true, force: true });
fs.rmSync(outputTiff, { force: true });
fs.rmSync(outputIcns, { force: true });
fs.mkdirSync(iconsetDir, { recursive: true });

for (const [size, fileName] of iconSizes) {
  run("magick", [
    sourceLogo,
    "-background",
    "none",
    "-resize",
    `${size}x${size}`,
    path.join(iconsetDir, fileName)
  ]);
}

run("iconutil", ["--convert", "icns", "--output", outputIcns, iconsetDir]);
console.log(`Created ${path.relative(root, outputIcns)}`);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}
