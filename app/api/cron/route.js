import { markdownTable } from "markdown-table";
import { unstable_noStore as noStore } from "next/cache";

import { getAuthToken } from "../../../helpers/auth";
import * as CONFIG from "../../../helpers/config";
import {
  getContractCreation,
  getContractInfo,
} from "../../../helpers/contract";
import { getRelativeDate, parseUtcTimeString } from "../../../helpers/parse";
import { fetchPortfolioAESKey, hash } from "../../../helpers/portfolioAESKey";
import { sendError, sendMessage } from "../../../helpers/send";
import {
  constructTxnsTable,
  constructWalletLinks,
} from "../../../helpers/table";
import MOCK_DATA from "../../../mock-data.json";
import { getCandleStickUrl } from "../../../helpers/candlestick";

const { USE_MOCK_DATA } = CONFIG;

export const maxDuration = 60; // This function can run for a maximum of 60 seconds

const ALERTS = [
  {
    name: "🔴 Alert 1 - Stealth Wallets (1D, 1 token)",
    pageSize: 100,
    valueFilter: 120,
    walletAgeDays: 1,
    boughtTokenLimit: true, // Tokens bought <= 2
    minsAgo: 5,
    // minsAgo: 10, // For testing
    minDistinctWallets: 3,
    excludedTokens: ["WETH", "weth"],
    showWalletLinks: true,
  },
  {
    name: "🟠 Alert 2 - Stealth Wallets (7D, any token)",
    pageSize: 100,
    valueFilter: 120,
    walletAgeDays: 7,
    boughtTokenLimit: false, // Any tokens bought
    minsAgo: 5,
    // minsAgo: 100, // For testing
    minDistinctWallets: 4,
    excludedTokens: ["WETH", "weth"],
    showWalletStats: true,
    // walletStats: {
    //   rule: "any",
    //   minWinRate: 0.75,
    //   // minRoi: 0.5,
    // },
    showWalletLinks: true,
  },
];

export async function GET() {
  noStore();
  try {
    return await handler();
  } catch (error) {
    sendError(error);
    return Response.json({ ok: false, error });
  }
}

const handler = async () => {
  console.log("🚀 Running cron job");
  console.log(`Config: ${JSON.stringify(CONFIG, null, 2)}`);
  const token = await getAuthToken();
  const portfolioAESKey = await fetchPortfolioAESKey();

  if (!token) {
    const error = "⁉️ Missing token";
    sendError(error);
    return Response.json({ error }, { status: 500 });
  }

  console.log(`Alerts to execute: ${ALERTS.length}`);

  for (const [index, alert] of ALERTS.entries()) {
    console.log(`Executing alert ${index + 1}: ${alert.name}`);
    console.log(`Parameters: ${JSON.stringify(alert, null, 2)}`);
    try {
      await executeAlert({ alert, authToken: token, portfolioAESKey });
      console.log(`Finished executing alert ${index + 1}: ${alert.name}`);
    } catch (error) {
      sendError({ message: "Error executing alert", error });
    }
  }

  return Response.json({ success: true }, { status: 200 });
};

const getStealthWallets = async ({ url, authToken }) => {
  try {
    const result = await fetch(url, {
      headers: {
        "x-authorization": authToken,
        "Content-Type": "application/json",
      },
      method: "GET",
    });
    const json = await result.json();
    console.log(
      "✅ Fetched stealth wallets -",
      json.data.chart.length,
      "transactions"
    );
    return json;
  } catch (error) {
    sendError({ message: "Error fetching stealth wallets", error });
    console.log("Error fetching stealth wallets", error);
    return null;
  }
};

// const refreshToken = (refreshToken) => {
//   fetch("https://www.candlestick.io/api/v2/user/refresh-token", {
//     headers: {
//       accept: "application/json",
//       "content-type": "application/json",
//     },
//     body: JSON.stringify({ refresh: refreshToken }),
//     method: "PUT",
//   });
//   // returns
//   //   {
//   //     "code": 1,
//   //     "message": null,
//   //     "data": {
//   //         "token": "eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiJmYjM0ODM3MS1mZmI1LTQ0OTQtYWI4Ni04MjU3ODZmYjAwMTciLCJyZWZyZXNoVG9rZW5JZCI6MTE4NDEyLCJ1c2VySWQiOjE5MzYwLCJleHAiOjE3MDg0Mzg0MDgsImlhdCI6MTcwODQzODEwOH0.EMoO3YbXwxydhx9FW6zZT0ZJrfJwl61dgE-wzFHVNVvmDncno1XLLgLqX_59XH21uP9R5LNenhcOUmrPF97pGg"
//   //     },
//   //     "extra": null
//   // }
// };

const evaluateTransactions = ({ transactions, alert }) => {
  const {
    minsAgo,
    minDistinctWallets,
    excludedTokens,
    // valueFilter,
    // walletAgeDays,
  } = alert;

  let currentTime = new Date();
  if (USE_MOCK_DATA) {
    currentTime = parseUtcTimeString(transactions[0].time);
  }
  const startTime = new Date(currentTime.getTime() - minsAgo * 60 * 1000);

  // console.log("Start time:", startTime);
  console.log("Evaluating transactions..");
  // console.log(transactions[0]);

  const tokensMap = {};
  transactions
    .filter((txn) => {
      const time = parseUtcTimeString(txn.time);
      return time > startTime;
    })
    .forEach((txn) => {
      const { address, buy_token_symbol, buy_token_address } = txn;
      const tokenObj = tokensMap[buy_token_address];
      if (excludedTokens.includes(buy_token_symbol)) {
        return;
      } else if (tokenObj) {
        tokenObj.addressSet.add(address);
        tokenObj.transactions.push(txn);
      } else {
        tokensMap[buy_token_address] = {
          buy_token_address,
          buy_token_symbol,
          addressSet: new Set([address]),
          transactions: [txn],
        };
      }
    });

  let matchedTokens = [];

  console.log("Token map:");
  if (Object.keys(tokensMap).length === 0) {
    console.log("(empty)");
  }

  for (const token in tokensMap) {
    const tokenObj = tokensMap[token];
    const { buy_token_symbol, addressSet } = tokenObj;
    const distinctAddressesCount = addressSet.size;

    tokenObj.distinctAddressesCount = distinctAddressesCount;
    tokenObj.distinctAddresses = Array.from(addressSet).map((addr) => ({
      address: addr,
    }));

    const totalTxnValue = tokenObj.transactions.reduce(
      (acc, txn) => acc + txn.txn_value,
      0
    );
    tokenObj.totalTxnValue = totalTxnValue;

    const log = {
      token: tokenObj.buy_token_symbol,
      contract_address: tokenObj.buy_token_address,
      transactions: tokenObj.transactions.length,
      distinctAddressesCount: tokenObj.distinctAddressesCount,
      distinctAddresses: tokenObj.distinctAddresses,
    };
    console.log(JSON.stringify(log, null, 2));

    if (excludedTokens.includes(buy_token_symbol)) {
      continue;
    }

    if (distinctAddressesCount < minDistinctWallets) {
      continue;
    }

    matchedTokens.push(tokenObj);
  }

  matchedTokens = matchedTokens.sort(
    (a, b) => b.distinctAddressesCount - a.distinctAddressesCount
  );

  return { tokensMap, matchedTokens };
};

const evaluateWallets = async ({ alert, matchedTokens }) => {
  const { walletStats } = alert;

  if (!walletStats) {
    return { matchedTokens };
  }

  const { rule: operator, minWinRate, minRoi } = walletStats;

  const evaluateWallet = ({ winRate, roi }) => {
    if (!isNaN(winRate) && !isNaN(minWinRate)) {
      if (winRate < minWinRate) {
        return false;
      }
    }

    if (!isNaN(roi) && !isNaN(minRoi)) {
      if (roi < minRoi) {
        return false;
      }
    }

    return true;
  };

  console.log("Evaluating wallets..");

  const matches = matchedTokens.filter(({ distinctAddresses }) => {
    if (operator === "every") {
      return distinctAddresses.every(evaluateWallet);
    } else if (operator === "any") {
      return distinctAddresses.some(evaluateWallet);
    } else {
      return true; // No wallet stats rule
    }
  });

  console.log("✅ Matched wallets:", matches.length, "tokens");

  return { matchedTokens: matches };
};

const craftMessage = ({ alert, matchedTokens }) => {
  const {
    name,
    minsAgo,
    minDistinctWallets,
    boughtTokenLimit,
    valueFilter,
    walletAgeDays,
    walletStats,
    showWalletStats,
  } = alert;

  const minRoi = walletStats?.minRoi;
  const minWinRate = walletStats?.minWinRate;

  if (matchedTokens.length === 0) {
    return `🥱 No tokens have been purchased by ${minDistinctWallets} stealth wallets in the past ${minsAgo} mins`;
  }

  // Alert name
  const nameString = `<b><i>${name}</i></b>`;

  // Alert conditions
  const valueFilterString = `Buy ≥ $${valueFilter.toLocaleString()}`;
  const walletAgeString = `Wallet age ≤ ${walletAgeDays}D`;
  const minDistinctWalletsString = `Distinct wallets ≥ ${minDistinctWallets}`;
  const boughtTokenLimitString = boughtTokenLimit ? "Tokens bought ≤ 2" : null;
  const walletRoiString =
    showWalletStats && !isNaN(minRoi) ? `ROI ≥ ${minRoi * 100}%` : null;
  const walletWinRateString =
    showWalletStats && !isNaN(minWinRate)
      ? `Win rate ≥ ${minWinRate * 100}%`
      : null;
  const windowString = `Past ${minsAgo} mins`;
  const alertConditionsString =
    `<i>` +
    [
      valueFilterString,
      walletAgeString,
      boughtTokenLimitString,
      walletRoiString,
      minDistinctWalletsString,
      walletWinRateString,
      windowString,
    ]
      .filter(Boolean)
      .join(", ") +
    `</i>`;

  // Matched tokens
  const matchedTokensStrings = matchedTokens.map((tokenObj) => {
    return craftMatchedTokenString({ alert, tokenObj });
  });

  const message = [
    nameString,
    alertConditionsString + "\n",
    matchedTokensStrings.join("\n\n"),
  ].join("\n");

  return message;
};

const craftMatchedTokenString = ({ alert, tokenObj }) => {
  const { showWalletStats, showWalletLinks } = alert;
  const {
    buy_token_symbol,
    distinctAddressesCount,
    totalTxnValue,
    buy_token_address,
    transactions,
    distinctAddresses,
    tokenName,
    creationDate,
  } = tokenObj;

  const tokenString = `Token: <b>${
    tokenName ?? buy_token_symbol
  } ($${buy_token_symbol.toUpperCase()})</b>`;
  const caString = `CA: <code>${buy_token_address}</code>`;
  const ageString = `Token age: ${getRelativeDate(creationDate)}`;
  const distinctWalletsString = `Distinct wallets: ${distinctAddressesCount}`;
  const totalTxnValueString = `Total txn value: $${totalTxnValue.toLocaleString()}`;
  const tokenLinkString = `<a href="https://www.candlestick.io/crypto/${buy_token_address}">View ${buy_token_symbol} on candlestick.io</a>`;
  const transactionsTable = constructTxnsTable(transactions);

  const walletsTable = showWalletStats
    ? constructWalletsTable(distinctAddresses)
    : null;

  const walletLinks = showWalletLinks
    ? constructWalletLinks(distinctAddresses)
    : null;

  const message = [
    tokenString,
    caString,
    ageString,
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
};

const constructWalletsTable = (distinctAddresses) => {
  const table = markdownTable(
    [
      ["Addr", "Win Rate", "ROI", "Tokens"],
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
      ...(distinctAddresses.length <= 3 ? [["", "", "", ""]] : []),
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

const executeAlert = async ({ alert, authToken, portfolioAESKey }) => {
  const {
    pageSize,
    walletAgeDays,
    valueFilter,
    boughtTokenLimit,
    walletStats,
    showWalletStats,
    showWalletLinks,
  } = alert;

  let steathMoney = [];
  if (USE_MOCK_DATA) {
    steathMoney = MOCK_DATA;
  } else {
    const baseUrl =
      "https://www.candlestick.io/api/v1/stealth-money/degen-explorer-by-stealth-money";

    const urlParams = new URLSearchParams({
      current_page: 1,
      page_size: pageSize,
      sort_type: 3,
      oriented: 1,
      blockchain_id: 2,
      exploreType: "token",
      days: walletAgeDays,
      value_filter: valueFilter,
      include_noise_trades: false,
      fundingSource: "ALL",
      boughtTokenLimit: boughtTokenLimit,
      hide_first_mins: 0,
      activeSource: "ETH",
    });

    const url = `${baseUrl}?${urlParams.toString()}`;
    console.log("🔗 Fetching stealth wallets from:", url);
    steathMoney = await getStealthWallets({ url, authToken });
  }

  const transactions = steathMoney.data.chart;
  let { matchedTokens, tokensMap } = evaluateTransactions({
    transactions,
    alert,
  });

  if (walletStats || showWalletStats) {
    await addBuyerStats({ matchedTokens, authToken, portfolioAESKey });
  }

  if (walletStats) {
    const results = await evaluateWallets({
      alert,
      matchedTokens,
    });
    matchedTokens = results.matchedTokens;
  }

  if (matchedTokens.length === 0) {
    console.log("🥱 No token satisfies conditions");
    return Response.json({ matchedTokens }, { status: 200 });
  }

  await attachTokensInfo({ matchedTokens });

  if (showWalletLinks) {
    matchedTokens.forEach((tokenObj) => {
      tokenObj.distinctAddresses.forEach((wallet) => {
        wallet.link = getCandleStickUrl(wallet.address, portfolioAESKey);
      });
    });
  }

  const message = craftMessage({ alert, matchedTokens });
  console.log("\n\nMessage:\n" + message);

  await sendMessage(message);
};

const attachTokensInfo = async ({ matchedTokens }) => {
  await Promise.all(
    matchedTokens.map(async (tokenObj) => {
      const contractAddress = tokenObj.buy_token_address;
      const timestamp = await getContractCreation(contractAddress);
      if (timestamp) {
        tokenObj.creationDate = timestamp;
      }
      const contractInfo = await getContractInfo(contractAddress);
      if (contractInfo?.name) {
        tokenObj.tokenName = contractInfo.name;
      }
    })
  );
};

const addBuyerStats = async ({ matchedTokens, authToken, portfolioAESKey }) => {
  if (matchedTokens.length === 0) {
    console.log("addBuyerStats: No matched tokens");
    return;
  }

  console.log(`Fetching wallet stats for ${matchedTokens.length} tokens..`);
  await Promise.all(
    matchedTokens.map(async (tokenObj) => {
      const { distinctAddresses } = tokenObj;
      console.log(`Fetching ${distinctAddresses.length} wallet stats..`);
      await Promise.all(
        distinctAddresses.map(async (buyer) => {
          const walletAddressHash = hash(buyer.address, portfolioAESKey);
          const walletPerformance = await getWalletPerformance({
            walletAddressHash,
            authToken,
          });

          const winRate = walletPerformance?.stat?.est_win_Rate;
          const roi = walletPerformance?.stat?.est_profit_ratio;
          const coinTraded = walletPerformance?.stat?.coin_traded;

          buyer.winRate = winRate;
          buyer.roi = roi;
          buyer.coinTraded = coinTraded;

          console.log("📊 Wallet stats:", buyer);
        })
      );
    })
  );
};

const getWalletPerformance = async ({ walletAddressHash, authToken }) => {
  try {
    const baseUrl =
      "https://www.candlestick.io/api/v1/trading-performance/trading-performance-table";
    const params = new URLSearchParams({
      current_page: 1,
      page_size: 15,
      blockchain_id: 2,
      wallet_address: walletAddressHash,
      active_in: 0,
      first_in: 1,
    });
    const url = `${baseUrl}?${params}`;
    console.log("🔗 Fetching wallet performance:", url);
    const result = await fetch(url, {
      headers: { "x-authorization": authToken },
    });
    const json = await result.json();
    const data = json.data;
    console.log("Received wallet performance:", data);
    return data;
  } catch (error) {
    console.error("Error fetching wallet performance:", error);
    return null;
  }
};
