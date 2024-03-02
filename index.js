const fs = require('fs');
// const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');
const {imageHash} = require('image-hash');
// const { encode } = require('blurhash');


// Define the directory where your images are located
const imageDirectory = './download/download4';
let i = 1;
const PADDING = 4;
const PADDING_TB = 4;


function writeObjectToFile(object, filePath) {
  // Convert the object to a JSON string
  const jsonData = JSON.stringify(object, null, 2); // The `null` and `2` are for formatting the JSON

  // Write the JSON data to the file
  fs.writeFile(filePath, jsonData, (err) => {
    if (err) {
      console.error('Error writing to the file:', err);
    } else {
      console.log('Object has been written to', filePath);
    }
  });
}

// Function to calculate the perceptual hash of an image
async function calculatePerceptualHash(imagePath) {
  const image = await loadImage(imagePath);
  const canvas = createCanvas(image.width - PADDING*2 , Math.round(image.width*0.56) - PADDING_TB*2 );
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, PADDING, PADDING_TB, image.width - PADDING*2, Math.round(image.width*0.56) - PADDING_TB*2, 0, 0, image.width - PADDING*2, Math.round(image.width*0.56) - PADDING_TB*2);

  return new Promise((resolve, reject) => imageHash({ data: canvas.toBuffer(), name: String(image.width)}, 8, true, (a, b) => a !== null ? reject(a) : resolve(b)));
  // return encode(ctx.getImageData(0,0,image.width - PADDING*2,Math.round(image.width*0.56)  - PADDING*2).data, image.width - PADDING*2, Math.round(image.width*0.56)  - PADDING*2, 4, 4);
}

// Function to find duplicate images in a directory
async function findDuplicateImages(directory) {
  const imageFiles = fs.readdirSync(directory);
  const imageHashes = new Map();

  for (const file of imageFiles) {
    const imagePath = `${directory}/${file}`;
    console.log(i++);

    if (fs.statSync(imagePath).isFile()) {
      try{
        const hash = await calculatePerceptualHash(imagePath);
        // console.log('🚀 ~ file: index.js:51 ~ findDuplicateImages ~ hash:', hash)

        if (imageHashes.has(hash)) {
          // Duplicate found, categorize them together
          const duplicates = imageHashes.get(hash);
          duplicates.push(imagePath);
          imageHashes.set(hash, duplicates);
        } else {
          // No duplicates found, create a new category
          imageHashes.set(hash, [imagePath]);
        }
      } catch(err) {
        console.log(imagePath);
      }
    }
  }

  return Array.from(imageHashes.values());
}

// Main function to categorize duplicate images
async function categorizeDuplicateImages() {
  const duplicateCategories = await findDuplicateImages(imageDirectory);
  console.log('🚀 ~ file: index.js:51 ~ categorizeDuplicateImages ~ duplicateCategories:', duplicateCategories)

  // for (const category of duplicateCategories) {
  //   if (category.length > 1) {
  //     console.log('Duplicate Images Found:');
  //     console.log(category.join('\n'));
  //     console.log('---');
  //   }
  // }
  
  writeObjectToFile(duplicateCategories, './output.json')
}

// Run the categorization
categorizeDuplicateImages().catch((error) => {
  console.error('An error occurred:', error);
});