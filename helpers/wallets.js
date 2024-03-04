export const walletAlert = {
  name: "🟣 Alert 3 - Top Wallets",
  excludedTokens: ["WETH", "weth", "USDT", "USDC", "DAI", "WBTC"],
  query: {
    page_size: 50,
    sort_type: 0, // ROI
    oriented: 1, // Descending
    blockchain_id: 2, // Ethereum
    active_within: 2, // Active within 7 days
    timeframe: 3, // Token traded in 7 days
    total_profit: 4000, // Total profit ≥ $4000
    profitFilterType: "totalProfit",
    total_cost: 100, // Total cost ≥ $100
    first_in: 1, // Token First-in in {timeframe}
    token_traded: 3, // Tokens traded ≥ 3
    win_rate: 0.9, // Win rate ≥ 90%
  },
};

export const WALLETS_KEY = "topWallets";

export const ADDRESS_ACTIVITY_WEBHOOK_ID = "wh_9n5iiooqbvvw2p27";
