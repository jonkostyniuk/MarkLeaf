const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const renderer = path.join(dist, "renderer");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(renderer, { recursive: true });

fs.copyFileSync(path.join(root, "src", "styles.css"), path.join(renderer, "styles.css"));

fs.writeFileSync(
  path.join(dist, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MarkLeaf</title>
    <link rel="stylesheet" href="./renderer/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./renderer/app.js"></script>
  </body>
</html>
`
);

esbuild.buildSync({
  entryPoints: [path.join(root, "src", "app.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome120"],
  outfile: path.join(renderer, "app.js"),
  sourcemap: true,
  logLevel: "info"
});
