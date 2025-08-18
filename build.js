const fs = require('fs');
const path = require('path');
require('dotenv').config();  // Load .env

console.log('ENV:', process.env.CLIENT_ID);

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

function processDirectory(currentPath) {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(currentPath, entry.name);
    const relativePath = path.relative(srcDir, srcPath);
    const destPath = path.join(distDir, relativePath);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      processDirectory(srcPath); // Recurse into subdirectory
    } else {
      // Only process files with these extensions
      if (path.extname(entry.name).match(/\.(js|html|css|json)$/)) {
        let content = fs.readFileSync(srcPath, 'utf8');
        content = content.replace(
          /CLIENT_ID_PLACEHOLDER/g,
          process.env.CLIENT_ID
        );
        fs.writeFileSync(destPath, content, 'utf8');
      } else {
        // Copy binary or other files as-is
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

processDirectory(srcDir);
console.log('✅ Build complete! All files processed in:', srcDir);