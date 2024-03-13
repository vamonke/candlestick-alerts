export const walletAlert = {
  name: "🟣 Alert 3 - Top Wallets",
  excludedTokens: ["WETH", "weth", "USDT", "USDC", "DAI", "WBTC", "ETH"],
  excludedAddresses: ["0x0000000000000000000000000000000000000000"],
  count: 150,
  query: {
    page_size: 50, // Should be a factor of count
    sort_type: 0, // ROI
    oriented: 1, // Descending
    blockchain_id: 2, // Ethereum
    active_within: 2, // Active within 7 days
    timeframe: 0, // Token traded in 1 month
    total_profit: 3000, // Total profit ≥ $4000
    profitFilterType: "totalProfit",
    total_cost: 100, // Total cost ≥ $100
    first_in: 1, // Token First-in in {timeframe}
    token_traded: 3, // Tokens traded ≥ 3
    win_rate: 0.9, // Win rate ≥ 90%
  },
  showWalletLinks: true,
  showWalletStats: true,
};

export const WALLETS_KEY = "topWallets";

export const ADDRESS_ACTIVITY_WEBHOOK_ID = "wh_9n5iiooqbvvw2p27";
