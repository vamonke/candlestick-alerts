import aes from "./aes";

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

export const getWalletPerformance = async ({
  walletAddressHash,
  authToken,
}) => {
  try {
    const baseUrl =
      "https://www.candlestick.io/api/v1/trading-performance/trading-performance-table";
    const params = new URLSearchParams({
      current_page: 1,
      page_size: 15,
      blockchain_id: 2,
      wallet_address: walletAddressHash,
      active_in: 0,
      first_in: 1,
    });
    const url = `${baseUrl}?${params}`;
    console.log("🔗 Fetching wallet performance:", url);
    const result = await fetch(url, {
      headers: { "x-authorization": authToken },
    });
    const json = await result.json();
    const data = json.data;
    console.log("Received wallet performance:", data);
    return data;
  } catch (error) {
    console.error("Error fetching wallet performance:", error);
    return null;
  }
};
