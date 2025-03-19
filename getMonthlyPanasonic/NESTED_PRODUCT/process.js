const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { makeCSV } = require('../../utils/csvFile');

const BATCHSIZE = 50;

const crawlMainURL = async (MAIN_URL = MAIN_URL) => {
  let data;
  if (MAIN_URL.startsWith('http')) {
    data = (await axios.get(MAIN_URL)).data;
  } else {
    data = fs.readFileSync(MAIN_URL);
  }
  // const { data } = await axios.get(MAIN_URL);
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
  let linksAndPrice = []; // { url: absoluteLinkURL, price: '' }[]

  const rawUrls = JSON.parse(fs.readFileSync('./output.raw.json', 'utf8'));
  linksAndPrice = rawUrls.map(url => ({ url, price: '' }));

  console.log(linksAndPrice);

  return linksAndPrice;
}

const crawlUrl = async ({ url, price }) => {
  let ATitle = '';
  let BDetail = '';
  let CCode = '';
  let DPrice = '';
  let ENote = '';
  let isSeparatedSold = NaN;

  try {
    const { data } = await axios.get(url, { headers: { Cookie: 'SER12_head2=0; SK_GYOUSHU=close; SHOUMEISID=mlehflck16shbatitptc1b9k67; _fbp=fb.1.1737531372859.576642795879494304; _pin_unauth=dWlkPVpqQXlabU13TWpBdE9XWmlZUzAwTW1NekxXRTRZamd0TjJWak5HVmlZMkU1WW1ZeA; _gcl_au=1.1.184322228.1737531375; _ga=GA1.1.1564657938.1737531375; _ga=GA1.3.1564657938.1737531375; _gid=GA1.3.768425913.1737531375; krt.vis=SozOxLz_ULbJg4f; _td_ssc_id=01JJ6F1FEGF5Q8C5V3RNPEH7DS; rt_storage_writable=true; rt_session_id=8ad855010aae4dfab9fdb0c0201d7669; rt_user_id=11da512e171d418491dd0320f507e112; OptanonAlertBoxClosed=2025-01-22T07:36:16.763Z; PHPSESSID=mv7j8gan5id90ticuiuqhbcrga; __ulfpc=202501221436224549; visitor_id888243=451792438; visitor_id888243-hash=fcd5121bf8a137b21a267afa5e7f136591ccf9b0a9f3bee8b77d11985efd29defbbb8ad17f635e7be53985354d052fc15482178a; _td=77b55e4b-bd3d-4a6b-aab2-116ce06fce3c; OptanonConsent=isGpcEnabled=0&datestamp=Wed+Jan+22+2025+14%3A40%3A02+GMT%2B0700+(Indochina+Time)&version=6.30.0&isIABGlobal=false&hosts=&consentId=4272a1a1-155b-4c73-a261-7073224214b4&interactionCount=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1%2CC0005%3A1%2CC0007%3A1&geolocation=VN%3BSG&AwaitingReconsent=false; _ga_MLHQR7NJQM=GS1.1.1737531374.1.1.1737532039.60.0.0' } });
    const $ = cheerio.load(data);

    CCode = $('.productName.pc_contents h1').text().trim().replace(/\([^(]*\([^)]*\)[^(]*\)|\([^)]*\)$/, '').trim();
    if (CCode) {
      // Split on '+' and keep only the last segment
      const segments = CCode.split('+');
      CCode = segments[segments.length - 1].trim();
    }
    
    ATitle = $('.product div.info h2').text().trim();
    DPrice = price;
    if (!DPrice) {
      $('section.product.clr.alphaOver > div.info > dl > dt').each((index, element) => {
        if ($(element).text()?.includes('円（税抜）')) {
          const priceMatch = $(element).text().match(/(\d+(,\d+)*)\s*円/); // ◆希望小売価格　18,300 円（税抜）
          if (priceMatch) {
            DPrice = priceMatch[1].replace(/,/g, '');
          }
        }
      })
    }

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
      BDetail = '<font color=""red"">ランプ別売</font><br><br>' + BDetail;
    }
    // <!> process B detail

    $('div.products#content div.info dl.clr dt').each((index, element) => {
      let text = $(element).text().trim();
      if (text.includes('◆受注品')) {
        ENote = '受注品';
      }
    });

    return {
      ATitle,
      BDetail,
      CCode,
      DPrice,
      ENote,
    };
  } catch (error) {
    return {
      ATitle,
      BDetail: url,
      CCode,
      DPrice,
      ENote,
    }
  }
};

const processBatch = async (batch) => {
  const promises = batch.map(url => crawlUrl(url));
  return Promise.all(promises);
};

(async function main() {
  const titleOfCategory = "WRONG_Mar12"
  const linksAndPrice = await processTable();

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
    定価: 'DPrice',
    note: 'ENote',
  })

  fs.writeFile(`${__dirname}/${titleOfCategory}.csv`, resultCSVStr, (err) => {
    if (err) {
      console.error('Error writing resultCSVStr:', err);
    } else {
      console.log('resultCSVStr has been written');
    }
  });
})();
