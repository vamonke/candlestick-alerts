import { FMT_BYTES, FMT_NUMBER } from "web3";
import web3 from "./web3";

export const getContractCreation = async (contractAddress) => {
  try {
    const url = new URL("https://api.etherscan.io/api");
    const searchParams = new URLSearchParams({
      module: "contract",
      action: "getcontractcreation",
      contractaddresses: contractAddress,
      apikey: process.env.ETHERSCAN_API_KEY,
    });
    url.search = searchParams.toString();
    console.log(`🔗 Fetching contract creation date:`, url);
    const response = await fetch(url);
    const json = await response.json();
    console.log(`✅ Received token creation response`, json);

    const txHash = json?.result?.[0]?.txHash;
    if (!txHash) {
      console.log("Transaction hash not found");
      return;
    }

    const txnReceipt = await web3.eth.getTransactionReceipt(txHash);
    if (!txnReceipt) {
      console.log("Transaction receipt not found");
      return;
    }
    console.log(`✅ Received transaction receipt`, txnReceipt);

    // Get the block containing the contract creation transaction
    const block = await web3.eth.getBlock(txnReceipt.blockNumber, false, {
      number: FMT_NUMBER.NUMBER,
      bytes: FMT_BYTES.HEX,
    });
    if (!block) {
      console.log("Block not found");
      return;
    }
    console.log(`✅ Received block`, block);

    // Convert timestamp from seconds to a readable format
    const timestamp = new Date(block.timestamp * 1000);
    console.log(`Contract was created at: ${timestamp}`);
    return timestamp;
  } catch (error) {
    console.error("Error fetching contract creation:", error);
    return null;
  }
};

export const getContractInfo = async (contractAddress) => {
  try {
    const tokenAbi = [
      // name
      {
        constant: true,
        inputs: [],
        name: "name",
        outputs: [{ name: "", type: "string" }],
        type: "function",
      },
      // symbol
      {
        constant: true,
        inputs: [],
        name: "symbol",
        outputs: [{ name: "", type: "string" }],
        type: "function",
      },
    ];

    const contract = new web3.eth.Contract(tokenAbi, contractAddress);
    const name = await contract.methods.name().call();
    const symbol = await contract.methods.symbol().call();

    return { name, symbol };
  } catch (error) {
    console.error("Error fetching contract info:", error);
    return null;
  }
};

export const getTokenName = async (contractAddress) => {
  try {
    const tokenAbi = [
      {
        constant: true,
        inputs: [],
        name: "name",
        outputs: [{ name: "", type: "string" }],
        type: "function",
      },
    ];
    const contract = new web3.eth.Contract(tokenAbi, contractAddress);
    const name = await contract.methods.name().call();
    return name;
  } catch (error) {
    console.error("Error fetching token name:", error);
    return null;
  }
};
