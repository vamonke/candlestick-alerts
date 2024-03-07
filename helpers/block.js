import { FMT_BYTES, FMT_NUMBER } from "web3";
import web3 from "./web3";

export const getBlockTimestamp = async (blockNumber) => {
  try {
    console.log(`Fetching block ${blockNumber}...`);
    const block = await web3.eth.getBlock(blockNumber, false, {
      number: FMT_NUMBER.NUMBER,
      bytes: FMT_BYTES.HEX,
    });
    if (!block) {
      console.log("Block not found");
      return;
    }
    console.log(`✅ Received block:`, blockNumber);

    // Convert timestamp from seconds to a readable format
    const timestamp = new Date(block.timestamp * 1000);
    console.log(`Block was created at: ${timestamp}`);
    return timestamp;
  } catch (error) {
    console.error("Error fetching transaction timestamp", error);
    return null;
  }
};
