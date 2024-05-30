const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { makeCSV } = require('../utils/csvFile');

const MAIN_URL = 
  process.env.LINK
  + '&view_list=12000';
const BATCHSIZE = 50;

if (!process.env.LINK) {
  throw 'Error: no link!'
}

const crawlMainURL = async (MAIN_URL = MAIN_URL) => {
  const { data } = await axios.get(MAIN_URL);
  const $ = cheerio.load(data);

  // fs.writeFile(`${__dirname}/page.html`, data, (err) => {
  //   if (err) {
  //     console.error('Error writing html:', err);
  //   } else {
  //     console.log('html has been written');
  //   }
  // });

  const pElement = $('.search-cond-text');
  let spanTexts = [];
  pElement.find('span').each((index, element) => {
    spanTexts.push($(element).text());
  });

  let titleOfCategory = spanTexts.join(' ');
  return { titleOfCategory, $ };
}

const processTable = async ($) => {
  let linksAndPrice = [];

  $('table.search-result-table:not(.search-result-table-dl) tbody tr').each((index, element) => {
    // Find the <p> with class 'hinban' and get the href attribute of the <a> tag
    let relativeLink = $(element).find('p.hinban a').attr('href');
    let priceText = $(element).find('td').eq(4).text().trim();

    if (relativeLink) {
      const REG = /^\.\.\/\.\.\//; //'../../'
      relativeLink = `https://www2.panasonic.biz/jp/catalog/lighting/products/${relativeLink.replace(REG, '')}`;
    } else {
      relativeLink = 'NOLINK';
    }

    if (priceText && priceText !== '' && priceText !== '-') {
      priceText = priceText.replace(/[^\d]/g, '');
    } else {
      priceText = ''
    }

    linksAndPrice.push({ url: relativeLink, price: priceText });
  });

  return linksAndPrice;
}

const crawlUrl = async ({ url, price }) => {
  let ATitle = '';
  let BDetail = '';
  let CCode = '';
  let DPrice = '';
  let isSeparatedSold = NaN;

  try {
    const { data } = await axios.get(url, { headers: { Cookie: 'SER12_head2=0; SK_GYOUSHU=etc; SHOUMEISID=96hjgp7h8ngd5rl926320edgvr; _fbp=fb.1.1705658028078.2043299532; _pin_unauth=dWlkPU9XUmpOemRoTkRBdFlUbGtPUzAwT1dJeUxXRTFNMlF0TlRjek1UWTFZalV6TnpGag; PHPSESSID=940u3dtqlp2h3o9f7f778dgvh3; _gcl_au=1.1.1287564168.1705658029; _ga=GA1.3.1785333168.1705658029; _gid=GA1.3.1887722825.1705658029; _td_ssc_id=01HMGJ853FGVP2JWVA838VR0H8; _ga=GA1.1.1785333168.1705658029; __ulfpc=202401191653496223; OptanonAlertBoxClosed=2024-01-19T09:54:15.527Z; visitor_id888243=341453911; visitor_id888243-hash=1a0b7bd93635a1aef8c1ebdaf834274040dc5b7e50699e1d1ea3a16ea6c47cdcb35bd700f41f0a35b07cccfd58bd2d6679e36374; SKSEARCH_VIEW_LIST=12000; _td=b97398f9-916c-465f-a610-02c29ca4720e; _gat=1; OptanonConsent=isGpcEnabled=0&datestamp=Fri+Jan+19+2024+16%3A54%3A53+GMT%2B0700+(Indochina+Time)&version=6.30.0&isIABGlobal=false&hosts=&consentId=21d01306-c4c0-4100-81a4-22eb9ef12e54&interactionCount=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1%2CC0005%3A1%2CC0007%3A1&geolocation=VN%3BSG&AwaitingReconsent=false; _ga_MLHQR7NJQM=GS1.1.1705658029.1.1.1705658094.58.0.0' } });
    const $ = cheerio.load(data);

    CCode = $('.productName.pc_contents h1').text().trim();
    ATitle = $('.product div.info h2').text().trim();
    DPrice = price;

    const recital = $('.product div.info .recital').text().trim();
    isSeparatedSold = recital.includes('別売');

    // <!> process B detail
    let liTexts = [];
    $('.productDetail li').each((index, element) => {
      let text = $(element).text().trim();
      text = text.replace(/^◆/, '');

      liTexts.push(text);
    });
    BDetail = liTexts.join('<br>').replace(/◆/g, '<br>');
    if (isSeparatedSold) {
      BDetail = '<font color="red">ランプ別売</font><br><br>' + BDetail;
    }
    // <!> process B detail

    return {
      ATitle,
      BDetail,
      CCode,
      DPrice,
    };
  } catch (error) {
    return {
      ATitle,
      BDetail: url,
      CCode,
      DPrice,
    }
  }
};

const processBatch = async (batch) => {
  const promises = batch.map(url => crawlUrl(url));
  return Promise.all(promises);
};

(async function main() {
  const { titleOfCategory, $ } = await crawlMainURL(MAIN_URL);
  const linksAndPrice = await processTable($);

  let result = [];

  for (let i = 0; i < linksAndPrice.length; i += BATCHSIZE) {
    console.log(`${i}/${linksAndPrice.length}`);
    const batch = linksAndPrice.slice(i, i + BATCHSIZE);
    const rowsObjs = await processBatch(batch);
    result = result.concat(...rowsObjs);
  }

  console.log('========= generating csv =======');
  const resultCSVStr = makeCSV(result, {
    タイトル: 'ATitle',
    説明: 'BDetail',
    品物番号: 'CCode',
    定価: 'DPrice'
  })

  fs.writeFile(`${__dirname}/${titleOfCategory}.csv`, resultCSVStr, (err) => {
    if (err) {
      console.error('Error writing resultCSVStr:', err);
    } else {
      console.log('resultCSVStr has been written');
    }
  });
})();
