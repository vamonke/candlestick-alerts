import { markdownTable } from "markdown-table";
import { parseDate, parsePrice, parseValue, utcToSgt } from "./parse";

export const constructTxnsTable = (transactions) => {
  const table = markdownTable(
    [
      ["Addr", "Src", "Price", "TxnVal", "Time"],
      ...transactions.map((txn) => [
        txn.address.slice(-4),
        txn.fundingSource,
        parsePrice(txn.buy_price),
        parseValue(txn.txn_value),
        parseDate(txn.time).toLocaleTimeString("en-US", {
          timeZone: "Asia/Singapore",
          hour12: false, // Use 24-hour time format
          hour: "2-digit", // 2-digit hour representation
          minute: "2-digit", // 2-digit minute representation
          second: "2-digit", // 2-digit second representation (optional)
        }),
      ]),
      ...(transactions.length <= 3 ? [["", "", "", "", ""]] : []),
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
        parsePrice(txn.buy_price),
        parseValue(txn.txn_value),
        txn.date.toLocaleTimeString("en-US", {
          timeZone: "Asia/Singapore",
          hour12: false, // Use 24-hour time format
          hour: "2-digit", // 2-digit hour representation
          minute: "2-digit", // 2-digit minute representation
          second: "2-digit", // 2-digit second representation (optional)
        }),
      ]),
      ...Array(Math.max(0, 4 - transactions.length)).fill(["", "", "", ""]), // Add empty rows to fill up to 4 rows
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
