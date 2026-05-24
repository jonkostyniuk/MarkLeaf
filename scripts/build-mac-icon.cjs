const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sourcePng = path.join(root, "assets", "brand", "markleaf-logo-concept-1.png");
const iconDir = path.join(root, "build", "icons");
const iconsetDir = path.join(iconDir, "markleaf.iconset");
const outputTiff = path.join(iconDir, "markleaf.tiff");
const outputIcns = path.join(iconDir, "markleaf.icns");

if (!fs.existsSync(sourcePng)) {
  throw new Error(`Icon source PNG not found: ${sourcePng}`);
}

fs.rmSync(iconsetDir, { recursive: true, force: true });
fs.rmSync(outputTiff, { force: true });

run("sips", ["-s", "format", "tiff", "-z", "1024", "1024", sourcePng, "--out", outputTiff]);
run("tiff2icns", [outputTiff, outputIcns]);
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
