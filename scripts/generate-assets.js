const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, '..', 'assets');

// 1. Master Icon (1024x1024)
// Cream bg (#FFFDF5), 44px border frame, bold geometric 'T' with rotated yellow neo-accent sticker behind it
const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Cream Base Canvas -->
  <rect width="1024" height="1024" fill="#FFFDF5"/>
  
  <!-- Outer Neo-brutalism Sticker Border Frame -->
  <rect x="52" y="52" width="920" height="920" rx="160" fill="none" stroke="#000000" stroke-width="40"/>
  
  <!-- Shadow for Accent Sticker -->
  <rect x="560" y="320" width="230" height="230" rx="28" fill="#000000" transform="rotate(12 675 435)"/>
  <!-- Neo Accent Sticker (Vibrant Yellow #FFE600 with black border) -->
  <rect x="546" y="306" width="230" height="230" rx="28" fill="#FFE600" stroke="#000000" stroke-width="24" transform="rotate(12 661 421)"/>
  
  <!-- Neo Shadow for "T" glyph -->
  <path d="M 280 286 L 744 286 L 744 430 L 588 430 L 588 806 L 436 806 L 436 430 L 280 430 Z" fill="#000000" transform="translate(18, 18)"/>
  
  <!-- Solid Black Geometric "T" Glyph (Space Grotesk 900 heavy proportions) -->
  <path d="M 280 286 L 744 286 L 744 430 L 588 430 L 588 806 L 436 806 L 436 430 L 280 430 Z" fill="#000000"/>
</svg>
`;

// 2. Android Adaptive Icon Foreground (1024x1024, centered in safe-zone ~66%, transparent background)
const adaptiveForegroundSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Shadow for Accent Sticker -->
  <rect x="550" y="350" width="180" height="180" rx="24" fill="#000000" transform="rotate(12 640 440)"/>
  <!-- Neo Accent Sticker (Yellow #FFE600) -->
  <rect x="538" y="338" width="180" height="180" rx="24" fill="#FFE600" stroke="#000000" stroke-width="20" transform="rotate(12 628 428)"/>
  
  <!-- Neo Shadow for "T" glyph -->
  <path d="M 330 330 L 694 330 L 694 440 L 572 440 L 572 730 L 452 730 L 452 440 L 330 440 Z" fill="#000000" transform="translate(14, 14)"/>
  <!-- Solid Black "T" Glyph -->
  <path d="M 330 330 L 694 330 L 694 440 L 572 440 L 572 730 L 452 730 L 452 440 L 330 440 Z" fill="#000000"/>
</svg>
`;

// 3. Splash Screen (1284x2778, Cream #FFFDF5, centered Neo-brutalist "TEMPO" wordmark rotated -1deg with drop shadow)
const splashSvg = `
<svg width="1284" height="2778" viewBox="0 0 1284 2778" xmlns="http://www.w3.org/2000/svg">
  <!-- Cream Base Background -->
  <rect width="1284" height="2778" fill="#FFFDF5"/>
  
  <g transform="translate(642, 1389) rotate(-1)">
    <!-- Neo-brutalist Wordmark Sticker Container Shadow -->
    <rect x="-350" y="-120" width="700" height="240" rx="32" fill="#000000" transform="translate(16, 16)"/>
    <!-- Sticker Container Box (Vibrant Yellow #FFE600 with 16px black border) -->
    <rect x="-350" y="-120" width="700" height="240" rx="32" fill="#FFE600" stroke="#000000" stroke-width="20"/>
    
    <!-- Bold "TEMPO" Text in Space Grotesk / Heavy Neo Style -->
    <text x="0" y="32" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="120" fill="#000000" text-anchor="middle" letter-spacing="12">TEMPO</text>
  </g>
</svg>
`;

// 4. Favicon (48x48 rasterized, crisp bold "T" with accent on cream)
const faviconSvg = `
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="24" fill="#FFFDF5"/>
  <rect x="74" y="36" width="34" height="34" rx="6" fill="#FFE600" stroke="#000000" stroke-width="4"/>
  <path d="M 28 32 L 100 32 L 100 52 L 74 52 L 74 100 L 54 100 L 54 52 L 28 52 Z" fill="#000000"/>
</svg>
`;

async function generateAssets() {
  console.log('Generating assets...');

  // 1. icon.png (1024x1024)
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('✓ assets/icon.png created');

  // 2. adaptive-icon-foreground.png (1024x1024)
  await sharp(Buffer.from(adaptiveForegroundSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon-foreground.png'));
  console.log('✓ assets/adaptive-icon-foreground.png created');

  // 3. splash.png (1284x2778)
  await sharp(Buffer.from(splashSvg))
    .resize(1284, 2778)
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  console.log('✓ assets/splash.png created');

  // Also update splash-icon.png for Expo compatibility
  await sharp(Buffer.from(iconSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('✓ assets/splash-icon.png created');

  // 4. favicon.png (48x48)
  await sharp(Buffer.from(faviconSvg))
    .resize(48, 48)
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('✓ assets/favicon.png created');

  console.log('All assets generated successfully!');
}

generateAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
