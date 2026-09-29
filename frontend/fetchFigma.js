// One-off dev script: pulls a Figma file's layout for design reference.
// Run with: FIGMA_TOKEN=... FIGMA_FILE_KEY=... node fetchFigma.js
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FIGMA_FILE_KEY;

if (!FIGMA_TOKEN || !FILE_KEY) {
  console.error('Set FIGMA_TOKEN and FIGMA_FILE_KEY (in frontend/.env.local or the environment) before running this script.');
  process.exit(1);
}

const options = {
  hostname: 'api.figma.com',
  path: `/v1/files/${FILE_KEY}`,
  method: 'GET',
  headers: {
    'X-Figma-Token': FIGMA_TOKEN
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log("Figma API Response Status:", res.statusCode);
      if (json.document) {
        // Just extract top level nodes and some basic info to avoid massive logs
        const pages = json.document.children;
        pages.forEach(page => {
          console.log(`Page: ${page.name}`);
          if (page.children) {
            page.children.forEach(frame => {
              console.log(`  Frame: ${frame.name}`);
              console.log(`    AbsoluteBoundingBox:`, frame.absoluteBoundingBox);
              if (frame.children) {
                frame.children.forEach(child => {
                  console.log(`    Child: ${child.name} - ${child.type}`);
                  console.log(`      Box:`, child.absoluteBoundingBox);
                  if (child.type === 'TEXT') {
                     console.log(`      Text: "${child.characters}"`);
                     console.log(`      Style:`, child.style);
                  }
                });
              }
            });
          }
        });
      } else {
        console.log(json);
      }
    } catch (e) {
      console.error(e);
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
