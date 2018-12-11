const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const config = require('./config');

const outputDir = 'output'
try {
    fs.mkdirSync(path.join(__dirname, outputDir));
} catch (err) {
    if (err.code !== 'EEXIST') throw err;
}

(async () => {
    const browser = await puppeteer.launch({
        // headless mode to launch full version of Chromium
        headless: config.headless
    });
    const page = await browser.newPage();
    page.on('console', msg => {
        if (msg._type !== 'warning') {
            console.log(msg._text);
        }
    })
    await page.goto(config.homeUrl, {
        // waitUntil: 'networkidle2'
    });

    // login
    await page.type('.login .loginText input[name=username]', config.username);
    await page.type('.login .loginText input[name=password]', config.password);
    await page.click('.login .loginText input[name=submit]');
    await page.waitForNavigation();

    // language select
    console.log('language:', config.language);
    let languageOptions = await page.evaluate(() => {
        let options = [...document.querySelectorAll('.mainNav > .language > .standard select > option')];
        let res = {};
        for (let option of options) {
            res[option.innerText] = option.getAttribute('value');
        }
        return res;
    });
    await page.select('.mainNav > .language > .standard select', languageOptions[config.language]);
    await page.waitFor(500);

    // get into `THORIE` pag
    await page.click('.mainNav > .menu > li:nth-child(2)');
    let chapterSelector = '#container > #sidebar > .boxCateg ol li a';
    let chapterLinks = await page.$$(chapterSelector);

    // get all chapter links and titles
    let chapters = await page.evaluate(() => {
        let nodes = [...document.querySelectorAll('#container > #sidebar > .boxCateg ol li a')];
        return nodes.map(el => {
            return {
                name: el.innerText,
                href: el.href,
            }
        })
    })

    if (chapters.length == 0) {
        console.log('Chapters not found');
        await browser.close();
        return
    }
    
    // skip the first chapter of preface
    await page.goto(chapters[1].href);
    var pageNum = 0;
    var hasNextPage = true;
    do {
        pageNum++;
        let preNextLinks = await page.evaluate(() => {
            let links = [...document.querySelectorAll('#container > #content #text > a')];
            return links.map(link => {
                return link.href
            })
        })
        
        // the website sets a limited height scroll to prevent text copy
        await page.$eval('#wrapper #container #content', el => {
            let styleStr = el.getAttribute('style');
            // enough height to expand limited height scrollable content
            const pageHeight = 1500;
            styleStr += `height: ${pageHeight}px !important;`;
            el.setAttribute('style', styleStr);
        });
        // wait for rerender of page
        await page.waitFor(500);
        
        switch (config.outputType) {
            case 'png':
                // output png screenshot
                await page.screenshot({
                    path: path.join(__dirname, outputDir, `${config.language}_${pageNum}.png`),
                    fullPage: true
                });
                break;
            case 'pdf':
                // output pdf
                await page.pdf({
                    path: path.join(__dirname, outputDir, `${config.language}_${pageNum}.pdf`),
                    format: 'A4'
                });
                break;
            default:
                throw new Error('Only support config.outputType value as "pdf" or "png"');
        }
        
        if (preNextLinks.length < 2) {
            // last page, break
            hasNextPage = false;
            break;
        }
        let nextPage = preNextLinks[preNextLinks.length - 1]
        await page.goto(nextPage);
    } while (hasNextPage);

    console.log(`${pageNum} pages printed`);

    await browser.close();
})();