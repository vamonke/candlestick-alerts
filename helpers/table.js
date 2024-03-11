import { markdownTable } from "markdown-table";
import {
  formatPrice,
  formatTimestamp,
  formatValue,
  parseUtcTimeString,
} from "./parse";

const TXN_TABLE_HEADERS = ["Addr", "Src", "Price", "TxnVal", "Time"];
const TXN_TABLE_MIN_ROWS = 2;
export const constructTxnsTable = (transactions) => {
  const table = markdownTable(
    [
      TXN_TABLE_HEADERS,
      ...transactions.map((txn) => [
        txn.address.slice(-4),
        txn.fundingSource,
        formatPrice(txn.buy_price),
        formatValue(txn.txn_value),
        formatTimestamp(parseUtcTimeString(txn.time)),
      ]),
      ...Array(Math.max(0, TXN_TABLE_MIN_ROWS - transactions.length)).fill(
        Array(TXN_TABLE_HEADERS.length).fill("")
      ), // Add empty rows to fill up to 2 rows
    ],
    {
      align: ["l", "l", "r", "r", "l"],
      padding: true,
      delimiterStart: false,
      delimiterEnd: false,
    }
  );
  return `📈 <b>Transactions</b>\n` + `<pre>` + table + `</pre>`;
};

const TXN_TABLE_2_HEADERS = ["Addr", "Price", "TxnVal", "Time"];
export const constructTxnsTable2 = (transactions) => {
  const table = markdownTable(
    [
      TXN_TABLE_2_HEADERS,
      ...transactions.map((txn) => [
        txn.address.slice(-4),
        formatPrice(txn.buy_price),
        formatValue(txn.txn_value),
        formatTimestamp(txn.time),
      ]),
      // ...Array(Math.max(0, 2 - transactions.length)).fill(
      //   Array(TXN_TABLE_2_HEADERS.length).fill("")
      // ), // Add empty rows to fill up to 2 rows
    ],
    {
      align: ["l", "r", "r", "l"],
      padding: true,
      delimiterStart: false,
      delimiterEnd: false,
    }
  );
  return `📈 <b>Transactions</b>\n` + `<pre>` + table + `</pre>`;
};

const WALLET_TABLE_HEADERS = ["Addr", "Win Rate", "ROI", "Tokens"];
const WALLET_TABLE_MIN_ROWS = 2;
export const constructWalletsTable = (distinctAddresses) => {
  const table = markdownTable(
    [
      WALLET_TABLE_HEADERS,
      ...distinctAddresses.map((wallet) => {
        const addr = wallet.address.slice(-4);
        const winRate = isNaN(wallet.winRate)
          ? "-"
          : (wallet.winRate * 100).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) + "%";
        const roi = isNaN(wallet.roi)
          ? "-"
          : (wallet.roi * 100).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) + "%";
        const coinTraded = isNaN(wallet.coinTraded) ? "-" : wallet.coinTraded;
        return [addr, winRate, roi, coinTraded];
      }),
      ...Array(
        Math.max(0, WALLET_TABLE_MIN_ROWS - distinctAddresses.length)
      ).fill(Array(WALLET_TABLE_HEADERS.length).fill("")),
    ],
    {
      align: ["l", "r", "r", "r"],
      padding: true,
      delimiterStart: false,
      delimiterEnd: false,
    }
  );
  return `\n📊 <b>Wallet stats</b>\n` + `<pre>` + table + `</pre>`;
};

export const constructWalletLinks = (addresses) => {
  const links = addresses.map((wallet) => {
    const addr = wallet.address.slice(-4);
    const url = wallet.link;
    return `<a href="${url}">${addr}</a>`;
  });
  return `View wallets: ${links.join(" | ")}`;
};
