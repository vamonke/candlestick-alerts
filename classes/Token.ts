import { CandlestickTransaction } from "./types";

class Token {
  public symbol: string;
  public name: string;
  public address: string;
  public createdAt: Date;
  public transactions: CandlestickTransaction[];

  private authToken: string;
  private portfolioAESKey: string;

  constructor({
    symbol,
    name,
    address,
    createdAt,
    transactions,
  }: {
    address: string;
    symbol?: string;
    name?: string;
    createdAt?: Date;
    transactions?: CandlestickTransaction[];
  }) {
    this.symbol = symbol;
    this.name = name;
    this.address = address;
    this.createdAt = createdAt;
    this.transactions = transactions;
  }

  getWalletCount(): number {
    const walletSet = new Set();
    this.transactions.forEach((txn) => {
      walletSet.add(txn.address);
    });
    return walletSet.size;
  }

  getWallets(): string[] {
    const walletSet: Set<string> = new Set();
    this.transactions.forEach((txn) => {
      walletSet.add(txn.address);
    });
    return Array.from(walletSet);
  }

  getTotalTxnValue(): number {
    return this.transactions.reduce((acc, txn) => acc + txn.txn_value, 0);
  }
}

export default Token;
