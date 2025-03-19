const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const _ = require('lodash');

const BATCHSIZE = 30;
let SKIP = 0;

// Function to fetch and parse the HTML from the provided URL
async function fetchHTML(url) {
  try {
    const { data } = await axios.get(url, { headers: { "Cookie": "SER12_head2=0; SK_GYOUSHU=close; SHOUMEISID=mlehflck16shbatitptc1b9k67; _fbp=fb.1.1737531372859.576642795879494304; _pin_unauth=dWlkPVpqQXlabU13TWpBdE9XWmlZUzAwTW1NekxXRTRZamd0TjJWak5HVmlZMkU1WW1ZeA; _gcl_au=1.1.184322228.1737531375; _ga=GA1.1.1564657938.1737531375; _ga=GA1.3.1564657938.1737531375; _gid=GA1.3.768425913.1737531375; krt.vis=SozOxLz_ULbJg4f; _td_ssc_id=01JJ6F1FEGF5Q8C5V3RNPEH7DS; rt_storage_writable=true; rt_session_id=8ad855010aae4dfab9fdb0c0201d7669; rt_user_id=11da512e171d418491dd0320f507e112; OptanonAlertBoxClosed=2025-01-22T07:36:16.763Z; PHPSESSID=mv7j8gan5id90ticuiuqhbcrga; __ulfpc=202501221436224549; visitor_id888243=451792438; visitor_id888243-hash=fcd5121bf8a137b21a267afa5e7f136591ccf9b0a9f3bee8b77d11985efd29defbbb8ad17f635e7be53985354d052fc15482178a; _td=77b55e4b-bd3d-4a6b-aab2-116ce06fce3c; OptanonConsent=isGpcEnabled=0&datestamp=Wed+Jan+22+2025+14%3A40%3A02+GMT%2B0700+(Indochina+Time)&version=6.30.0&isIABGlobal=false&hosts=&consentId=4272a1a1-155b-4c73-a261-7073224214b4&interactionCount=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1%2CC0005%3A1%2CC0007%3A1&geolocation=VN%3BSG&AwaitingReconsent=false; _ga_MLHQR7NJQM=GS1.1.1737531374.1.1.1737532039.60.0.0" }});
    return cheerio.load(data);
  } catch (error) {
    console.error('Error fetching the HTML from URL:', url);
    throw error;
  }
}

// Function to download an image from a given URL and save it to a specified path
async function downloadImage(imageUrl, outputPath) {
  try {
    const response = await axios.get(imageUrl, { responseType: 'stream' });
    await pipeline(response.data, fs.createWriteStream(outputPath));
    // console.log(`Downloaded: ${outputPath}`);
  } catch (error) {
    console.error('Error downloading image:', imageUrl, outputPath);
  }
}

// Function to extract product data from the parsed HTML
async function extractProductData($, url) {
  const map = new Map();

  // Loop through each row in the table
  const rows = $('table.search-result-table:not(.search-result-table-dl) tbody tr');
  console.log('total rows: ', rows.length);
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

  console.log('divided into: ', map.size, ' clusters');

  return map;
}

// Function to process each product detail page
async function processProductDetail(productDetailUrl, productNumber) {
  const $ = await fetchHTML(productDetailUrl);
  if (productNumber.search(/\+/) !== -1) {
    const newLink = new URL($('#wrapper > section.product.clr.alphaOver > div.info > dl > dt:nth-child(6) > a').attr('href'), productDetailUrl).href;
    return processProductDetail(newLink, 'LAYER2');
  }
  let productCode = $('.productName.pc_contents h1').text().trim().replace(/\([^(]*\([^)]*\)[^(]*\)|\([^)]*\)$/, '').trim();
  if (productCode) {
    // Split on '+' and keep only the last segment
    const segments = productCode.split('+');
    productCode = segments[segments.length - 1].trim();
  }
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
    console.log('=> Start download from ', url);
    const $ = await fetchHTML(url);
    console.log('=> Done download from, start process ', url);

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
      if (SKIP && clusterIndex <= SKIP) {
        clusterIndex++;
        continue;
      }

      const clusterFolder = path.join(clustersDir, `cluster_${clusterIndex}`);
      fs.mkdirSync(clusterFolder, { recursive: true });

      const previewImagePath = path.join(clusterFolder, 'origin.jpg');
      await downloadImage(previewImageUrl, previewImagePath);

      const productsBatchList = _.chunk(products, BATCHSIZE);
      for (const productsBatch of productsBatchList) {
        const productPromises = productsBatch.map(async (product) => {
          try {
            const { productNumber, detailLink } = product;
            const { productCode, originalImageUrl } = await processProductDetail(detailLink, productNumber);
            const originalImagePath = path.join(clusterFolder, `${productCode}.jpg`);
            await downloadImage(originalImageUrl, originalImagePath);
          } catch {

          }
          return true;
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