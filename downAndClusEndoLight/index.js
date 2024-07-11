const cheerio = require('cheerio');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const { URL } = require('url');

// Read the HTML string from a file
const htmlString = fs.readFileSync('./table.html', 'utf-8');

// Base URL to resolve relative paths
const baseURL = 'https://data2.endo-lighting.co.jp/endo_toolbox.jsp';

const downloadImage = async (url, filepath) => {
  const response = await axios({
    maxContentLength: Infinity,
    url,
    responseType: 'arraybuffer'
  });
  await fs.outputFile(filepath, response.data);
};

const getImageHash = async (url) => {
  const response = await axios({
    url,
    responseType: 'arraybuffer'
  });
  const image = await sharp(response.data).resize(8, 8).greyscale().raw().toBuffer();
  const avg = image.reduce((a, b) => a + b, 0) / image.length;
  return image.map(v => (v > avg ? 1 : 0)).join('');
};

const processHTML = async (html) => {
  const $ = cheerio.load(html);
  const productRows = $('table#maintb>tbody>tr').filter((i, el) => i % 2 === 0); // Select product rows (even rows)
  console.log('🚀 ~ processHTML ~ productRows:', productRows.length)
  const clusters = {};
  let clusterCount = 0;

  for (let i = 0; i < productRows.length; i++) {
    const productRow = $(productRows[i]);

    // Use direct child selectors to avoid nested table elements
    const previewImageRelativeUrl = productRow.children('td').eq(1).find('a').attr('href');
    console.log('🚀 ~ processHTML ~ previewImageRelativeUrl:', previewImageRelativeUrl)
    const detailImageRelativeUrl = productRow.children('td').eq(2).find('a').attr('href');

    let clusterDir;
    if (previewImageRelativeUrl) {
      // Resolve relative URLs to absolute URLs
      const previewImageUrl = new URL(previewImageRelativeUrl, baseURL).href;
      const previewImageHash = await getImageHash(previewImageUrl);

      if (clusters[previewImageHash]) {
        clusterDir = clusters[previewImageHash];
      } else {
        clusterCount++;
        clusterDir = `cluster${clusterCount}`;
        clusters[previewImageHash] = clusterDir;
        await fs.ensureDir(clusterDir);
        await downloadImage(previewImageUrl, path.join(clusterDir, 'original.jpg'));
      }
    } else {
      // Special cluster for products without a preview image
      clusterDir = 'cluster_no_img';
      if (!clusters[clusterDir]) {
        clusters[clusterDir] = clusterDir;
        await fs.ensureDir(clusterDir);
      }
    }

    if (detailImageRelativeUrl) {
      const detailImageUrl = new URL(detailImageRelativeUrl, baseURL).href;
      const detailImageName = path.basename(detailImageUrl);
      await downloadImage(detailImageUrl, path.join(clusterDir, detailImageName));
    }
  }
};

(async () => {
  try {
    await processHTML(htmlString);
    console.log('Images have been clustered and downloaded.');
  } catch (error) {
    console.error('Error processing HTML:', error);
  }
})();