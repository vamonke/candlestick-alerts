import { kv } from "@vercel/kv";
import { unstable_noStore as noStore } from "next/cache";
import { markdownTable } from "markdown-table";
import CryptoJS from "crypto-js";
import bot from "../../../bot";
import MOCK_DATA from "../../../mock-data.json";

const AUTH_TOKEN_KEY = "authToken";
const DEV_MODE = false;
const USE_MOCK_DATA = false;
const SEND_MESSAGE = true;

const PARAMETERS = {
  AUTH_TOKEN_KEY,
  DEV_MODE,
  USE_MOCK_DATA,
  SEND_MESSAGE,
};

const ALERTS = [
  {
    name: "Stealth Wallets (1D, 1 token)",
    pageSize: 100,
    valueFilter: 120,
    walletAgeDays: 1,
    boughtTokenLimit: true, // Tokens bought <= 2
    minsAgo: 5,
    // minsAgo: 300, // For testing
    minDistinctWallets: 3,
    excludedTokens: ["WETH", "weth"],
  },
  {
    name: "Stealth Wallets (7D, any token)",
    pageSize: 100,
    valueFilter: 120,
    walletAgeDays: 7,
    boughtTokenLimit: false, // Any tokens bought
    minsAgo: 5,
    // minsAgo: 30, // For testing
    minDistinctWallets: 3,
    excludedTokens: ["WETH", "weth"],
    showWalletStats: true,
  },
];

console.log("🚀 Running cron job");
console.log(`Parameters: ${JSON.stringify(PARAMETERS, null, 2)}`);

const LOGIN_URL = "https://www.candlestick.io/api/v2/user/login-email";

export async function GET() {
  noStore();
  const token = await getAuthToken();

  if (!token) {
    const error = "⁉️ Missing token";
    sendError(error);
    return Response.json({ error }, { status: 500 });
  }

  console.log(`Alerts to execute: ${ALERTS.length}`);

  for (const [index, alert] of ALERTS.entries()) {
    console.log(`Executing alert #${index + 1}`);
    console.log(`Parameters: ${JSON.stringify(alert, null, 2)}`);
    await executeAlert({ alert, authToken: token });
    console.log(`Finished executing alert #${index + 1}`);
  }

  return Response.json({ success: true }, { status: 200 });
}

const getAuthToken = async () => {
  const kvToken = await getKvToken();
  if (!kvToken) {
    return getNewToken();
  }

  const valid = await checkToken(kvToken);
  if (!valid) {
    return getNewToken();
  }

  return kvToken;
};

const getKvToken = async () => {
  const result = await kv.get(AUTH_TOKEN_KEY);
  if (result) {
    console.log("🔑 Found token from KV store");
  } else {
    console.log("❌ Missing token from KV store");
  }
  return result;
};

const checkToken = async (token) => {
  console.log("Checking if auth token is valid..");
  try {
    const result = await fetch(
      "https://www.candlestick.io/api/v1/user/user-info",
      {
        headers: {
          "x-authorization": token,
        },
        method: "GET",
      }
    );
    const json = await result.json();
    const valid = json.code === 1;

    if (valid) {
      console.log("✅ Auth token is valid");
    } else {
      console.log("❌ Invalid auth token from KV store");
    }

    return valid;
  } catch (error) {
    console.error(error);
    console.log("❌ Invalid auth token from KV store");
    return false;
  }
};

const getNewToken = async () => {
  const token = await getLoginToken();
  if (token) {
    await setToken(token);
  }
  return token;
};

const getLoginToken = async () => {
  console.log("Logging in..");

  const data = {
    deviceId: process.env.DEVICE_ID,
    email: process.env.EMAIL,
    password: process.env.HASHED_PASSWORD,
  };
  try {
    const result = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const json = await result.json();
    const token = json.data.token;
    console.log("✅ Login success");
    return token;
  } catch (error) {
    console.log("Error fetching auth token", error);
    console.log("❌ Login failed");
    return null;
  }
};

const setToken = async (token) => {
  try {
    console.log("Setting token in KV store..");
    await kv.del(AUTH_TOKEN_KEY);
    const result = await kv.set(AUTH_TOKEN_KEY, token);
    console.log("✅ Successfully set token in KV store");
  } catch (error) {
    // TODO: Handle error
    console.error(error);
  }
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

    if (distinctAddressesCount >= minDistinctWallets) {
      matchedTokens.push(tokenObj);
    }
  }

  matchedTokens = matchedTokens.sort(
    (a, b) => b.distinctAddressesCount - a.distinctAddressesCount
  );

  return { tokensMap, matchedTokens };
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
  } = alert;

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
  const windowString = `Past ${minsAgo} mins`;
  const alertConditionsString =
    `<i>` +
    [
      valueFilterString,
      walletAgeString,
      minDistinctWalletsString,
      boughtTokenLimitString,
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
  const { minsAgo, showWalletStats } = alert;
  const {
    buy_token_symbol,
    distinctAddressesCount,
    totalTxnValue,
    buy_token_address,
    transactions,
    distinctAddresses,
  } = tokenObj;

  const tokenString = `Token: <b>${buy_token_symbol} ($${buy_token_symbol.toUpperCase()})</b>`;
  const caString = `CA: <code>${buy_token_address}</code>`;
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
  for (const userId of recipientIds) {
    if (!SEND_MESSAGE) {
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

// const STEATH_WALLETS_URL = `https://www.candlestick.io/api/v1/stealth-money/degen-explorer-by-stealth-money?current_page=1&page_size=${PAGE_SIZE}&sort_type=3&oriented=1&blockchain_id=2&exploreType=token&days=${WALLET_AGE_DAYS}&value_filter=${VALUE_FILTER}&include_noise_trades=false&fundingSource=ALL&boughtTokenLimit=${BOUGHT_TOKEN_LIMIT}&hide_first_mins=0&activeSource=ETH`;

// https://www.candlestick.io/api/v1/stealth-money/degen-explorer-by-stealth-money?current_page=1&page_size=100&sort_type=3&oriented=1&blockchain_id=2&exploreType=token&days=1&value_filter=120&include_noise_trades=false&fundingSource=ALL&boughtTokenLimit=true&hide_first_mins=0&activeSource=ETH

const executeAlert = async ({ alert, authToken }) => {
  let steathMoney = [];
  if (USE_MOCK_DATA) {
    steathMoney = MOCK_DATA;
  } else {
    const baseUrl =
      "https://www.candlestick.io/api/v1/stealth-money/degen-explorer-by-stealth-money";

    const urlParams = new URLSearchParams({
      current_page: 1,
      page_size: alert.pageSize,
      sort_type: 3,
      oriented: 1,
      blockchain_id: 2,
      exploreType: "token",
      days: alert.walletAgeDays,
      value_filter: alert.valueFilter,
      include_noise_trades: false,
      fundingSource: "ALL",
      boughtTokenLimit: alert.boughtTokenLimit,
      hide_first_mins: 0,
      activeSource: "ETH",
    });

    const url = `${baseUrl}?${urlParams.toString()}`;
    console.log("🔗 Fetching stealth wallets from:", url);
    steathMoney = await getStealthWallets({ url, authToken });
  }

  const transactions = steathMoney.data.chart;
  const { matchedTokens, tokensMap } = evaluateTransactions({
    transactions,
    alert,
  });

  if (matchedTokens.length === 0) {
    console.log("🥱 No token satisfies conditions");
    return Response.json({ matchedTokens }, { status: 200 });
  }

  console.log("✅ Matched tokens", matchedTokens.length, "tokens");

  if (alert.showWalletStats) {
    await addBuyerStats({ matchedTokens, authToken });
  }

  const message = craftMessage({ alert, matchedTokens });
  console.log("\n\nMessage:\n" + message);

  await sendMessage(message);
};

const addBuyerStats = async ({ matchedTokens, authToken }) => {
  const portfolioAESKey = await fetchPortfolioAESKey();
  console.log("Fetching wallet stats..");
  await Promise.all(
    matchedTokens.map(async (tokenObj) => {
      const { distinctAddresses } = tokenObj;
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
