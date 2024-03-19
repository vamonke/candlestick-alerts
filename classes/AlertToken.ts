import { sendError, sendMessageV2 } from "@/helpers/send";
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
  public message: Message.CommonMessage;

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
    console.log("Crafting token message...");
    const alertString = this.alert.craftAlertString();
    const tokenString = await this.token.craftTokenString();
    const activitiesString = await this.craftActivitiesString();
    
    const result = [alertString, tokenString, activitiesString].join("\n\n");
    console.log("✅ Finished crafting token message");
    return result;
  }

  async sendAlert(): Promise<void> {
    const text = await this.craftMessage();
    const chatIds = this.alert.recipientIds;
    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: "🔃 Refresh",
            callback_data: "refresh",
          },
        ],
      ],
    };
    console.log("Sending alerts to chatIds:", chatIds);
    await Promise.all(
      chatIds.map(async (chatId) => {
        const result = await sendMessageV2(chatId, text, replyMarkup);
        if (!result) return;
        this.message = result;
        await this.token.save();
        await this.save();
      })
    );
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
    } else {
      console.log("✅ Saved alert token", this.token.address);
    }
  }

  static async getAlertTokenFromMessage(
    message: Message.CommonMessage
  ): Promise<AlertToken | null> {
    const {
      message_id: messageId,
      chat: { id: chatId },
    } = message;

    const { data, error } = await supabaseClient
      .from("alert_messages")
      .select("*, alerts(*), tokens(*)")
      .eq("message_id", messageId)
      .eq("chat_id", chatId)
      .single();

    if (error) {
      console.error(error);
      return null;
    }

    const alertToken = new AlertToken({
      id: data.id,
      transactions: data.transactions,
      alert: new Alert({
        id: data.alerts.id,
        name: data.alerts.name,
        query: data.alerts.query,
        filter: data.alerts.filter,
        recipientIds: data.alerts.recipient_ids,
      }),
      token: new Token({
        name: data.tokens.name,
        symbol: data.tokens.symbol,
        address: data.tokens.address,
        creationDate: data.tokens.creation_date,
      }),
    });

    return alertToken;
  }
}

export default AlertToken;
