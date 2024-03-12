import { kv } from "@vercel/kv";
import { CANDLESTICK_PROXY } from "./config";
const AUTH_TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export const getAuthToken = async () => {
  const kvAuthToken = await getKvAuthToken();
  if (!kvAuthToken) {
    return getNewToken();
  }

  const valid = await checkToken(kvAuthToken);
  if (valid) {
    return kvAuthToken;
  }

  const newToken = await refreshKvToken();
  if (newToken) {
    return newToken;
  }

  return getNewToken();
};

const getKvAuthToken = async () => {
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
  const tokens = await login();
  if (tokens) {
    await setTokens(tokens);
  }
  return tokens.authToken;
};

const refreshKvToken = async () => {
  console.log("Getting refresh token from KV store..");
  const refreshToken = await await kv.get(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return null;
  }

  const newToken = await refresh(refreshToken);
  if (newToken) {
    await kv.set(AUTH_TOKEN_KEY, newToken);
    return newToken;
  }

  return null;
};

const BASE_URL = "https://www.candlestick.io"; // Note: Login API not proxied through CANDLESTICK_PROXY
const LOGIN_URL = `${BASE_URL}/api/v2/user/login-email`;
const login = async () => {
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

const setTokens = async ({ authToken, refreshToken }) => {
  try {
    console.log("Setting tokens in KV store..");

    if (authToken) {
      await kv.del(AUTH_TOKEN_KEY);
      await kv.set(AUTH_TOKEN_KEY, authToken);
    }

    if (refreshToken) {
      await kv.del(REFRESH_TOKEN_KEY);
      await kv.set(REFRESH_TOKEN_KEY, refreshToken);
    }

    console.log("✅ Successfully set tokens in KV store");
  } catch (error) {
    // TODO: Handle error
    console.error(error);
  }
};

export const refresh = async (refreshToken) => {
  console.log("Refreshing auth token..");
  try {
    const url = `https://www.candlestick.io/api/v2/user/refresh-token`;
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
      method: "PUT",
    });
    const json = await response.json();
    if (json.code !== 1) {
      console.log("❌ Failed to refresh token", json);
      return null;
    }
    const token = json.data.token;
    console.log("✅ Successfully refreshed token");
    return token;
  } catch (error) {
    console.error(error);
    console.log("❌ Failed to refresh token");
    return null;
  }
};
//   {
//     "code": 1,
//     "message": null,
//     "data": {
//         "token": "eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiJmYjM0ODM3MS1mZmI1LTQ0OTQtYWI4Ni04MjU3ODZmYjAwMTciLCJyZWZyZXNoVG9rZW5JZCI6MTE4NDEyLCJ1c2VySWQiOjE5MzYwLCJleHAiOjE3MDg0Mzg0MDgsImlhdCI6MTcwODQzODEwOH0.EMoO3YbXwxydhx9FW6zZT0ZJrfJwl61dgE-wzFHVNVvmDncno1XLLgLqX_59XH21uP9R5LNenhcOUmrPF97pGg"
//     },
//     "extra": null
// }
