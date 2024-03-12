import { kv } from "@vercel/kv";
import { CANDLESTICK_PROXY } from "./config";
const AUTH_TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export const getAuthToken = async () => {
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
    const url = `${CANDLESTICK_PROXY}/api/v1/user/user-info`;
    const result = await fetch(url, {
      headers: {
        "x-authorization": token,
      },
      method: "GET",
    });
    const json = await result.json();
    const valid = json.code === 1;

    if (valid) {
      console.log("✅ Auth token is valid");
    } else {
      console.log("❌ Invalid auth token from KV store", json);
    }

    return valid;
  } catch (error) {
    console.error(error);
    console.log("❌ Failed to validate auth token from KV store");
    return false;
  }
};

const getNewToken = async () => {
  const tokens = await getLoginTokens();
  if (tokens) {
    await setTokens(tokens);
  }
  return tokens.authToken;
};

const BASE_URL = "https://www.candlestick.io"; // Note: Login API not proxied through CANDLESTICK_PROXY
const LOGIN_URL = `${BASE_URL}/api/v2/user/login-email`;
const getLoginTokens = async () => {
  const data = {
    deviceId: process.env.DEVICE_ID,
    email: process.env.EMAIL,
    password: process.env.HASHED_PASSWORD,
  };
  console.log("Logging in via", LOGIN_URL);
  try {
    const result = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const json = await result.json();
    if (json.code !== 1) {
      console.log("❌ Login failed", json);
      return null;
    }
    const authToken = json.data.token;
    const refreshToken = json.data.refresh;
    console.log("✅ Login success");
    return { authToken, refreshToken };
  } catch (error) {
    console.log("Error fetching auth token", error);
    console.log("❌ Login failed");
    return null;
  }
};

const setTokens = async ({ authToken, refresh }) => {
  try {
    console.log("Setting tokens in KV store..");

    await kv.del(AUTH_TOKEN_KEY);
    await kv.del(REFRESH_TOKEN_KEY);

    await kv.set(AUTH_TOKEN_KEY, authToken);
    await kv.set(REFRESH_TOKEN_KEY, refresh);

    console.log("✅ Successfully set tokens in KV store");
  } catch (error) {
    // TODO: Handle error
    console.error(error);
  }
};
