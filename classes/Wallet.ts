import { getCandleStickUrl, getWalletPerformance } from "@/helpers/candlestick";
import { hashWallet } from "@/helpers/portfolioAESKey";
import config from "./Config";

class Wallet {
  public address: string;
  public roi: number;
  public winRate: number;
  public coinsTraded: number;

  constructor({
    address,
    roi,
    winRate,
    coinsTraded,
  }: {
    address: string;
    roi?: number;
    winRate?: number;
    coinsTraded?: number;
  }) {
    this.address = address;
    this.roi = roi;
    this.winRate = winRate;
    this.coinsTraded = coinsTraded;
  }

  async getStats() {
    const walletAddressHash = this.getAddressHash();
    const authToken = config.authToken;
    const performance = await getWalletPerformance({
      walletAddressHash,
      authToken,
    });

    const stat = performance?.stat;
    this.winRate = stat?.est_win_Rate;
    this.roi = stat?.est_total_profit_ratio;
    this.coinsTraded = stat?.coin_traded;

    console.log("📊 Wallet stats:", this);
  }

  getAddressHash() {
    const portfolioAESKey = config.portfolioAESKey;
    const walletAddressHash = hashWallet(this.address, portfolioAESKey);
    return walletAddressHash;
  }

  getCandlestickUrl() {
    const address = this.address;
    const portfolioAESKey = config.portfolioAESKey;
    return getCandleStickUrl(address, portfolioAESKey);
  }
}

export default Wallet;
