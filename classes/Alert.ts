import { USE_MOCK_DATA } from "@/helpers/config";
import { parseUtcTimeString } from "@/helpers/parse";
import { sendError, sendMessage } from "@/helpers/send";
import MOCK_TXNS from "@/mocks/mock-txns.json";
import config from "./Config";
import Token from "./Token";
import { CandlestickTransaction } from "./types";

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
  public tokens: Token[] = [];

  private query: AlertQuery;
  private filters: AlertFilter;

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

  async getTransactions(): Promise<CandlestickTransaction[] | null> {
    if (USE_MOCK_DATA) {
      return this.fetchMockTransactions();
    } else {
      return this.fetchTransactions();
    }
  }

  async fetchMockTransactions(): Promise<CandlestickTransaction[]> {
    return MOCK_TXNS.data.chart;
  }

  async fetchTransactions(): Promise<CandlestickTransaction[] | null> {
    try {
      const url = this.getSearchUrl();
      const authToken = config.authToken;

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

  extractTokens(transactions: CandlestickTransaction[]): Token[] {
    const { minsAgo, minDistinctWallets, excludedTokens } = this.filters;

    const currentTime = USE_MOCK_DATA
      ? parseUtcTimeString(transactions[0].time)
      : new Date();
    const startTime = new Date(currentTime.getTime() - minsAgo * 60 * 1000);

    console.log("Evaluating transactions..");

    const tokensMap = {} as Record<string, Token>;
    transactions
      .filter((txn) => {
        const time = parseUtcTimeString(txn.time);
        return time > startTime;
      })
      .forEach((txn) => {
        const {
          buy_token_symbol: tokenSymbol,
          buy_token_address: tokenAddress,
        } = txn;
        const tokenObj = tokensMap[tokenAddress];
        if (excludedTokens.includes(tokenAddress)) {
          return;
        } else if (tokenObj) {
          tokenObj.addTransaction(txn);
        } else {
          tokensMap[tokenAddress] = new Token({
            symbol: tokenSymbol,
            address: tokenAddress,
            transactions: [txn],
          });
        }
      });

    const matchedTokens: Token[] = [];

    if (Object.keys(tokensMap).length === 0) {
      console.log("Token map: (empty)");
    } else {
      console.log("Token map:", JSON.stringify(tokensMap, null, 2));
    }

    for (const address in tokensMap) {
      const token = tokensMap[address];
      const tokenAddress = token.address;
      const distinctWalletsCount = token.getWalletCount();

      const log = {
        token: token.symbol,
        contract_address: token.address,
        transactions: token.transactions.length,
        wallet_count: token.getWalletCount(),
        wallet_addresses: token.getWalletAddresses(),
      };
      console.log(JSON.stringify(log, null, 2));

      if (excludedTokens.includes(tokenAddress)) {
        continue;
      }

      if (distinctWalletsCount < minDistinctWallets) {
        continue;
      }

      matchedTokens.push(token);
    }

    // matchedTokens = matchedTokens.sort(
    //   (a, b) => b.distinctWalletsCount - a.distinctWalletsCount
    // );

    return matchedTokens;
  }

  async execute(): Promise<void> {
    const txns = await this.getTransactions();
    if (txns.length === 0) {
      console.log("🥱 No transactions found");
      return;
    }
    console.log("✅ Fetched stealth wallet transactions");

    this.tokens = this.extractTokens(txns);
    if (this.tokens.length === 0) {
      console.log("🥱 No token satisfies conditions");
      return;
    }

    const alertString = this.craftAlertString();
    console.log("🚨 Alert string:", alertString);

    const promises = this.tokens.map(async (token) => {
      const tokenString = await token.craftTokenString();
      console.log(`🚨 Token string:`, tokenString);

      const message = [alertString, tokenString].join("\n\n");
      await sendMessage(message);
    });

    await Promise.all(promises);
  }

  craftAlertString(): string {
    const { name, query, filters } = this;
    const { valueFilter, walletAgeDays, boughtTokenLimit } = query;
    const { minsAgo, minDistinctWallets } = filters;

    // Alert name
    const nameString = `<b><i>${name}</i></b>`;

    // Alert conditions
    const valueFilterString = `Buy ≥ $${valueFilter.toLocaleString()}`;
    const walletAgeString = `Wallet age ≤ ${walletAgeDays}D`;
    const minDistinctWalletsString = `Distinct wallets ≥ ${minDistinctWallets}`;
    const boughtTokenLimitString = boughtTokenLimit
      ? "Tokens bought ≤ 2"
      : null;
    const windowString = `Past ${minsAgo} mins`;

    const alertConditionsString =
      `<i>` +
      [
        valueFilterString,
        walletAgeString,
        boughtTokenLimitString,
        minDistinctWalletsString,
        windowString,
      ]
        .filter(Boolean)
        .join(", ") +
      `</i>`;

    const result = [nameString, alertConditionsString].join("\n");
    return result;
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
    minsAgo: 5,
    // minsAgo: 300, // For testing
    minDistinctWallets: 3,
    excludedTokens: ["WETH", "weth"],
  }
}
*/
