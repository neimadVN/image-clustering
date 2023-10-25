const fs = require('fs');
const imageSSIM = require('image-ssim');
const { createCanvas, loadImage } = require('canvas');

// Define the directory where your images are located
const imageDirectory = './NewPicture';
let i = 1;

// Define the SSIM threshold for grouping similar images (adjust as needed)
const similarityThreshold = 0.9; // Adjust this threshold as necessary

const PADDING = 36;
async function getImgBuffer(imagePath) {
  const image = await loadImage(imagePath);
  const canvas = createCanvas(image.width - PADDING*2 , Math.round(image.width*0.6)  - PADDING*2 );
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, PADDING, PADDING, image.width - PADDING*2, Math.round(image.width*0.6)  - PADDING*2, 0, 0, image.width - PADDING*2, Math.round(image.width*0.6) - PADDING*2);

  return canvas.toBuffer();
}


// Function to compare SSIM between two images
async function compareImagesSSIM(imagePath1, imagePath2) {
  const imageBuffer1 = await getImgBuffer(imagePath1);
  const imageBuffer2 = await getImgBuffer(imagePath2);

  const ssim = await imageSSIM.compare(imageBuffer1, imageBuffer2);
  return ssim;
}

// Function to find duplicate images in a directory
async function findDuplicateImages(directory) {
  const imageFiles = fs.readdirSync(directory);
  const imageGroups = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath1 = `${directory}/${imageFiles[i]}`;
    console.log(i++);

    if (fs.statSync(imagePath1).isFile()) {
      const group = [imagePath1];

      for (let j = i + 1; j < imageFiles.length; j++) {
        const imagePath2 = `${directory}/${imageFiles[j]}`;

        if (fs.statSync(imagePath2).isFile()) {
          const ssim = await compareImagesSSIM(imagePath1, imagePath2);

          if (ssim >= similarityThreshold) {
            group.push(imagePath2);
          }
        }
      }

      imageGroups.push(group);
    }
  }

  return imageGroups;
}

// Main function to categorize duplicate images
async function categorizeDuplicateImages() {
  const duplicateCategories = await findDuplicateImages(imageDirectory);
  console.log('🚀 ~ file: index2.js:66 ~ categorizeDuplicateImages ~ duplicateCategories:', duplicateCategories)

  // for (const category of duplicateCategories) {
  //   if (category.length > 1) {
  //     console.log('Similar Images Found:');
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