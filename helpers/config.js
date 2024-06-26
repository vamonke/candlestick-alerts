export const DEV_MODE = process.env.VERCEL_ENV === "development";
export const USE_MOCK_DATA = DEV_MODE && true;
export const SEND_MESSAGE = [
  "production",
  // toggle below to enable/disable sending messages in dev mode
  "development",
  // toggle above to enable/disable sending messages in dev mode
].includes(process.env.VERCEL_ENV);

// const USE_LOCAL_API = true;
const USE_LOCAL_API = false;
// const PROXY_URL = "https://206.189.153.199";
const PROXY_URL = "https://candlestick.io";
export const CANDLESTICK_PROXY = DEV_MODE
  ? USE_LOCAL_API
    ? "http://localhost:3001"
    : PROXY_URL
  : PROXY_URL;

