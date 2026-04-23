// scripts/fetchCdnResources.js
const axios = require('axios');
const fs = require('fs');

async function fetchCdnResources() {
  try {
    // Fetch CDN endpoints for optimized assets
    const response = await axios.get('https://cdn.example.com/api/v1/resources');
    const resources = response.data;

    // Save CDN configuration
    fs.writeFileSync('./cdn-config.json', JSON.stringify(resources, null, 2));

    // Generate preload tags
    const preloadTags = resources.map(resource =>
      `<link rel="preload" href="${resource.url}" as="${resource.type}">`
    ).join('\n    ');

    // Write preload script to HTML file
    const preloadScript = `
<!-- CDN Preload Tags -->
${preloadTags}
    `;

    fs.writeFileSync('./preload-script.html', preloadScript);
    console.log('\u2705 CDN resources fetched and preload script generated');

  } catch (error) {
    console.error('\u274c Failed to fetch CDN resources:', error.message);
    process.exit(1);
  }
}

fetchCdnResources();