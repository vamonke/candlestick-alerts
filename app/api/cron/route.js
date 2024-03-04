import { unstable_noStore as noStore } from "next/cache";
import { markdownTable } from "markdown-table";
import CryptoJS from "crypto-js";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import bot from "../../../bot";
import MOCK_DATA from "../../../mock-data.json";
import { getAuthToken } from "../../../helpers/auth";

const USE_MOCK_DATA = false;
const DEV_MODE = process.env.VERCEL_ENV === "development";
const SEND_MESSAGE = [
  "production",
  // toggle below to enable/disable sending messages in dev mode
  "development",
  // toggle above to enable/disable sending messages in dev mode
].includes(process.env.VERCEL_ENV);

const CONFIG = {
  DEV_MODE,
  SEND_MESSAGE,
  USE_MOCK_DATA,
};

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
  },
  {
    name: "🟠 Alert 2 - Stealth Wallets (7D, any token)",
    pageSize: 100,
    valueFilter: 120,
    walletAgeDays: 7,
    boughtTokenLimit: false, // Any tokens bought
    minsAgo: 5,
    // minsAgo: 10, // For testing
    minDistinctWallets: 3,
    excludedTokens: ["WETH", "weth"],
    showWalletStats: true,
    walletStats: {
      rule: "any",
      minWinRate: 0.75,
      // minRoi: 0.5,
    },
  },
];

dayjs.extend(duration);

export async function GET() {
  console.log("🚀 Running cron job");
  console.log(`Config: ${JSON.stringify(CONFIG, null, 2)}`);

  noStore();
  const token = await getAuthToken();

  if (!token) {
    const error = "⁉️ Missing token";
    sendError(error);
    return Response.json({ error }, { status: 500 });
  }

  console.log(`Alerts to execute: ${ALERTS.length}`);

  for (const [index, alert] of ALERTS.entries()) {
    console.log(`Executing alert ${index + 1}: ${alert.name}`);
    console.log(`Parameters: ${JSON.stringify(alert, null, 2)}`);
    await executeAlert({ alert, authToken: token });
    console.log(`Finished executing alert ${index + 1}: ${alert.name}`);
  }

  return Response.json({ success: true }, { status: 200 });
}

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
    currentTime = parseDate(transactions[0].time);
  }
  const startTime = new Date(currentTime.getTime() - minsAgo * 60 * 1000);

  // console.log("Start time:", startTime);
  console.log("Evaluating transactions..");
  // console.log(transactions[0]);

  const tokensMap = {};
  transactions
    .filter((txn) => {
      const time = parseDate(txn.time);
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

const evaluateWallets = async ({ alert, matchedTokens, authToken }) => {
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

  await addBuyerStats({ matchedTokens, authToken });

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

const parseDate = (utcTimeString) => {
  const [year, month, day, hour, minute, second] = utcTimeString.split(/[- :]/);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
};

const utcToSgt = (utcDate) => {
  const offset = 8;
  const sgtDate = new Date(utcDate.getTime() + offset * 60 * 60 * 1000);
  return sgtDate;
};

const parsePrice = (number) => {
  if (number >= 10) {
    return number.toPrecision(4);
  }

  if (number >= 1) {
    return number.toPrecision(4);
  }

  if (number >= 0.1) {
    return number.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }

  if (number >= 0.01) {
    return number.toLocaleString(undefined, {
      minimumFractionDigits: 5,
      maximumFractionDigits: 5,
    });
  }

  // Convert the number to scientific notation first to easily extract parts
  let scientificNotation = number.toExponential();
  let [base, exponent] = scientificNotation
    .split("e")
    .map((part) => parseFloat(part, 10));

  let zerosNeeded = Math.abs(exponent) - 1; // Subtract 1 to account for the digit before the decimal

  // Construct the custom format
  let formattedNumber = `0.0(${zerosNeeded})${base
    .toFixed(3)
    .replace(".", "")}`;
  return formattedNumber;
};

const parseValue = (number) => {
  return number.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
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
  const { showWalletStats } = alert;
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
  const ageString = `Token age: ${
    creationDate ? getAgeString(creationDate) : "-"
  }`;
  const distinctWalletsString = `Distinct wallets: ${distinctAddressesCount}`;
  const totalTxnValueString = `Total txn value: $${totalTxnValue.toLocaleString()}`;
  const tokenLinkString = `<a href="https://www.candlestick.io/crypto/${buy_token_address}">View on Candlestick</a>`;
  const transactionsTable = constructTxnsTable(transactions);

  const walletsTable = showWalletStats
    ? constructWalletsTable(distinctAddresses)
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
  ]
    .filter(Boolean)
    .join("\n");

  return message;
};

const getAgeString = (date) => {
  if (!date) return "-";

  const createdAt = dayjs(date);
  const duration = dayjs.duration(dayjs().diff(createdAt));

  const days = Math.floor(duration.asDays());
  const hours = duration.hours();
  const minutes = duration.minutes();

  let result = ``;
  if (days > 0) result += `${days} ${days > 1 ? "days" : "day"} `;
  if (hours > 0) result += `${hours} ${hours > 1 ? "hours" : "hour"} `;
  if (days === 0 && minutes > 0)
    result += `${minutes} ${minutes > 1 ? "minutes" : "minute"} `;
  result += `ago`;

  return result;
};

const constructTxnsTable = (transactions) => {
  const table = markdownTable(
    [
      ["Addr", "Src", "Price", "TxnVal", "Time"],
      ...transactions.map((txn) => [
        txn.address.slice(-4),
        txn.fundingSource,
        parsePrice(txn.buy_price),
        parseValue(txn.txn_value),
        utcToSgt(parseDate(txn.time)).toLocaleTimeString("en-SG", {
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
  return `\n📊 <b>Wallet stats</b>\n` + `<pre>` + table + `\n</pre>`;
};

const DEVELOPER_USER_ID = 265435469;
const USER_V_ID = 278239097;

const USER_IDS = [
  // dev
  DEVELOPER_USER_ID,
  USER_V_ID,
];

const sendMessage = async (message) => {
  const recipientIds = DEV_MODE ? [DEVELOPER_USER_ID] : USER_IDS;
  if (DEV_MODE) {
    console.log("👨‍💻 Running in dev mode", recipientIds);
  }
  for (const userId of recipientIds) {
    if (!SEND_MESSAGE) {
      console.log(`Skipping sending message to ${userId}`);
      continue;
    }
    await bot.api.sendMessage(userId, message, {
      parse_mode: "HTML",
      link_preview_options: {
        is_disabled: true,
      },
    });
  }
};

const sendError = async (error) => {
  await bot.api.sendMessage(
    DEVELOPER_USER_ID,
    `Something went wrong\n\n${JSON.stringify(error)}`
  );
};

const executeAlert = async ({ alert, authToken }) => {
  const {
    pageSize,
    walletAgeDays,
    valueFilter,
    boughtTokenLimit,
    walletStats,
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

  if (walletStats) {
    const results = await evaluateWallets({
      alert,
      matchedTokens,
      authToken,
    });
    matchedTokens = results.matchedTokens;
  }

  if (matchedTokens.length === 0) {
    console.log("🥱 No token satisfies conditions");
    return Response.json({ matchedTokens }, { status: 200 });
  }

  await getTokensInfo({ matchedTokens });

  const message = craftMessage({ alert, matchedTokens });
  console.log("\n\nMessage:\n" + message);

  await sendMessage(message);
};

const getTokensInfo = async ({ matchedTokens }) => {
  await Promise.all(
    matchedTokens.map(async (tokenObj) => {
      const { buy_token_address } = tokenObj;
      const tokenInfo = await getTokenInfo(buy_token_address);
      if (!tokenInfo) {
        return;
      }
      const { tokenName, timeStamp } = tokenInfo;
      if (timeStamp) {
        tokenObj.creationDate = new Date(timeStamp * 1000);
      }
      if (tokenName) {
        tokenObj.tokenName = tokenName;
      }
    })
  );
};

const getTokenInfo = async (tokenAddress) => {
  try {
    const endPoint = `https://api.etherscan.io/api`;
    const searchParams = new URLSearchParams({
      module: "account",
      action: "tokentx",
      contractaddress: tokenAddress,
      address: "0x0000000000000000000000000000000000000000",
      apikey: process.env.ETHERSCAN_API_KEY,
      sort: "asc",
      page: 1,
    });
    console.log("Fetching token info for:", tokenAddress);
    const url = `${endPoint}?${searchParams.toString()}`;
    const response = await fetch(url);
    const json = await response.json();
    console.log(`✅ Fetched token info for ${tokenAddress}`);
    return json?.result?.[0];
  } catch (error) {
    console.error("Error fetching token info:", error);
    return null;
  }
};

const addBuyerStats = async ({ matchedTokens, authToken }) => {
  if (matchedTokens.length === 0) {
    console.log("addBuyerStats: No matched tokens");
    return;
  }

  const portfolioAESKey = await fetchPortfolioAESKey();
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

const hash = (walletAddress, portfolioAESKey) => {
  const key = CryptoJS.enc.Utf8.parse(portfolioAESKey);
  var iv = CryptoJS.enc.Utf8.parse(portfolioAESKey);
  return CryptoJS.AES.encrypt(walletAddress, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
};

async function fetchPortfolioAESKey() {
  try {
    // Fetch the HTML content
    const response = await fetch("https://www.candlestick.io", {
      headers: {
        Accept: "text/html",
      },
    });
    const htmlContent = await response.text();

    // console.log("HTML content:\n" + htmlContent);

    // Regular expression to match the portfolioAESKey
    var regex = /portfolioAESKey:"([^"]+)"/;

    // Executing the regex on the htmlText
    var matches = regex.exec(htmlContent);

    // Extracting the portfolioAESKey value
    if (matches && matches.length > 1) {
      var portfolioAESKey = matches[1];
      console.log("PortfolioAESKey:", portfolioAESKey);
      return portfolioAESKey;
    } else {
      console.log("PortfolioAESKey not found");
    }
  } catch (error) {
    console.error("Error fetching the HTML:", error);
  }
}

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
    const result = await fetch(url, {
      headers: { "x-authorization": authToken },
    });
    const json = await result.json();
    const data = json.data;
    return data;
  } catch (error) {
    console.error("Error fetching wallet performance:", error);
    return null;
  }
};
