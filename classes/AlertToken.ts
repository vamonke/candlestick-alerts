import { sendError, sendMessage } from "@/helpers/send";
import { supabaseClient } from "@/helpers/supabase";
import { constructTxnsTable, constructWalletsTable } from "@/helpers/table";
import { Message } from "grammy/types";
import Alert from "./Alert";
import Token from "./Token";
import Wallet from "./Wallet";
import { CandlestickTransaction } from "./types";

class AlertToken {
  public id: number;
  public alert: Alert;
  public transactions: CandlestickTransaction[] = [];
  public token: Token;
  public message: Message.TextMessage;

  constructor({
    id,
    alert,
    token,
    transactions,
  }: {
    id?: number;
    alert: Alert;
    token: Token;
    transactions?: CandlestickTransaction[];
  }) {
    this.id = id;
    this.alert = alert;
    this.token = token;
    this.transactions = transactions || [];
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

  async craftActivitiesString(): Promise<string> {
    const walletCount = this.getWalletCount();
    const distinctWalletsString = `Distinct wallets: ${walletCount}`;

    const totalTxnValue = this.getTotalTxnValue();
    const totalTxnValueString = `Total txn value: $${totalTxnValue.toLocaleString()}`;

    const tokenSymbol = this.token.symbol.toUpperCase();
    const tokenUrl = `https://www.candlestick.io/crypto/${this.token.address}`;
    const tokenLinkString = `<a href="${tokenUrl}">View ${tokenSymbol} on candlestick.io</a>`;

    const txns = this.transactions;
    const transactionsTable = constructTxnsTable(txns);

    const walletsTable = await this.craftWalletsTable();
    const walletLinks = this.craftWalletLinks();

    const result = [
      distinctWalletsString,
      totalTxnValueString,
      tokenLinkString + "\n",
      transactionsTable,
      walletsTable,
      walletLinks,
    ]
      .filter(Boolean)
      .join("\n");

    return result;
  }

  async craftMessage(): Promise<string> {
    const alertString = this.alert.craftAlertString();
    const tokenString = await this.token.craftTokenString();
    const activitiesString = await this.craftActivitiesString();

    const result = [alertString, tokenString, activitiesString].join("\n\n");
    return result;
  }

  async sendAlert(): Promise<void> {
    const text = await this.craftMessage();
    const result = await sendMessage(text, {
      inline_keyboard: [
        [
          {
            text: "Refresh",
            callback_data: "refresh",
          },
        ],
      ],
    });
    if (!result) return;

    this.message = result;
    await this.token.save();
    await this.save();
  }

  async save(): Promise<void> {
    const alertMessage = {
      alert_id: this.alert.id,
      transactions: this.transactions,
      token_address: this.token.address,
      message_id: this.message.message_id,
      chat_id: this.message.chat.id,
    };
    const { error } = await supabaseClient
      .from("alert_messages")
      .insert(alertMessage);
    if (error) {
      sendError({ message: "Error saving alert message", error });
    }
  }
}

export default AlertToken;
