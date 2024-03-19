import { hashWallet } from "@/helpers/portfolioAESKey";
import config from "./Config";
import { getWalletPerformance } from "@/helpers/candlestick";

class Wallet {
  public address: string;
  public roi: number;
  public winRate: number;

  constructor({
    address,
    roi,
    winRate,
  }: {
    address: string;
    roi?: number;
    winRate?: number;
  }) {
    this.address = address;
    this.roi = roi;
    this.winRate = winRate;
  }

  async getStats() {
    const walletAddressHash = this.getAddressHash();
    const authToken = config.authToken;
    const stats = await getWalletPerformance({
      walletAddressHash,
      authToken,
    });
    this.roi = stats.roi;
    this.winRate = stats.winRate;
  }

  getAddressHash() {
    const walletAddressHash = hashWallet(this.address);
    return walletAddressHash;
  }
}

export default Wallet;
