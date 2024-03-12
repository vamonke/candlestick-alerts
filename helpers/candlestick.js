import aes from "./aes";
import { CANDLESTICK_PROXY } from "./config";
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
    const baseUrl = `${CANDLESTICK_PROXY}/api/v1/trading-performance/trading-performance-table`;
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

const getWalletActions = async ({
  tokenAddress,
  walletAddress,
  portfolioAESKey,
  authToken,
}) => {
  const walletAddressHash = hashWallet(walletAddress, portfolioAESKey);
  const baseUrl = `${CANDLESTICK_PROXY}/api/v1/on-chain-actions/on-chain-actions-table`;
  const params = new URLSearchParams({
    current_page: 1,
    page_size: 15,
    blockchain_id: 2,
    token_address: tokenAddress,
    wallet_address: walletAddressHash,
    value_filter: 0,
  });
  const url = `${baseUrl}?${params}`;
  console.log("🔗 Fetching wallet actions:", url);
  const result = await fetch(url, {
    headers: { "x-authorization": authToken },
  });
  const json = await result.json();
  const data = json.data;
  console.log("Received wallet actions:", data);
  return data;
};

export const getWalletAction = async ({
  tokenAddress,
  walletAddress,
  txHash,
  portfolioAESKey,
  authToken,
}) => {
  const walletAction = await getWalletActions({
    tokenAddress,
    walletAddress,
    portfolioAESKey,
    authToken,
  });
  const action = walletAction?.chart?.find(
    ({ tx_hash, actions, tokens_address }) =>
      tx_hash === txHash &&
      ((actions[0] === 0 && tokens_address[0] === tokenAddress) ||
        (actions[1] === 0 && tokens_address[1] === tokenAddress))
  );

  if (action) {
    console.log("✅ On-chain activity:", action);
  } else {
    console.warn("On-chain activity: No action found", {
      tokenAddress,
      walletAddress,
      txHash,
    });
    return null;
  }

  const tokenPrice = action?.tokens_price?.[1];
  const txnValue = action?.txn_value;
  return { tokenPrice, txnValue };
};
