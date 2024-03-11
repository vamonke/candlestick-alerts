export const DEV_MODE = process.env.VERCEL_ENV === "development";
export const USE_MOCK_DATA = DEV_MODE && true;
export const SEND_MESSAGE = [
  "production",
  // toggle below to enable/disable sending messages in dev mode
  "development",
  // toggle above to enable/disable sending messages in dev mode
].includes(process.env.VERCEL_ENV);
