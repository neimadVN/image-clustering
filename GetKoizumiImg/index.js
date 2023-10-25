const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const itemNameList = require('./list.json');

const urls = itemNameList.map(i => `https://webcatalog.koizumi-lt.co.jp/kensaku/item/detail?itemid=${i}`);

const downloadImage = async (url, dest) => {
    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(dest);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

const crawlUrl = async (url) => {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Find the first image with width 164 and height 164
        const img = $('img[width="164"][height="164"]').first();

        if (img && img.attr('src')) {
            const imgUrl = img.attr('src');

            // Ensure absolute URL
            const absoluteUrl = imgUrl.startsWith('http') ? imgUrl : new URL(imgUrl, url).href;

            // Extract filename from the image URL
            const filename = absoluteUrl.split('/').pop();

            console.log(`Downloading ${absoluteUrl}...`);
            await downloadImage(absoluteUrl, `./${filename}`);
            console.log(`Downloaded to ./${filename}`);
        }
    } catch (error) {
        console.error(`Failed to crawl ${url}. Error:`, error.message);
    }
};

const processBatch = async (batch) => {
    const promises = batch.map(url => crawlUrl(url));
    await Promise.all(promises);
};

(async () => {
    const batchSize = 10;

    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        await processBatch(batch);
    }
})();