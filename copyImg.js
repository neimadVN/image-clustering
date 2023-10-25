const fs = require('fs');
const path = require('path');

function copyImagesToNumberedFolders(imagePaths, destinationDir) {
  imagePaths.forEach((imageRow, folderIndex) => {
    imageRow.forEach((imagePath) => {
      const sourceImagePath = imagePath;
      const destinationFolder = path.join(destinationDir, folderIndex.toString());

      // Ensure the destination folder exists
      if (!fs.existsSync(destinationFolder)) {
        fs.mkdirSync(destinationFolder, { recursive: true });
      }

      // Extract the image file name from the source path
      const imageFileName = path.basename(imagePath);

      // Construct the destination path for the image
      const destinationImagePath = path.join(destinationFolder, imageFileName);

      // Copy the image from the source to the destination
      fs.copyFileSync(sourceImagePath, destinationImagePath);

      console.log(`Copied ${imageFileName} to folder ${folderIndex}`);
    });
  });
}

const imagePaths = require('./output.json')

const destinationDir = './out'; // Change this to your desired destination directory
// try {
  fs.rmSync(destinationDir, {recursive: true, force: true});
// } catch {}

copyImagesToNumberedFolders(imagePaths, destinationDir);