import aes from "./aes";
import { hashWallet } from "./portfolioAESKey";

export const getCandleStickUrl = (address, portfolioAESKey) => {
  if (!address) {
    console.error("Missing address");
    return null;
  }

  const encrypted = aes.encrypt(address.toLowerCase(), portfolioAESKey);
  const urlEncoded = encodeURIComponent(encrypted.toString());

  const url = `https://www.candlestick.io/traderscan/trading-performance/?active_in=last_1_month&first_in=1&WA=${urlEncoded}`;

  return url;
};

export const addBuyerStats = async ({ tokens, authToken, portfolioAESKey }) => {
  if (tokens.length === 0) {
    console.log("addBuyerStats: No tokens provided");
    return;
  }

  console.log(`Fetching wallet stats for ${tokens.length} tokens..`);
  await Promise.all(
    tokens.map(async ({ distinctAddresses }) => {
      console.log(`Fetching ${distinctAddresses.length} wallet stats..`);
      await Promise.all(
        distinctAddresses.map(async (buyer) => {
          const walletAddressHash = hashWallet(buyer.address, portfolioAESKey);
          const walletPerformance = await getWalletPerformance({
            authToken,
            walletAddressHash,
          });

          const winRate = walletPerformance?.stat?.est_win_Rate;
          const roi = walletPerformance?.stat?.est_total_profit_ratio;
          const coinTraded = walletPerformance?.stat?.coin_traded;

          buyer.winRate = winRate;
          buyer.roi = roi;
          buyer.coinTraded = coinTraded;

          console.log("📊 Wallet stats:", buyer);
        })
      );
    })
  );
};

export const getWalletPerformance = async ({
  authToken,
  walletAddressHash,
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
