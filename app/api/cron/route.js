import { kv } from "@vercel/kv";
import { unstable_noStore as noStore } from "next/cache";
import { markdownTable } from "markdown-table";
import bot from "../../../bot";
import MOCK_DATA from "../../../mock-data.json";

const PARAMETERS = {
  PAGE_SIZE: 100,
  VALUE_FILTER: 120,
  WALLET_AGE_DAYS: 1,
  BOUGHT_TOKEN_LIMIT: true, // Tokens bought <= 2
  AUTH_TOKEN_KEY: "TOKEN",
  MINS_AGO: 10,
  WALLET_COUNT_THRESHOLD: 3,
  EXCLUDED_TOKENS: ["WETH", "weth"],
  DEV_MODE: false,
  USE_MOCK_DATA: false,
};

const {
  // API constants
  PAGE_SIZE,
  VALUE_FILTER,
  WALLET_AGE_DAYS,
  BOUGHT_TOKEN_LIMIT,
  // Logic constants
  MINS_AGO,
  WALLET_COUNT_THRESHOLD,
  EXCLUDED_TOKENS,
  // Dev constants
  AUTH_TOKEN_KEY,
  DEV_MODE,
  USE_MOCK_DATA,
} = PARAMETERS;

console.log("🚀 Running cron job");
console.log(`Parameters: ${JSON.stringify(PARAMETERS, null, 2)}`);

const LOGIN_URL = "https://www.candlestick.io/api/v2/user/login-email";
const STEATH_WALLETS_URL = `https://www.candlestick.io/api/v1/stealth-money/degen-explorer-by-stealth-money?current_page=1&page_size=${PAGE_SIZE}&sort_type=3&oriented=1&blockchain_id=2&exploreType=token&days=${WALLET_AGE_DAYS}&value_filter=${VALUE_FILTER}&include_noise_trades=false&fundingSource=ALL&boughtTokenLimit=${BOUGHT_TOKEN_LIMIT}&hide_first_mins=0&activeSource=ETH`;

export async function GET() {
  noStore();
  const token = await getAuthToken();
  if (!token) {
    const error = "⁉️ Missing token";
    sendError(error);
    return Response.json({ error }, { status: 500 });
  }

  let steathMoney = await getStealthWallets(token);
  if (USE_MOCK_DATA) {
    steathMoney = MOCK_DATA;
  }

  const { meetsConditions, tokensMap } = evaluateTransactions(
    steathMoney.data.chart
  );

  // For debugging
  if (meetsConditions.length === 0) {
    console.log("🥱 No token meets conditions");
    return Response.json({ meetsConditions }, { status: 200 });
  }

  console.log("✅ Meets conditions", meetsConditions.length, "tokens");

  // For debugging
  const message = craftMessage(meetsConditions);
  console.log("Message", message);

  await sendMessage(message);

  return Response.json({ meetsConditions, message }, { status: 200 });
}

const getAuthToken = async () => {
  const kvToken = await getToken();
  if (!kvToken) {
    return getNewToken();
  }

  const valid = await checkToken(kvToken);
  if (!valid) {
    return getNewToken();
  }

  return kvToken;
};

const getToken = async () => {
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

const getStealthWallets = async (token) => {
  try {
    const result = await fetch(STEATH_WALLETS_URL, {
      headers: {
        "x-authorization": token,
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

const refreshToken = (refreshToken) => {
  fetch("https://www.candlestick.io/api/v2/user/refresh-token", {
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
    method: "PUT",
  });
  // returns
  //   {
  //     "code": 1,
  //     "message": null,
  //     "data": {
  //         "token": "eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiJmYjM0ODM3MS1mZmI1LTQ0OTQtYWI4Ni04MjU3ODZmYjAwMTciLCJyZWZyZXNoVG9rZW5JZCI6MTE4NDEyLCJ1c2VySWQiOjE5MzYwLCJleHAiOjE3MDg0Mzg0MDgsImlhdCI6MTcwODQzODEwOH0.EMoO3YbXwxydhx9FW6zZT0ZJrfJwl61dgE-wzFHVNVvmDncno1XLLgLqX_59XH21uP9R5LNenhcOUmrPF97pGg"
  //     },
  //     "extra": null
  // }
};

const evaluateTransactions = (list) => {
  let currentTime = new Date();
  if (DEV_MODE) {
    currentTime = parseDate(list[0].time);
  }
  const startDate = new Date(currentTime.getTime() - MINS_AGO * 60 * 1000);

  // console.log("Start date:", startDate);

  console.log("Evaluating transactions..");
  // console.log(list[0]);

  const map = {};
  list
    .filter((txn) => {
      const time = parseDate(txn.time);
      return time > startDate;
    })
    .forEach((txn) => {
      const { address, buy_token_symbol, buy_token_address } = txn;
      const tokenObj = map[buy_token_address];
      if (EXCLUDED_TOKENS.includes(buy_token_symbol)) {
        // break;
      } else if (tokenObj) {
        tokenObj.distinctAddresses.add(address);
        tokenObj.transactions.push(txn);
      } else {
        map[buy_token_address] = {
          buy_token_address,
          buy_token_symbol,
          distinctAddresses: new Set([address]),
          transactions: [txn],
        };
      }
    });

  let meetsConditions = [];
  console.log("Token map:");

  for (const token in map) {
    const tokenObj = map[token];
    const { buy_token_symbol, distinctAddresses } = tokenObj;
    const distinctAddressesCount = distinctAddresses.size;

    tokenObj.distinctAddresses = Array.from(distinctAddresses);
    tokenObj.distinctAddressesCount = distinctAddressesCount;

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

    if (EXCLUDED_TOKENS.includes(buy_token_symbol)) {
      continue;
    }

    if (distinctAddressesCount >= WALLET_COUNT_THRESHOLD) {
      meetsConditions.push(tokenObj);
    }
  }

  meetsConditions = meetsConditions.sort(
    (a, b) => b.distinctAddressesCount - a.distinctAddressesCount
  );

  return { tokensMap: map, meetsConditions };
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

const craftMessage = (meetsConditions) => {
  if (meetsConditions.length === 0) {
    return `🥱 No tokens have been purchased by ${WALLET_COUNT_THRESHOLD} stealth wallets in the past ${MINS_AGO} mins`;
  }

  let message = `<b>Alert #1</b>\nValue ≥ ${VALUE_FILTER}, Wallet Age: ${WALLET_AGE_DAYS}D,${
    BOUGHT_TOKEN_LIMIT ? "Tokens bought ≤ 2" : ""
  }, ${WALLET_COUNT_THRESHOLD}+ distinct wallets\n\n`;

  message += meetsConditions
    .map((tokenObj) => {
      return constructMessage(tokenObj);
    })
    .join("\n\n");

  return message;
};

const constructMessage = (tokenObj) => {
  const {
    buy_token_symbol,
    distinctAddressesCount,
    totalTxnValue,
    buy_token_address,
    transactions,
  } = tokenObj;

  const message = `Token: <b>${buy_token_symbol}</b> \nCA: <code>${buy_token_address}</code>\nBought by <b>${distinctAddressesCount}</b> distinct stealth wallets in the last ${MINS_AGO} mins\nTotal Txn Value: $${totalTxnValue.toLocaleString()}\n\n<pre>${constructTable(
    transactions
  )}</pre>\n<a href="https://www.candlestick.io/crypto/${buy_token_address}">View token on Candlestick.io</a>`;

  return message;
};

const constructTable = (transactions) => {
  return markdownTable(
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
