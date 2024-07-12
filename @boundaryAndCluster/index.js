const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { imageHash } = require('image-hash');

const imagesDir = './images';
const outputDir = './output';

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Function to detect the boundary line by analyzing color changes
const findBoundary = async (inputPath) => {
  try {
    const image = sharp(inputPath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    // Calculate the average color for each row
    const rowAverages = [];
    for (let y = 0; y < info.height; y++) {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * 3;
        sumR += data[idx];
        sumG += data[idx + 1];
        sumB += data[idx + 2];
      }
      const avgR = sumR / info.width;
      const avgG = sumG / info.width;
      const avgB = sumB / info.width;
      rowAverages.push({ avgR, avgG, avgB });
    }

    // Find the boundary where the color change is significant
    let boundary = info.height;
    for (let y = 1; y < rowAverages.length; y++) {
      const prev = rowAverages[y - 1];
      const current = rowAverages[y];
      const diffR = Math.abs(current.avgR - prev.avgR);
      const diffG = Math.abs(current.avgG - prev.avgG);
      const diffB = Math.abs(current.avgB - prev.avgB);
      const colorDiff = diffR + diffG + diffB;

      if (colorDiff > 100) { // Adjust the threshold if necessary
        boundary = y;
        break;
      }
    }

    return boundary;
  } catch (error) {
    console.error('Error in finding boundary:', error);
    throw error;
  }
};

// Function to crop the top part of the image up to the boundary line
const cropAndSave = async (inputPath, outputPath) => {
  try {
    const boundaryLine = await findBoundary(inputPath);

    const metadata = await sharp(inputPath).metadata();
    const heightToCrop = Math.min(boundaryLine, metadata.height);

    await sharp(inputPath)
      .extract({ width: metadata.width, height: heightToCrop, left: 0, top: 0 })
      .toFile(outputPath);
  } catch (error) {
    console.error('Error in cropping and saving image:', error);
    throw error;
  }
};

// Function to generate an image hash
const generateImageHash = (filePath) => {
  return new Promise((resolve, reject) => {
    imageHash(filePath, 16, true, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};

const main = async () => {
  const croppedImages = [];
  const hashes = {};

  // Get all image files from the directory
  const imageFiles = fs.readdirSync(imagesDir).filter(file => /\.(jpg|jpeg|png)$/.test(file));

  // Crop all images and save to temporary files
  for (const image of imageFiles) {
    const inputPath = path.join(imagesDir, image);
    const outputPath = path.join(imagesDir, `cropped_${image}`);
    await cropAndSave(inputPath, outputPath);
    croppedImages.push({ original: inputPath, cropped: outputPath });
  }

  // Generate hashes for cropped images
  for (const { original, cropped } of croppedImages) {
    const hash = await generateImageHash(cropped);
    if (!hashes[hash]) {
      hashes[hash] = [];
    }
    hashes[hash].push(original);
  }

  // Copy original images into cluster folders
  let clusterIndex = 1;
  for (const hash in hashes) {
    const clusterFolder = path.join(outputDir, `cluster${clusterIndex}`);
    if (!fs.existsSync(clusterFolder)) {
      fs.mkdirSync(clusterFolder);
    }
    for (const image of hashes[hash]) {
      const destPath = path.join(clusterFolder, path.basename(image));
      fs.copyFileSync(image, destPath);
    }
    clusterIndex++;
  }

  // Cleanup temporary cropped images
  for (const { cropped } of croppedImages) {
    fs.unlinkSync(cropped);
  }

  console.log('Images have been clustered and copied to the output directory.');
};

main().catch(err => {
  console.error('Error:', err);
});