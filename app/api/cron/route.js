import { unstable_noStore as noStore } from "next/cache";

import { getAuthToken } from "../../../helpers/auth";
import { addBuyerStats, getCandleStickUrl } from "../../../helpers/candlestick";
import * as CONFIG from "../../../helpers/config";
import {
  getContractCreation,
  getContractInfo,
} from "../../../helpers/contract";
import { checkHoneypot } from "../../../helpers/honeypot";
import {
  formatHoneypot,
  formatTaxString,
  getRelativeDate,
  parseUtcTimeString,
} from "../../../helpers/parse";
import { fetchPortfolioAESKey } from "../../../helpers/portfolioAESKey";
import { sendError, sendMessage } from "../../../helpers/send";
import { insertTokens } from "../../../helpers/supabase";
import {
  constructTxnsTable,
  constructWalletLinks,
  constructWalletsTable,
} from "../../../helpers/table";
import MOCK_DATA from "../../../mock/mock-data.json";
import { getOwnership, getTokenSecurity } from "@/helpers/goplus";

const { USE_MOCK_DATA, CANDLESTICK_PROXY } = CONFIG;

export const maxDuration = 60; // This function can run for a maximum of 60 seconds

const ALERTS = [
  {
    name: "🔴 Alert 1 - Stealth Wallets (1D, 1 token)",
    pageSize: 100,
    valueFilter: 120,
    walletAgeDays: 1,
    boughtTokenLimit: true, // Tokens bought <= 2
    minsAgo: 5,
    // minsAgo: 300, // For testing
    minDistinctWallets: 3,
    excludedTokens: ["WETH", "weth"],
    showWalletLinks: true,
    showWalletStats: true,
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
    // TODO: Handle failed response
    const json = await result.json();
    console.log(
      "✅ Fetched stealth wallets -",
      json.data.chart.length,
      "transactions"
    );
    return json;
  } catch (error) {
    sendError({ message: "Error fetching stealth wallets", error });
    return null;
  }
};

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

/**
 Sample token object:
  {
    "buy_token_symbol": "WETH",
    "buy_token_address": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    "addressSet": Set(2) { "0x1", "0x2" },
    "transactions": [
      {
        "address": "0x1",
        "time": "2021-09-10T10:00:00Z",
        "txn_value": 100
      },
      {
        "address": "0x2",
        "time": "2021-09-10T10:00:00Z",
        "txn_value": 100
      }
    ]
  }
*/

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
    honeypot,
    tokenSecurity,
  } = tokenObj;

  const tokenNameString = tokenName ?? buy_token_symbol;
  const tokenSymbolString = buy_token_symbol.toUpperCase();
  const tokenString = `Token: <b>${tokenNameString} ($${tokenSymbolString})</b>`;
  const caString = `CA: <code>${buy_token_address}</code>`;
  const ageString = `Token age: ${getRelativeDate(creationDate)}`;
  const honeypotString = formatHoneypot(honeypot, buy_token_address);
  const taxString = formatTaxString(honeypot);
  const ownershipString = `Ownership: ${getOwnership(tokenSecurity)}`;
  const distinctWalletsString = `Distinct wallets: ${distinctAddressesCount}`;
  const totalTxnValueString = `Total txn value: $${totalTxnValue.toLocaleString()}`;
  const tokenUrl = `https://www.candlestick.io/crypto/${buy_token_address}`;
  const tokenLinkString = `<a href="${tokenUrl}">View ${buy_token_symbol} on candlestick.io</a>`;
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
    const baseUrl = `${CANDLESTICK_PROXY}/api/v1/stealth-money/degen-explorer-by-stealth-money`;

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
    await addBuyerStats({ tokens: matchedTokens, authToken, portfolioAESKey });
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

  await insertTokens(
    matchedTokens.map((token) => ({
      address: token.buy_token_address,
      name: token.tokenName,
      symbol: token.buy_token_symbol,
    }))
  );

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

      const honeypot = await checkHoneypot(contractAddress);
      if (honeypot) {
        tokenObj.honeypot = honeypot;
      }

      const tokenSecurity = await getTokenSecurity(contractAddress);
      if (tokenSecurity) {
        tokenObj.tokenSecurity = tokenSecurity;
      }
    })
  );
};
