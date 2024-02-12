import { kv } from "@vercel/kv";
import { unstable_noStore as noStore } from "next/cache";

// TODO: Use KV to store the token and fetch it from there
// TODO: Error handling
// TODO: Handle logic for sleath wallets
// TODO: Add a cron job to run this every 5 minutes
// TODO: Call telegram API for notifications

const LOGIN_URL = "https://www.candlestick.io/api/v2/user/login-email";
const STEATH_WALLETS_URL =
  "https://www.candlestick.io/api/v1/stealth-money/degen-explorer-by-stealth-money?current_page=1&page_size=100&sort_type=3&oriented=1&blockchain_id=2&exploreType=token&days=1&value_filter=200&include_noise_trades=false&fundingSource=ALL&boughtTokenLimit=true&hide_first_mins=0&activeSource=ETH";

const TOKEN_KEY = "TOKEN";

export async function GET() {
  noStore();
  const token = await getAuthToken();
  // const steathMoney = await getStealthWallets(token);
  return Response.json({ token }, { status: 200 });
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
  const result = await kv.get(TOKEN_KEY);
  if (result) {
    console.log("Found token from KV store:", result);
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
    await kv.del(TOKEN_KEY);
    const result = await kv.set(TOKEN_KEY, token);
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
    return result.json();
  } catch (error) {
    console.log("Error fetching stealth wallets", error);
    return null;
  }
};

const refreshToken = () => {
  fetch("https://www.candlestick.io/api/v2/user/refresh-token", {
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: '{"refresh":"eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiJmYjM0ODM3MS1mZmI1LTQ0OTQtYWI4Ni04MjU3ODZmYjAwMTciLCJ1c2VySWQiOjE5MzYwLCJleHAiOjE3MDgzMTAwMTQsImlhdCI6MTcwNzcwNTIxNH0.B2bQWUBR77pT62Z-6UaBHQV14Kwx7KJOzlfO6YvnyuYy_W09T4RNr4ZnLyD1Army562cfLfWh_K2r5p8mVRzUw"}',
    method: "PUT",
  });
};
