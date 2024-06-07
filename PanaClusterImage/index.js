const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const _ = require('lodash');

const BATCHSIZE = 20;

// Function to fetch and parse the HTML from the provided URL
async function fetchHTML(url) {
  try {
    const { data } = await axios.get(url);
    return cheerio.load(data);
  } catch (error) {
    console.error('Error fetching the HTML:', error);
    throw error;
  }
}

// Function to download an image from a given URL and save it to a specified path
async function downloadImage(imageUrl, outputPath) {
  try {
    const response = await axios.get(imageUrl, { responseType: 'stream' });
    await pipeline(response.data, fs.createWriteStream(outputPath));
    console.log(`Downloaded: ${outputPath}`);
  } catch (error) {
    console.error('Error downloading image:', error);
  }
}

// Function to extract product data from the parsed HTML
async function extractProductData($, url) {
  const map = new Map();

  // Loop through each row in the table
  const rows = $('table.search-result-table:not(.search-result-table-dl) tbody tr');
  for (let i = 0; i < rows.length; i++) {
    const row = rows.eq(i);
    const productNumber = row.find('td.col1-3 div.detail1 p.hinban a').text().trim();
    const previewImageUrl = new URL(row.find('td.col1-2 a').attr('href'), url).href;
    const detailLink = new URL(row.find('td.col1-3 div.detail1 p.hinban a').attr('href'), url).href;

    if (!map.has(previewImageUrl)) {
      map.set(previewImageUrl, []);
    }
    map.get(previewImageUrl).push({ productNumber, detailLink });
  }

  return map;
}

// Function to process each product detail page
async function processProductDetail(productDetailUrl) {
  const $ = await fetchHTML(productDetailUrl);
  const productCode = $('.productName.pc_contents h1').text().replace(/\s/g, '');
  const originalImageUrl = new URL($('div[data-type="小組-JPEG"] a.type').attr('href'), productDetailUrl).href;
  return { productCode, originalImageUrl };
}

async function main() {
  if (!process.env.LINK) {
    console.error('Please provide the URL as an environment variable LINK');
    process.exit(1);
  }
  const url = 
  process.env.LINK
  + '&view_list=12000'; // extend page limit

  try {
    const $ = await fetchHTML(url);

    // Extract the search condition text
    const pElement = $('.search-cond-text');
    let spanTexts = [];
    pElement.find('span').each((index, element) => {
      spanTexts.push($(element).text());
    });
    let titleOfCategory = spanTexts.join(' ');
    const clustersDir = path.join(__dirname, titleOfCategory);
    fs.mkdirSync(clustersDir, { recursive: true });

    const map = await extractProductData($, url);

    let clusterIndex = 1;
    for (const [previewImageUrl, products] of map) {
      const clusterFolder = path.join(clustersDir, `cluster_${clusterIndex}`);
      fs.mkdirSync(clusterFolder, { recursive: true });

      const previewImagePath = path.join(clusterFolder, 'origin.jpg');
      await downloadImage(previewImageUrl, previewImagePath);

      const productsBatchList = _.chunk(products, BATCHSIZE);
      for (const productsBatch of productsBatchList) {
        const productPromises = productsBatch.map(async (product) => {
          const { productNumber, detailLink } = product;
          const { productCode, originalImageUrl } = await processProductDetail(detailLink);
          const originalImagePath = path.join(clusterFolder, `${productCode}.jpg`);
          await downloadImage(originalImageUrl, originalImagePath);
        });
  
        await Promise.all(productPromises);
      }
      
      clusterIndex++;
    }

    console.log('Finished processing all products.');
  } catch (error) {
    console.error('Error processing the HTML:', error);
  }
}

// Execute the main function
main();