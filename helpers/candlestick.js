import { sendError } from "next/dist/server/api-utils";
import puppeteer from "puppeteer";

const CANDLESTICK_DOMAIN = "https://candlestick.io";
const regex = /^0x[a-fA-F0-9]{40}$/g;

export const getCandleStickUrl = async (address) => {
  try {
    if (!address || !regex.test(address)) {
      console.warn("Invalid address", address);
      return CANDLESTICK_DOMAIN;
    }

    console.log("Fetching candlestick url for", address);

    console.log(`Visiting ${CANDLESTICK_DOMAIN}...`);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(CANDLESTICK_DOMAIN);

    console.log("Searching for address", address);
    // Set screen size
    await page.setViewport({ width: 1440, height: 900 });

    // Click on .global-search
    const globalSearchSelector = ".global-search";
    await page.waitForSelector(globalSearchSelector);
    await page.click(globalSearchSelector);

    // Type into search box
    await page.type(".global-search input", address);

    console.log("Waiting for search results...");
    // Click on search result
    const resultSelector = `span ::-p-text(${address})`;
    await page.waitForSelector(resultSelector);

    console.log("Clicking on search result...");
    await Promise.all([page.waitForNetworkIdle(), page.click(resultSelector)]);

    const url = await page.url();
    await browser.close();

    console.log("Fetched Candlestick URL", url);
    return url;
  } catch (error) {
    console.error(error);
    sendError(error);
    return CANDLESTICK_DOMAIN;
  }
};
