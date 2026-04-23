// scripts/preloadAssets.js
const fs = require('fs');

function preloadAssets() {
  try {
    // Read CDN configuration if exists
    const cdnConfig = fs.existsSync('./cdn-config.json')
      ? JSON.parse(fs.readFileSync('./cdn-config.json', 'utf8'))
      : [];

    // Generate optimized preload strategy
    const preloadStrategy = {
      critical: cdnConfig.filter(r => r.priority === 'critical'),
      high: cdnConfig.filter(r => r.priority === 'high'),
      medium: cdnConfig.filter(r => r.priority === 'medium'),
      low: cdnConfig.filter(r => r.priority === 'low')
    };

    // Write preload strategy
    fs.writeFileSync('./preload-strategy.json', JSON.stringify(preloadStrategy, null, 2));

    // Generate HTML preload script
    const htmlPreload = `
<!-- Critical Assets (preloaded immediately) -->
${preloadStrategy.critical.map(asset =>
  `<link rel="preload" href="${asset.url}" as="${asset.type}" crossorigin>`
).join('\n  ')}

<!-- High Priority Assets (preloaded after DOM ready) -->
${preloadStrategy.high.map(asset =>
  `<link rel="preload" href="${asset.url}" as="${asset.type}" onload="this.rel='stylesheet'">`
).join('\n  ')}

<!-- Medium Priority Assets (lazy loaded) -->
${preloadStrategy.medium.map(asset =>
  `<link rel="preload" href="${asset.url}" as="${asset.type}" fetchpriority="low">`
).join('\n  ')}
    `;

    fs.writeFileSync('./preload.html', htmlPreload);
    console.log('\u2705 Preload strategy generated');

  } catch (error) {
    console.error('\u274c Failed to generate preload strategy:', error.message);
    process.exit(1);
  }
}

preloadAssets();