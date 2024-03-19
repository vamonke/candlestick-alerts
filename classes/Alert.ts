import { USE_MOCK_DATA } from "@/helpers/config";
import { parseUtcTimeString } from "@/helpers/parse";
import { sendError } from "@/helpers/send";
import MOCK_TXNS from "@/mocks/mock-txns.json";
import AlertToken from "./AlertToken";
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
  public id: number;
  public name: string;
  // public tokens: Token[] = [];
  // public alertTokens: AlertToken[] = [];

  private query: AlertQuery;
  private filter: AlertFilter;

  constructor({
    id,
    name,
    query,
    filter,
  }: {
    id: number;
    name: string;
    query: AlertQuery;
    filter: AlertFilter;
    tokens?: Token[];
  }) {
    this.id = id;
    this.name = name;
    this.query = query;
    this.filter = filter;
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

  extractTokens(transactions: CandlestickTransaction[]): AlertToken[] {
    const { minsAgo, minDistinctWallets, excludedTokens } = this.filter;

    const currentTime = USE_MOCK_DATA
      ? parseUtcTimeString(transactions[0].time)
      : new Date();
    const startTime = new Date(currentTime.getTime() - minsAgo * 60 * 1000);

    console.log("Evaluating transactions..");

    const alertTokenMap = {} as Record<string, AlertToken>;
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
        const alertToken = alertTokenMap[tokenAddress];
        if (excludedTokens.includes(tokenAddress)) {
          return;
        } else if (alertToken) {
          alertToken.addTransaction(txn);
        } else {
          alertTokenMap[tokenAddress] = new AlertToken({
            alert: this,
            token: new Token({
              symbol: tokenSymbol,
              address: tokenAddress,
            }),
            transactions: [txn],
          });
        }
      });

    const matchedAlertTokens: AlertToken[] = [];

    if (Object.keys(alertTokenMap).length === 0) {
      console.log("Token map: (empty)");
    } else {
      console.log("Token map:", JSON.stringify(alertTokenMap, null, 2));
    }

    for (const address in alertTokenMap) {
      const alertToken = alertTokenMap[address];
      const token = alertToken.token;
      const tokenAddress = token.address;
      const symbol = token.symbol;
      const txnCount = alertToken.transactions.length;
      const walletCount = alertToken.getWalletCount();
      const walletAddresses = alertToken.getWalletAddresses();

      const log = {
        token: symbol,
        contract_address: tokenAddress,
        transactions: txnCount,
        wallet_count: walletCount,
        wallet_addresses: walletAddresses,
      };
      console.log(JSON.stringify(log, null, 2));

      if (excludedTokens.includes(tokenAddress)) {
        continue;
      }

      if (walletCount < minDistinctWallets) {
        continue;
      }

      matchedAlertTokens.push(alertToken);
    }

    return matchedAlertTokens;
  }

  async findTokens(): Promise<AlertToken[]> {
    const txns = await this.getTransactions();
    if (txns.length === 0) {
      console.log("🥱 No transactions found");
      return [];
    }
    return this.extractTokens(txns);
  }

  craftAlertString(): string {
    const { name, query, filter } = this;
    const { valueFilter, walletAgeDays, boughtTokenLimit } = query;
    const { minsAgo, minDistinctWallets } = filter;

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

  async execute(): Promise<void> {
    const alertTokens = await this.findTokens();
    await Promise.all(alertTokens.map((alertToken) => alertToken.sendAlert()));
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
