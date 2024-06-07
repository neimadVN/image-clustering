const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const axios = require('axios');

const filePath = process.env.PATH_LINK || '../getMonthlyPanasonic/[2024年5月発売] ローポールライト LED電球.csv';
const fileName = path.basename(filePath, path.extname(filePath));
const folderPath = path.join(__dirname, fileName);

const THREAD_SIZE = 20;

fs.mkdir(folderPath, { recursive: true }, (err) => {
  if (err) {
    return console.error('Failed to create folder:', err);
  }
  console.log('Folder created:', folderPath);

  const productIDs = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      if (row['品物番号']) {
        const productID = row['品物番号'].replace(/\s+/g, '');
        productIDs.push(productID);
      }
    })
    .on('end', async () => {
      const downloadImage = async (productID) => {
        const imageUrl = `https://www2.panasonic.biz/jp/catalog/lighting/products/nsl/image/preview/img/${productID}.jpg`;
        const imagePath = path.join(folderPath, `${productID}.jpg`);
        
        try {
          const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream'
          });

          const writer = fs.createWriteStream(imagePath);
          response.data.pipe(writer);

          return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
        } catch (error) {
          console.error('>>>>>Error downloading image for Product ID:', productID);
        }
      };

      const downloadBatches = [];
      for (let i = 0; i < productIDs.length; i += THREAD_SIZE) {
        const batch = productIDs.slice(i, i + THREAD_SIZE).map(downloadImage);
        downloadBatches.push(Promise.all(batch));
      }

      for (const batch of downloadBatches) {
        await batch;
      }

    });
});