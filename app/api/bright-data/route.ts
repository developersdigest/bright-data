//1. Import dependencies
import { NextResponse } from 'next/server';
import requestPromise from 'request-promise';
import TurndownService from 'turndown';
import puppeteer, { Page } from "puppeteer-core";

//2. Configure TurndownService
const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '_'
});

//3. Remove unwanted elements from HTML conversion
turndownService.remove(['script', 'style', 'iframe', 'noscript']);

//4. Define function to convert HTML to Markdown
function htmlToMarkdown(html: string | TurndownService.Node): string {
    try {
        const maxLength = 500000;
        if (typeof html === 'string' && html.length > maxLength) {
            console.warn(`HTML content truncated from ${html.length} to ${maxLength} characters`);
            html = html.slice(0, maxLength) + '... (content truncated)';
        }

        console.log('Converting HTML to Markdown');
        const markdown = turndownService.turndown(html);
        console.log('Conversion complete');
        return markdown;
    } catch (error) {
        console.error('Error converting HTML to markdown:', error);
        return '[Error: Unable to convert HTML to Markdown]';
    }
}

//5. Define WebSocket endpoint for browser connection
const BROWSER_WS = "wss://brd-customer-hl_868ea680-zone-scraping_browser4:4l5ikzt3ipxa@brd.superproxy.io:9222";

//6. Define POST request handler
export async function POST(request: Request) {
    try {
        const { url, query } = await request.json();
        console.log('Received request with URL:', url, 'and query:', query);

        let content: string;

        //7. Handle Amazon-specific scraping
        if (url.includes("amazon.com")) {
            const amazonData = await scrapeAmazonData(query);
            content = JSON.stringify(amazonData);
        } else {
            //8. Handle general web scraping
            const unlockerOptions = {
                url: url,
                proxy: 'http://brd-customer-hl_868ea680-zone-web_unlocker1:26ki3r1d43gc@brd.superproxy.io:22225',
                rejectUnauthorized: false,
            };

            console.log('Making Web Unlocker request');
            const unlockedData = await requestPromise(unlockerOptions);
            console.log('Web Unlocker request complete');

            content = htmlToMarkdown(unlockedData);
        }

        //9. Return response
        return NextResponse.json({
            content
        }, { status: 200 });
    } catch (error) {
        console.error('An error occurred:', error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}

//10. Define function to scrape Amazon data
async function scrapeAmazonData(search_text: string) {
    const browser = await puppeteer.connect({
        browserWSEndpoint: BROWSER_WS,
    });
    const page = await browser.newPage();
    await page.goto("https://www.amazon.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await searchProduct(page, search_text);
    const data = await parseProductResults(page);
    await browser.close();
    return data;
}

//11. Define function to search for a product on Amazon
async function searchProduct(page: Page, search_text: string) {
    console.log("Waiting for search bar...");
    const search_input = await page.waitForSelector('#twotabsearchtextbox', { timeout: 60000 });
    console.log("Search bar found! Entering search text...");
    if (search_input) {
        await search_input.type(search_text);
    }
    console.log("Search text entered. Submitting search...");
    await Promise.all([
        page.click('#nav-search-submit-button'),
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    ]);
    console.log("Search results page loaded.");
}

//12. Define function to parse Amazon product results
async function parseProductResults(page: Page) {
    return await page.$$eval('.s-result-item', (els: Element[]) => els.slice(0, 10).map((el: Element) => {
        const name = el.querySelector('h2')?.textContent?.trim();
        const price = el.querySelector('.a-price-whole')?.textContent;
        const rating = el.querySelector('.a-icon-star-small')?.textContent?.trim();
        const reviews = el.querySelector('.a-size-base.s-underline-text')?.textContent;
        const link = el.querySelector('a.a-link-normal')?.getAttribute('href');
        return { name, price, rating, reviews, link: link ? `https://www.amazon.com${link}` : undefined };
    }));
}