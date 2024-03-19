import { getAuthToken } from "@/helpers/auth";
import { fetchPortfolioAESKey } from "@/helpers/portfolioAESKey";

export const DEV_MODE = process.env.VERCEL_ENV === "development";
export const USE_MOCK_DATA = DEV_MODE && true;
export const SEND_MESSAGE = [
  "production",
  // toggle below to enable/disable sending messages in dev mode
  "development",
  // toggle above to enable/disable sending messages in dev mode
].includes(process.env.VERCEL_ENV);

class Config {
  public devMode: boolean = DEV_MODE;
  public useMockData: boolean = USE_MOCK_DATA;
  public sendMessage: boolean = SEND_MESSAGE;
  public authToken: string;
  public portfolioAESKey: string;

  constructor() {
    this.devMode = DEV_MODE;
    this.useMockData = USE_MOCK_DATA;
    this.sendMessage = SEND_MESSAGE;
  }

  async init() {
    const [authToken, portfolioAESKey] = await Promise.all([
      getAuthToken(),
      fetchPortfolioAESKey(),
    ]);
    this.authToken = authToken;
    this.portfolioAESKey = portfolioAESKey;
  }

  toString() {
    return JSON.stringify(
      {
        devMode: this.devMode,
        useMockData: this.useMockData,
        sendMessage: this.sendMessage,
        // authToken: this.authToken,
        // portfolioAESKey: this.portfolioAESKey,
      },
      null,
      2
    );
  }
}

const config = new Config();

export default config;
