import { USE_MOCK_DATA } from "@/helpers/config";
import { sendError } from "@/helpers/send";
import MOCK_TXNS from "@/mocks/mock-txns.json";

type AlertQuery = {
  pageSize: number;
  valueFilter: number;
  walletAgeDays: number;
  boughtTokenLimit: boolean;
};

type AlertFilter = {
  minsAgo: number;
  minDistinctWallets: number;
  excludedTokens: string[];
};

class Alert {
  public name: string;
  private query: AlertQuery;
  private filters: AlertFilter;
  private authToken: string;
  private portfolioAESKey: string;

  constructor({
    name,
    query,
    filters,
  }: {
    name: string;
    query: AlertQuery;
    filters: AlertFilter;
  }) {
    this.name = name;
    this.query = query;
    this.filters = filters;
  }

  getSearchUrl(): string {
    const baseUrl = `https://candlestick.io/api/v1/stealth-money/degen-explorer-by-stealth-money`;
    const { pageSize, valueFilter, walletAgeDays, boughtTokenLimit } =
      this.query;
    const urlParams = new URLSearchParams({
      current_page: "1",
      page_size: pageSize.toString(),
      sort_type: "3",
      oriented: "1",
      blockchain_id: "2",
      exploreType: "token",
      days: walletAgeDays.toString(),
      value_filter: valueFilter.toString(),
      include_noise_trades: "false",
      fundingSource: "ALL",
      boughtTokenLimit: boughtTokenLimit.toString(),
      hide_first_mins: "0",
      activeSource: "ETH",
    });
    const url = `${baseUrl}?${urlParams.toString()}`;
    return url;
  }

  async getTransactions(): Promise<object[] | null> {
    if (USE_MOCK_DATA) {
      return this.fetchMockTransactions();
    } else {
      return this.fetchTransactions();
    }
  }

  async fetchMockTransactions(): Promise<object[]> {
    return MOCK_TXNS.data.chart;
  }

  async fetchTransactions(): Promise<object[] | null> {
    try {
      const url = this.getSearchUrl();
      const authToken = this.authToken;
      const result = await fetch(url, {
        headers: { "x-authorization": authToken },
      });
      // TODO: Handle failed response
      const json = await result.json();
      const txns = json.data.chart;
      console.log(
        "✅ Fetched stealth wallet transactions -",
        txns.length,
        "transactions"
      );
      return txns;
    } catch (error) {
      sendError({ message: "Error fetching stealth wallets", error });
      return null;
    }
  }

  async execute({
    authToken,
    portfolioAESKey,
  }: {
    authToken: string;
    portfolioAESKey: string;
  }): Promise<void> {
    this.authToken = authToken;
    this.portfolioAESKey = portfolioAESKey;

    const txns = await this.getTransactions();
    if (txns.length === 0) {
      console.log("🥱 No transactions found");
      return;
    }
    console.log("✅ Fetched stealth wallet transactions");
  }
}

export default Alert;

/*
{
  name: "🔴 Alert 1 - Stealth Wallets (1D, 1 token)",
  query: {
    pageSize: 100,
    valueFilter: 120,
    walletAgeDays: 1,
    boughtTokenLimit: true, // Tokens bought <= 2
  },
  filters: {
    // minsAgo: 300, // For testing
    minsAgo: 5,
    minDistinctWallets: 3,
    excludedTokens: ["WETH", "weth"],
  }
}
*/

/*
{
  current_page: 1,
  page_size: pageSize,
  sort_type: 3,
  oriented: 1,
  blockchain_id: 2,
  exploreType: "token",
  days: walletAgeDays,
  value_filter: valueFilter,
  include_noise_trades: false,
  fundingSource: "ALL",
  boughtTokenLimit: boughtTokenLimit,
  hide_first_mins: 0,
  activeSource: "ETH",
}
*/
