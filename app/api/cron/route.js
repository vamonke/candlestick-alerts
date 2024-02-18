import { kv } from "@vercel/kv";
import { unstable_noStore as noStore } from "next/cache";
import bot from "../../../bot";

const LOGIN_URL = "https://www.candlestick.io/api/v2/user/login-email";
const STEATH_WALLETS_URL =
  "https://www.candlestick.io/api/v1/stealth-money/degen-explorer-by-stealth-money?current_page=1&page_size=100&sort_type=3&oriented=1&blockchain_id=2&exploreType=token&days=1&value_filter=200&include_noise_trades=false&fundingSource=ALL&boughtTokenLimit=true&hide_first_mins=0&activeSource=ETH";

const AUTH_TOKEN_KEY = "TOKEN";
const MINS_AGO = 10;
const WALLET_COUNT_THRESHOLD = 3;
const EXCLUDED_TOKENS = ["WETH", "weth"];

export async function GET() {
  noStore();
  const token = await getAuthToken();
  if (!token) {
    const error = "⁉️ Missing token";
    sendError(error);
    return Response.json({ error }, { status: 500 });
  }

  const steathMoney = await getStealthWallets(token);
  // const steathMoney = MOCK_DATA;

  const { meetsConditions, tokensMap } = evaluateTransactions(
    steathMoney.data.chart
  );

  // For debugging
  if (meetsConditions.length === 0) {
    console.log("🥱 No token meets conditions");
    return Response.json({ meetsConditions }, { status: 200 });
  } else {
    console.log("✅ Meets conditions", meetsConditions.length, "tokens");
  }

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
    console.log("Found token from KV store");
  } else {
    console.log("❌ Missing token from KV store");
  }
  return result;
};

const checkToken = async (token) => {
  console.log("Checking if token is valid..");
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
      console.log("✅ Token is valid");
    } else {
      console.log("❌ Invalid token from KV store");
    }

    return valid;
  } catch (error) {
    console.error(error);
    console.log("❌ Invalid token from KV store");
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
};

const evaluateTransactions = (list) => {
  const currentTime = new Date();
  const startDate = new Date(currentTime.getTime() - MINS_AGO * 60 * 1000);
  // const startDate = parseDate("2024-02-12 08:00:00");

  const map = {};
  list
    .filter((txn) => {
      const time = parseDate(txn.time);
      return time > startDate;
    })
    .forEach((txn) => {
      const { address, buy_token_symbol, buy_token_address } = txn;
      const tokenObj = map[buy_token_address];
      if (tokenObj) {
        tokenObj.uniqueAddresses.add(address);
        tokenObj.transactions.push(txn);
      } else {
        map[buy_token_address] = {
          buy_token_address,
          buy_token_symbol,
          uniqueAddresses: new Set([address]),
          transactions: [txn],
        };
      }
    });

  let meetsConditions = [];

  for (const token in map) {
    const tokenObj = map[token];
    const { buy_token_symbol, uniqueAddresses } = tokenObj;
    const uniqueAddressesCount = uniqueAddresses.size;

    tokenObj.uniqueAddresses = Array.from(uniqueAddresses);
    tokenObj.uniqueAddressesCount = uniqueAddressesCount;

    const totalTxnValue = tokenObj.transactions.reduce(
      (acc, txn) => acc + txn.txn_value,
      0
    );
    tokenObj.totalTxnValue = totalTxnValue;

    if (EXCLUDED_TOKENS.includes(buy_token_symbol)) {
      continue;
    }

    if (uniqueAddressesCount >= WALLET_COUNT_THRESHOLD) {
      meetsConditions.push(tokenObj);
    }
  }

  meetsConditions = meetsConditions.sort(
    (a, b) => b.uniqueAddressesCount - a.uniqueAddressesCount
  );

  return { tokensMap: map, meetsConditions };
};

const parseDate = (utcTimeString) => {
  const [year, month, day, hour, minute, second] = utcTimeString.split(/[- :]/);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
};

const craftMessage = (meetsConditions) => {
  if (meetsConditions.length === 0) {
    return `🥱 No tokens have been purchased by ${WALLET_COUNT_THRESHOLD} stealth wallets in the past ${MINS_AGO} mins`;
  }

  const message = meetsConditions
    .map((tokenObj) => {
      const {
        buy_token_symbol,
        uniqueAddressesCount,
        totalTxnValue,
        buy_token_address,
      } = tokenObj;

      const tokenMessage = `Token: <b>${buy_token_symbol}</b> \nCA: ${buy_token_address}\nBought by ${uniqueAddressesCount} stealth wallets in the last ${MINS_AGO} mins\nTotal Txn Value: $${totalTxnValue.toLocaleString()}\n<a href="https://www.candlestick.io/crypto/${buy_token_address}">View on Candlestick.io</a>`;
      return tokenMessage;
    })
    .join("\n\n");

  return message;
};

const DEVELOPER_USER_ID = 265435469;
const USER_V_ID = 278239097;

const USER_IDS = [
  // dev
  DEVELOPER_USER_ID,
  USER_V_ID,
];

const sendMessage = async (message) => {
  for (const userId of USER_IDS) {
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
