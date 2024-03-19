import { getContractCreation, getTokenName } from "@/helpers/contract";
import { formatOwnership, getTokenSecurity } from "@/helpers/goplus";
import { checkHoneypot } from "@/helpers/honeypot";
import {
  formatHoneypot,
  formatTaxString,
  getRelativeDate,
} from "@/helpers/parse";
import { constructTxnsTable, constructWalletsTable } from "@/helpers/table";
import Wallet from "./Wallet";
import { CandlestickTransaction, GoPlusTokenSecurity, Honeypot } from "./types";

class Token {
  public address: string;
  public symbol: string;
  public transactions: CandlestickTransaction[];

  private creationDate: Date;
  private name: string;
  private honeypot: Honeypot;
  private tokenSecurity: GoPlusTokenSecurity;

  constructor({
    symbol,
    name,
    address,
    creationDate,
    transactions,
  }: {
    address: string;
    symbol: string;
    name?: string;
    creationDate?: Date;
    transactions?: CandlestickTransaction[];
  }) {
    this.symbol = symbol;
    this.name = name;
    this.address = address;
    this.creationDate = creationDate;
    this.transactions = transactions;
  }

  getSymbol(): string {
    return this.symbol;
  }

  getWalletCount(): number {
    const walletSet = new Set();
    this.transactions.forEach((txn) => {
      walletSet.add(txn.address);
    });
    return walletSet.size;
  }

  getWallets(): Wallet[] {
    const walletSet: Set<string> = new Set();
    this.transactions.forEach((txn) => {
      walletSet.add(txn.address);
    });
    return Array.from(walletSet).map((address) => new Wallet({ address }));
  }

  getWalletAddresses(): string[] {
    const walletSet: Set<string> = new Set();
    this.transactions.forEach((txn) => {
      walletSet.add(txn.address);
    });
    return Array.from(walletSet);
  }

  async getWalletsWithStats({ limit = 20 }: { limit: number }) {
    const wallets = this.getWallets();
    const promises = wallets.slice(0, limit).map((wallet) => wallet.getStats());
    await Promise.all(promises);
    return wallets;
  }

  getTotalTxnValue(): number {
    return this.transactions.reduce((acc, txn) => acc + txn.txn_value, 0);
  }

  addTransaction(txn: CandlestickTransaction): void {
    this.transactions.push(txn);
  }

  async getCreationDate(): Promise<Date | null> {
    if (this.creationDate) {
      return this.creationDate;
    } else {
      return this._fetchCreationDate();
    }
  }

  async _fetchCreationDate(): Promise<Date> {
    const timestamp = await getContractCreation(this.address);
    if (!timestamp) return null;
    this.creationDate = timestamp;
    return this.creationDate;
  }

  async getName(): Promise<string> {
    if (this.name) {
      return this.name;
    } else {
      return this._fetchName();
    }
  }

  async _fetchName(): Promise<string> {
    const name = await getTokenName(this.address);
    if (!name || typeof name !== "string") return null;
    this.name = name;
    return this.name;
  }

  async getHoneypot(): Promise<Honeypot> {
    if (this.honeypot) {
      return this.honeypot;
    } else {
      return this._fetchHoneypot();
    }
  }

  async _fetchHoneypot(): Promise<Honeypot> {
    const honeypot = await checkHoneypot(this.address);
    this.honeypot = honeypot;
    return this.honeypot;
  }

  async getTokenSecurity() {
    if (this.tokenSecurity) {
      return this.tokenSecurity;
    } else {
      return this._fetchTokenSecurity();
    }
  }

  async _fetchTokenSecurity() {
    const tokenSecurity = await getTokenSecurity(this.address);
    this.tokenSecurity = tokenSecurity;
    return this.tokenSecurity;
  }

  async craftWalletsTable(): Promise<string> {
    const wallets = await this.getWalletsWithStats({ limit: 20 });
    const walletsTable = constructWalletsTable(wallets);
    return walletsTable;
  }

  craftWalletLinks(): string {
    const wallets = this.getWallets();
    const links = wallets.map((wallet) => {
      const addr = wallet.address.slice(-4);
      const url = wallet.getCandlestickUrl();
      return `<a href="${url}">${addr}</a>`;
    });
    return `View wallets: ${links.join(" | ")}`;
  }

  async craftTokenString(): Promise<string> {
    const tokenName = await this.getName();
    const tokenSymbol = this.symbol.toUpperCase();
    const tokenString = `Token: <b>${tokenName} ($${tokenSymbol})</b>`;

    const caString = `CA: <code>${this.address}</code>`;

    const creationDate = await this.getCreationDate();
    const ageString = `Token age: ${getRelativeDate(creationDate)}`;

    const honeypot = await this.getHoneypot();
    const honeypotString = formatHoneypot(honeypot, this.address);
    const taxString = formatTaxString(honeypot);

    const tokenSecurity = await this.getTokenSecurity();
    const ownershipString = formatOwnership(tokenSecurity, this.address);

    const walletCount = this.getWalletCount();
    const distinctWalletsString = `Distinct wallets: ${walletCount}`;

    const totalTxnValue = this.getTotalTxnValue();
    const totalTxnValueString = `Total txn value: $${totalTxnValue.toLocaleString()}`;

    const tokenUrl = `https://www.candlestick.io/crypto/${this.address}`;
    const tokenLinkString = `<a href="${tokenUrl}">View ${tokenSymbol} on candlestick.io</a>`;

    const txns = this.transactions;
    const transactionsTable = constructTxnsTable(txns);

    const walletsTable = await this.craftWalletsTable();
    const walletLinks = this.craftWalletLinks();

    const message = [
      tokenString,
      caString,
      ageString,
      honeypotString,
      ownershipString,
      taxString + "\n",
      distinctWalletsString,
      totalTxnValueString,
      tokenLinkString + "\n",
      transactionsTable,
      walletsTable,
      walletLinks,
    ]
      .filter(Boolean)
      .join("\n");

    return message;
  }
}

export default Token;
