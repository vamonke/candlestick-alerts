import aes from "./aes";

const regex = /^0x[a-fA-F0-9]{40}$/g;

export const getCandleStickUrl = (address, portfolioAESKey) => {
  if (!address) {
    console.error("Missing address");
    return null;
  }

  const encrypted = aes.encrypt(address.toLowerCase(), portfolioAESKey);
  const urlEncoded = encodeURIComponent(encrypted.toString());

  const url = `https://www.candlestick.io/traderscan/trading-performance/?active_in=last_1_month&WA=${urlEncoded}`;

  return url;
};
