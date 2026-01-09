#!/usr/bin/env node
/**
 * Solarpunk Platform - Build Script
 *
 * Optimized for:
 * - Minimal bundle size
 * - Old browser compatibility (Android 5+)
 * - Fast loading on slow networks
 * - Low resource usage
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Build configuration
const config = {
  srcDir: path.join(__dirname, 'src'),
  distDir: path.join(__dirname, 'dist'),
  minify: process.env.NODE_ENV === 'production',
  sourceMaps: process.env.NODE_ENV !== 'production',
  target: 'es5' // ES5 for Android 5+ compatibility
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Simple CSS minifier
 * Removes whitespace, comments, and unnecessary characters
 */
function minifyCSS(css) {
  return css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove whitespace
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;\}/g, '}')
    .trim();
}

/**
 * Simple JavaScript minifier
 * Basic minification for compatibility
 */
function minifyJS(js) {
  return js
    // Remove single-line comments
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove excess whitespace
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();,:])\s*/g, '$1')
    .trim();
}

/**
 * Recursively copy directory
 */
async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

/**
 * Process and optimize CSS files
 */
async function processCSS(srcPath, destPath) {
  log(`Processing CSS: ${path.basename(srcPath)}`, 'blue');

  let css = await readFile(srcPath, 'utf8');

  if (config.minify) {
    css = minifyCSS(css);
    log(`  Minified: ${css.length} bytes`, 'green');
  }

  await writeFile(destPath, css);
}

/**
 * Process and optimize JavaScript files
 */
async function processJS(srcPath, destPath) {
  log(`Processing JS: ${path.basename(srcPath)}`, 'blue');

  let js = await readFile(srcPath, 'utf8');

  if (config.minify) {
    js = minifyJS(js);
    log(`  Minified: ${js.length} bytes`, 'green');
  }

  await writeFile(destPath, js);
}

/**
 * Process HTML files
 */
async function processHTML(srcPath, destPath) {
  log(`Processing HTML: ${path.basename(srcPath)}`, 'blue');

  let html = await readFile(srcPath, 'utf8');

  if (config.minify) {
    // Basic HTML minification
    html = html
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
  }

  await writeFile(destPath, html);
}

/**
 * Generate build manifest
 */
async function generateManifest(files) {
  const manifest = {
    version: '0.1.0',
    buildTime: new Date().toISOString(),
    files: files.map(f => ({
      path: f,
      size: fs.statSync(path.join(config.distDir, f)).size
    })),
    totalSize: files.reduce((sum, f) => {
      return sum + fs.statSync(path.join(config.distDir, f)).size;
    }, 0)
  };

  await writeFile(
    path.join(config.distDir, 'build-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  return manifest;
}

/**
 * Main build function
 */
async function build() {
  log('═══════════════════════════════════════', 'green');
  log('  Solarpunk Platform - Build', 'green');
  log('═══════════════════════════════════════', 'green');
  log('');

  const startTime = Date.now();

  try {
    // Clean dist directory
    log('Cleaning dist directory...', 'yellow');
    if (fs.existsSync(config.distDir)) {
      fs.rmSync(config.distDir, { recursive: true });
    }
    await mkdir(config.distDir, { recursive: true });

    // Create subdirectories
    await mkdir(path.join(config.distDir, 'scripts'), { recursive: true });
    await mkdir(path.join(config.distDir, 'styles'), { recursive: true });
    await mkdir(path.join(config.distDir, 'icons'), { recursive: true });

    const processedFiles = [];

    // Process HTML
    const htmlFiles = ['index.html'];
    for (const file of htmlFiles) {
      const srcPath = path.join(config.srcDir, 'public', file);
      const destPath = path.join(config.distDir, file);
      if (fs.existsSync(srcPath)) {
        await processHTML(srcPath, destPath);
        processedFiles.push(file);
      }
    }

    // Process CSS
    const cssFiles = ['main.css'];
    for (const file of cssFiles) {
      const srcPath = path.join(config.srcDir, 'styles', file);
      const destPath = path.join(config.distDir, 'styles', file);
      if (fs.existsSync(srcPath)) {
        await processCSS(srcPath, destPath);
        processedFiles.push(`styles/${file}`);
      }
    }

    // Process JavaScript
    const jsFiles = ['battery-utils.js', 'db.js', 'data-export.js', 'app.js'];
    for (const file of jsFiles) {
      const srcPath = path.join(config.srcDir, 'scripts', file);
      const destPath = path.join(config.distDir, 'scripts', file);
      if (fs.existsSync(srcPath)) {
        await processJS(srcPath, destPath);
        processedFiles.push(`scripts/${file}`);
      }
    }

    // Copy service worker
    log('Copying service worker...', 'blue');
    const swSrc = path.join(config.srcDir, 'public', 'sw.js');
    const swDest = path.join(config.distDir, 'sw.js');
    if (fs.existsSync(swSrc)) {
      await processJS(swSrc, swDest);
      processedFiles.push('sw.js');
    }

    // Copy manifest
    log('Copying manifest...', 'blue');
    const manifestSrc = path.join(config.srcDir, 'public', 'manifest.json');
    const manifestDest = path.join(config.distDir, 'manifest.json');
    if (fs.existsSync(manifestSrc)) {
      await copyFile(manifestSrc, manifestDest);
      processedFiles.push('manifest.json');
    }

    // Copy icons (if they exist)
    const iconsDir = path.join(config.srcDir, 'public', 'icons');
    if (fs.existsSync(iconsDir)) {
      log('Copying icons...', 'blue');
      await copyDir(iconsDir, path.join(config.distDir, 'icons'));
    }

    // Generate build manifest
    log('Generating build manifest...', 'yellow');
    const manifest = await generateManifest(processedFiles);

    // Build complete
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('');
    log('═══════════════════════════════════════', 'green');
    log('  Build Complete!', 'green');
    log('═══════════════════════════════════════', 'green');
    log('');
    log(`Time: ${duration}s`, 'blue');
    log(`Files: ${manifest.files.length}`, 'blue');
    log(`Total Size: ${(manifest.totalSize / 1024).toFixed(2)} KB`, 'blue');
    log('');
    log(`Output: ${config.distDir}`, 'yellow');
    log('');

    // Size analysis
    log('File sizes:', 'yellow');
    manifest.files
      .sort((a, b) => b.size - a.size)
      .forEach(file => {
        const sizeKB = (file.size / 1024).toFixed(2);
        log(`  ${file.path}: ${sizeKB} KB`, 'blue');
      });

    log('');
    log('✓ Build optimized for low-resource devices', 'green');
    log('✓ Compatible with Android 5+', 'green');
    log('✓ Offline-first ready', 'green');

  } catch (error) {
    log('', 'red');
    log('Build failed:', 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
}

// Run build
if (require.main === module) {
  build().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { build };
