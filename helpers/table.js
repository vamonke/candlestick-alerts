import { markdownTable } from "markdown-table";
import {
  formatPrice,
  formatTimestamp,
  formatValue,
  parseUtcTimeString,
} from "./parse";

const MAX_TABLE_ROWS = 20;

const TXN_TABLE_HEADERS = ["Addr", "Src", "Price", "TxnVal", "Time"];
const TXN_TABLE_MIN_ROWS = 2;
export const constructTxnsTable = (transactions) => {
  const length = transactions.length;
  const rowCount = Math.min(length, MAX_TABLE_ROWS);
  const rows = transactions.slice(0, rowCount);
  const paddingCount = Math.max(0, TXN_TABLE_MIN_ROWS - length);
  const columnCount = TXN_TABLE_HEADERS.length;
  const tableArray = [
    TXN_TABLE_HEADERS,
    ...rows.map((txn) => [
      txn.address.slice(-4),
      txn.fundingSource,
      formatPrice(txn.buy_price),
      formatValue(txn.txn_value),
      formatTimestamp(parseUtcTimeString(txn.time)),
    ]),
    ...Array(paddingCount).fill(Array(columnCount).fill("")),
  ];
  const table = markdownTable(tableArray, {
    align: ["l", "l", "r", "r", "l"],
    padding: true,
    delimiterStart: false,
    delimiterEnd: false,
  });
  const remainderText = showRemaining(length, rowCount);
  return (
    `📈 <b>Transactions</b>\n` + `<pre>` + table + remainderText + `</pre>`
  );
};

const TXN_TABLE_2_HEADERS = ["Addr", "Price", "TxnVal", "Time"];
export const constructTxnsTable2 = (transactions) => {
  const count = Math.min(transactions.length, MAX_TABLE_ROWS);
  const rows = transactions.slice(0, count);
  const table = markdownTable(
    [
      TXN_TABLE_2_HEADERS,
      ...rows.map((txn) => [
        txn.address.slice(-4),
        formatPrice(txn.buy_price),
        formatValue(txn.txn_value),
        formatTimestamp(txn.time),
      ]),
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
const WALLET_TABLE_MIN_ROWS = 1;
export const constructWalletsTable = (distinctAddresses) => {
  const length = distinctAddresses.length;
  const rowCount = Math.min(length, MAX_TABLE_ROWS);
  const rows = distinctAddresses.slice(0, rowCount);
  const paddingCount = Math.max(0, WALLET_TABLE_MIN_ROWS - length);
  const columnCount = WALLET_TABLE_HEADERS.length;
  const tableArray = [
    WALLET_TABLE_HEADERS,
    ...rows.map((wallet) => {
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
    ...Array(paddingCount).fill(Array(columnCount).fill("")),
  ];
  const table = markdownTable(
    tableArray,

    {
      align: ["l", "r", "r", "r"],
      padding: true,
      delimiterStart: false,
      delimiterEnd: false,
    }
  );
  const remainderText = showRemaining(length, rowCount);
  return (
    `\n📊 <b>Wallet stats</b>\n` + `<pre>` + table + remainderText + `</pre>`
  );
};

export const constructWalletLinks = (addresses) => {
  const count = Math.min(addresses.length, MAX_TABLE_ROWS);
  const links = addresses.slice(0, count).map((wallet) => {
    const addr = wallet.address.slice(-4);
    const url = wallet.link;
    return `<a href="${url}">${addr}</a>`;
  });
  return `View wallets: ${links.join(" | ")}`;
};

const showRemaining = (length, rowCount) => {
  const remainder = length - rowCount;
  return remainder > 0 ? `\n... and ${remainder} more` : "";
};
