import { markdownTable } from "markdown-table";
import {
  formatPrice,
  formatTimestamp,
  formatValue,
  parseUtcTimeString,
} from "./parse";

export const constructTxnsTable = (transactions) => {
  const table = markdownTable(
    [
      ["Addr", "Src", "Price", "TxnVal", "Time"],
      ...transactions.map((txn) => [
        txn.address.slice(-4),
        txn.fundingSource,
        formatPrice(txn.buy_price),
        formatValue(txn.txn_value),
        formatTimestamp(parseUtcTimeString(txn.time)),
      ]),
      ...Array(Math.max(0, 2 - transactions.length)).fill(["", "", "", "", ""]), // Add empty rows to fill up to 2 rows
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

export const constructTxnsTable2 = (transactions) => {
  const table = markdownTable(
    [
      ["Addr", "Price", "TxnVal", "Time"],
      ...transactions.map((txn) => [
        txn.address.slice(-4),
        formatPrice(txn.buy_price),
        formatValue(txn.txn_value),
        formatTimestamp(txn.time),
      ]),
      // ...Array(Math.max(0, 2 - transactions.length)).fill(["", "", "", ""]), // Add empty rows to fill up to 2 rows
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

export const constructWalletLinks = (addresses) => {
  const links = addresses.map((wallet) => {
    const addr = wallet.address.slice(-4);
    const url = wallet.link;
    return `<a href="${url}">${addr}</a>`;
  });
  return `View wallets: ${links.join(", ")}`;
};
