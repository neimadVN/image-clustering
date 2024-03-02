const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const itemNameList = require('./list.json');
// const itemNameList = ['XD305808BL'];

const urls = itemNameList.map(i => `https://webcatalog.koizumi-lt.co.jp/kensaku/item/detail?itemid=${i}`);

const crawlUrl = async (url) => {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        let categoriesWithPage = $('ul.catalogList > li a:not(:has(img))');
        const resultRow = [];
        categoriesWithPage.each((i, a) => {
            const aText = a.children[0].data || '';
            if (aText.match('Lighting PRO 2023')) {
                resultRow.push(aText.split(/ |　/).pop());
            }
        });

        let status = [];
        if ($('div#productInfo .new').length) {
            status.push('新規');
        }
        if ($('div#productInfo .end').length) {
            status.push('生産終了');
        }
        if ($('div#productInfo .limited').length) {
            status.push('在庫限り');
        }

        if (!status.length && !categoriesWithPage.length) {
            if ($('body').html().includes('パラメータが不正です')) {
                status.push('なし');
                console.log(url)
            }
        }

        // return resultRow.join('・').concat('\r\n');
        return {
            page: resultRow.join('・').concat('\r\n'),
            status: status.join('・').concat('\r\n'),
        };
    } catch (error) {
        console.error(`Failed to crawl ${url}. Error:`, error.message);
        return {
            page: url.concat('\r\n'),
            status: url.concat('\r\n'),
        }
    }
};

const processBatch = async (batch) => {
    const promises = batch.map(url => crawlUrl(url));
    return Promise.all(promises);
};

(async () => {
    const batchSize = 50;
    let resultPage = '';
    let resultStatus = '';


    for (let i = 0; i < urls.length; i += batchSize) {
        console.log(`${i}/${urls.length}`);
        const batch = urls.slice(i, i + batchSize);
        const rowsPageAndStatusStrings = await processBatch(batch);

        const pageOnly = rowsPageAndStatusStrings.reduce((result, c) => result.concat(c.page), []).join('');
        const sttOnly = rowsPageAndStatusStrings.reduce((result, c) => result.concat(c.status), []).join('');
        /**
         * {
            page: resultRow.join('・').concat('\r\n'),
            status: status.join('・'),
        };
         */
        resultPage = resultPage.concat(pageOnly);
        resultStatus = resultStatus.concat(sttOnly);
    }

    fs.writeFile(`${__dirname}/page.txt`, resultPage, (err) => {
        if (err) {
            console.error('Error writing resultPage:', err);
        } else {
            console.log('resultPage has been written');
        }
    });

    fs.writeFile(`${__dirname}/status.txt`, resultStatus, (err) => {
        if (err) {
            console.error('Error writing resultStatus:', err);
        } else {
            console.log('resultStatus has been written');
        }
    });

})();