import { unstable_noStore as noStore } from "next/cache";
import { kv } from "@vercel/kv";
import { CovalentClient } from "@covalenthq/client-sdk";
import * as crypto from "crypto";
import { sendError, sendMessage } from "../../../../helpers/send";
import { WALLETS_KEY, walletAlert } from "../../../../helpers/wallets";
import * as CONFIG from "../../../../helpers/config";
import { getTokenInfo } from "../../../../helpers/etherscan";
import { getAge, getAgeString } from "../../../../helpers/parse";
import { constructTxnsTable2 } from "../../../../helpers/table";

export const maxDuration = 60; // This function can run for a maximum of 5 seconds

export const POST = async (request) => {
  noStore();

  console.log("🚀 Running address activity webhook");
  console.log(`Parameters: ${JSON.stringify(CONFIG, null, 2)}`);

  const json = await request.json();
  console.log(`📫 Received body: ${JSON.stringify(json, null, 2)}`);

  const activity = json?.event?.activity;

  if (!activity) {
    sendError("⁉️ No activity found from webhook request");
    return Response.json({ ok: false, error: "No activity found" });
  }

  console.log(`Fetching top wallets...`);
  const topWallets = await getTopWalletsKV();
  console.log(`✅ Top wallets: ${JSON.stringify(topWallets, null, 2)}`);

  console.log(`Filtering activity...`);
  const matchedActivity = activity.filter(
    (a) =>
      topWallets.includes(a.toAddress) &&
      a.category === "token" &&
      !walletAlert.excludedTokens.includes(a.asset) &&
      !walletAlert.excludedAddresses.includes(a.fromAddress)
  );

  if (!matchedActivity.length) {
    console.log("🥱 No matched activity found");
    return Response.json({ ok: true });
  }

  console.log(
    `🤓 Matched activity: ${JSON.stringify(matchedActivity, null, 2)}`
  );

  await Promise.all(
    matchedActivity.map(async (a) => {
      const {
        // fromAddress,
        toAddress,
        value,
        asset,
        hash,
        blockNum,
        // category,
        rawContract: { address },
      } = a;

      const blockInfo = await getBlockInfo(blockNum);
      if (!blockInfo) {
        sendError(`⁉️ Failed to fetch block info for block ${blockNum}`);
        return;
      }

      const timestamp = new Date(parseInt(blockInfo.timestamp, 16) * 1000);
      const duration = getAge(timestamp);
      const durationMinutes = duration.minutes();

      if (durationMinutes > 5) {
        sendError(
          `⏰ Skipping activity (hash: ${hash}) due to age ${durationMinutes} minutes`
        );
        return;
      }

      const tokenInfo = await getTokenInfo(address);
      if (!tokenInfo) {
        sendError(`⁉️ Failed to fetch token info for address ${address}`);
        return;
      }

      const tokenName = tokenInfo.tokenName;
      const txnInfo = await getTxnInfo(hash);
      const txnValue = txnInfo?.value_quote;
      const txnDate = new Date(txnInfo?.block_signed_at);
      const price = txnValue && value ? txnValue / value : null;
      const symbol = tokenInfo?.symbol ?? asset.toUpperCase();

      const alertNameString = `<b><i>${walletAlert.name}</i></b>`;
      const tokenString = `Token: <b>${tokenName} ($${symbol})</b>`;
      const caString = `CA: <code>${address}</code>`;
      const walletString = `Wallet: <code>${toAddress}</code>`;
      const ageString = `Token age: ${
        timestamp ? getAgeString(timestamp) : "-"
      }`;
      const distinctWalletsString = `Distinct wallets: 1`;
      const totalTxnValueString = `Total txn value: ${
        txnValue ? `$${txnValue.toLocaleString()}` : "-"
      }`;
      const tokenLinkString = `<a href="https://www.candlestick.io/crypto/${address}">View on Candlestick</a>`;
      const transactionsTable = constructTxnsTable2([
        {
          address: toAddress,
          buy_price: price,
          txn_value: txnValue,
          date: txnDate,
        },
      ]);

      const message = [
        alertNameString + "\n",
        tokenString,
        caString,
        walletString,
        ageString,
        distinctWalletsString,
        totalTxnValueString,
        tokenLinkString + "\n",
        transactionsTable,
      ]
        .filter(Boolean)
        .join("\n");

      console.log(message);
      sendMessage(message);
    })
  );

  return Response.json({ ok: true });
};

const getTopWalletsKV = async () => {
  const walletAddresses = await kv.get(WALLETS_KEY);
  return [...walletAddresses, dummyAddress];
};

const dummyAddress = "0xbe3f4b43db5eb49d1f48f53443b9abce45da3b79";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getTxnInfo = async (txHash) => {
  console.log(`Waiting for 30 seconds...`);
  await wait(30 * 1000);
  console.log(`Fetching transaction value for ${txHash}...`);
  const client = new CovalentClient(process.env.COVALENT_API_KEY);
  const resp = await client.TransactionService.getTransaction(
    "eth-mainnet",
    txHash,
    { noLogs: true, quoteCurrency: "USD" }
  );
  console.log(`✅ Received transaction response`, resp);
  console.log(`Transaction response data:`, resp.data);
  return resp.data?.items?.[0];
};

const getBlockInfo = async (blockNum) => {
  console.log(`Fetching block info for ${blockNum}...`);

  const endpoint = "https://api.etherscan.io/api";
  const url = new URL(endpoint);
  const params = {
    module: "proxy",
    action: "eth_getBlockByNumber",
    tag: blockNum,
    boolean: "false",
    apikey: process.env.ETHERSCAN_API_KEY,
  };
  const searchParams = new URLSearchParams(params);
  url.search = searchParams.toString();

  const response = await fetch(url);
  const json = await response.json();

  console.log(`✅ Received block response`, json);
  console.log(`Block response data:`, json.result);
  return json.result;
};

/*
{
  "webhookId": "wh_9n5iiooqbvvw2p27",
  "id": "whevt_3fmkvi258ulkt8a0",
  "createdAt": "2024-03-05T02:51:26.431Z",
  "type": "ADDRESS_ACTIVITY",
  "event": {
    "network": "ETH_MAINNET",
    "activity": [
      {
        "fromAddress": "0x860598a0000e0ea354318e424796366588c73426",
        "toAddress": "0x9e0f883c83d09c90c06876690acbfa3accbca9f3",
        "blockNum": "0x12780cf",
        "hash": "0x4d3369b049f91f062213fbcd4f60f8b9c4a082470c3105945654715567a9c2ba",
        "value": 4845750.465766103,
        "asset": "CHAPPY",
        "category": "token",
        "rawContract": {
          "rawValue": "0x000000000000000000000000000000000000000000040220a8bbc7f8611b1650",
          "address": "0x008faa8bc8157f8d19cd716e8cf1bae0ccad74be",
          "decimals": 18
        },
        "log": {
          "address": "0x008faa8bc8157f8d19cd716e8cf1bae0ccad74be",
          "topics": [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x000000000000000000000000860598a0000e0ea354318e424796366588c73426",
            "0x0000000000000000000000009e0f883c83d09c90c06876690acbfa3accbca9f3"
          ],
          "data": "0x000000000000000000000000000000000000000000040220a8bbc7f8611b1650",
          "blockNumber": "0x12780cf",
          "transactionHash": "0x4d3369b049f91f062213fbcd4f60f8b9c4a082470c3105945654715567a9c2ba",
          "transactionIndex": "0xa",
          "blockHash": "0x7ac811dc12912225b1f12a13593c4d5b6a01d42cdc25abfd0172170d66eb6f1b",
          "logIndex": "0x57",
          "removed": false
        }
      }
    ]
  }
}
*/
