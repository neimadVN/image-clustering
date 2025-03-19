const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// Helper function to fetch and parse links for a single product ID
async function fetchLinks(productId) {
  // We'll use this URL both for fetching and as the base when constructing absolute links
  const url = `https://www2.panasonic.biz/jp/catalog/lighting/products/search/keyword/result.php?at=keyword&st=shouhin&vt=new&ch_seisan_fg=1&ct=zentai&keyword=${productId}`;

  const links = [];
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    $('#wrapper table > tbody > tr div.detail1 > p.hinban > a').each((_, element) => {
      const anchorText = $(element).text().trim();
      if (productId.includes(anchorText)) {
        const href = $(element).attr('href') || '';
        // Create an absolute URL based on the "url" we used for the request
        const absoluteUrl = new URL(href, url).href;
        links.push(absoluteUrl);
      }
    });
  } catch (err) {
    console.error(`Error fetching/parsing data for product ID: ${productId}`, err);
  }

  return links;
}

(async function main() {
  const productIDs = [
    "NEL4100EDLA9",
    "NEL4100EDLE9",
    "NEL4100ELLA9",
    "NEL4100ELLE9",
    "NEL4100ENLA9",
    "NEL4100ENLE9",
    "NEL4100EVLA9",
    "NEL4100EVLE9",
    "NEL4100EWLA9",
    "NEL4100EWLE9",
    "NEL4200EDLA9",
    "NEL4200EDLE9",
    "NEL4200ELLA9",
    "NEL4200ELLE9",
    "NEL4200ENLA9",
    "NEL4200ENLE9",
    "NEL4200EVLA9",
    "NEL4200EVLE9",
    "NEL4200EWLA9",
    "NEL4200EWLE9",
    "NEL4300EDLA9",
    "NEL4300EDLE9",
    "NEL4300ELLA9",
    "NEL4300ELLE9",
    "NEL4300ENLA9",
    "NEL4300ENLE9",
    "NEL4300EVLA9",
    "NEL4300EVLE9",
    "NEL4300EWLA9",
    "NEL4300EWLE9",
    "NEL4400EDLA9",
    "NEL4400EDLE9",
    "NEL4400ELLA9",
    "NEL4400ELLE9",
    "NEL4400ENLA9",
    "NEL4400ENLE9",
    "NEL4400EVLA9",
    "NEL4400EVLE9",
    "NEL4400EWLA9",
    "NEL4400EWLE9",
    "NEL4400HNLA9",
    "NEL4400HNLE9",
    "NEL4400HVLA9",
    "NEL4400HVLE9",
    "NEL4400HWLA9",
    "NEL4400HWLE9",
    "NEL4500EDLE9",
    "NEL4500EDLR9",
    "NEL4500ELLE9",
    "NEL4500ELLR9",
    "NEL4500ENLE9",
    "NEL4500ENLR9",
    "NEL4500EVLE9",
    "NEL4500EVLR9",
    "NEL4500EWLE9",
    "NEL4500EWLR9",
    "NEL4600EDLE9",
    "NEL4600EDLR9",
    "NEL4600ELLE9",
    "NEL4600ELLR9",
    "NEL4600ENLE9",
    "NEL4600ENLR9",
    "NEL4600EVLE9",
    "NEL4600EVLR9",
    "NEL4600EWLE9",
    "NEL4600EWLR9",
    "NNL4100ENTDZ9",
    "NNL4200ENTDZ9",
    "NNL4300CNTLE9",
    "NNL4300ENTDZ9",
    "NNL4300EXJDK9",
    "NNL4300EXJRK9",
    "NNL4300EXJRM9",
    "NNL4300WNZLA9",
    "NNL4400ENPDZ9",
    "NNL4400WNZLA9",
    "NNL4500CNTLE9",
    "NNL4500ENTDZ9",
    "NNL4500EXJDK9",
    "NNL4500HNPDZ9",
    "NNL4500WNZLR9",
    "NNL4600CNTLE9",
    "NNL4600ENTDZ9",
    "NNL4600EXJDK9",
    "NNL4600EXJRK9",
    "NNL4600EXJRM9",
    "NNL4600HNTDZ9",
    "NNL4600WNZLR9",
    "NEL4000ENLE9",
    "NEL4000ENLR9",
    "NEL4000EVLE9",
    "NEL4000EVLR9",
    "NEL4000EWLE9",
    "NEL4000EWLR9",
    "NEL4100ENDZ9",
    "NEL4200ENDZ9",
    "NEL4300EDRC9",
    "NEL4300ELRC9",
    "NEL4300ENDZ9",
    "NEL4300ENRC9",
    "NEL4300EVRC9",
    "NEL4300EWRC9",
    "NEL4300HNLA9",
    "NEL4300HNLE9",
    "NEL4300HVLA9",
    "NEL4300HVLE9",
    "NEL4300HWLA9",
    "NEL4300HWLE9",
    "NEL4400EDRC9",
    "NEL4400ELRC9",
    "NEL4400ENDZ9",
    "NEL4400ENRC9",
    "NEL4400EVRC9",
    "NEL4400EWRC9",
    "NEL4500EDRC9",
    "NEL4500ELRC9",
    "NEL4500ENDZ9",
    "NEL4500ENRC9",
    "NEL4500EVRC9",
    "NEL4500EWRC9",
    "NEL4500HNDZ9",
    "NEL4500HNLA9",
    "NEL4500HNLE9",
    "NEL4500HVLA9",
    "NEL4500HVLE9",
    "NEL4500HWLA9",
    "NEL4500HWLE9",
    "NEL4600EDRC9",
    "NEL4600ELRC9",
    "NEL4600ENDZ9",
    "NEL4600ENRC9",
    "NEL4600EVRC9",
    "NEL4600EWRC9",
    "NEL4600HNDZ9",
    "NEL4600HNLA9",
    "NEL4600HNLE9",
    "NEL4600HVLA9",
    "NEL4600HVLE9",
    "NEL4600HWLA9",
    "NEL4600HWLE9"
];

  // Array to hold final results in correct order
  const results = new Array(productIDs.length);

  // Number of items to process in parallel
  const batchSize = 10;

  // Loop over product IDs in chunks of size batchSize
  for (let i = 0; i < productIDs.length; i += batchSize) {
    const batch = productIDs.slice(i, i + batchSize);

    // Process them in parallel
    const batchPromises = batch.map((productId, idx) => {
      const currentIndex = i + idx; // overall index
      return fetchLinks(productId).then((links) => {
        // Log the loop index
        console.log(`Processing index: ${currentIndex}, Product ID: ${productId}`);
        return { index: currentIndex, links };
      });
    });

    // Wait for the batch to complete
    const batchResults = await Promise.all(batchPromises);

    // Place each batch result in the correct position
    batchResults.forEach((res) => {
      results[res.index] = res.links;
    });
  }

  // All done; print the final results to console in JSON format
  console.log('Final results (full JSON):');
  console.log(JSON.stringify(results, null, 2));

  // Also write the results to an output file
  fs.writeFileSync('output.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('Results have been written to output.json');
})();