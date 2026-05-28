const fs = require("fs");
const path = require("path");
const root = process.cwd();
const dist = path.join(root, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith(".html"));
for (const file of htmlFiles) {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
}
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.statSync(srcPath).isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}
copyDir(path.join(root, "assets"), path.join(dist, "assets"));
copyDir(path.join(root, "public"), dist);
console.log("Static build complete.");
