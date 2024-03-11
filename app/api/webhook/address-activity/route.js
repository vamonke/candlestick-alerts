import { CovalentClient } from "@covalenthq/client-sdk";
import { kv } from "@vercel/kv";
import { unstable_noStore as noStore } from "next/cache";
import { getBlockTimestamp } from "../../../../helpers/block";
import {
  addBuyerStats,
  getCandleStickUrl,
} from "../../../../helpers/candlestick";
import * as CONFIG from "../../../../helpers/config";
import {
  getContractCreation,
  getContractInfo,
} from "../../../../helpers/contract";
import { getAge, getRelativeDate } from "../../../../helpers/parse";
import { fetchPortfolioAESKey } from "../../../../helpers/portfolioAESKey";
import { sendError, sendMessage } from "../../../../helpers/send";
import {
  constructTxnsTable2,
  constructWalletLinks,
  constructWalletsTable,
} from "../../../../helpers/table";
import { WALLETS_KEY, walletAlert } from "../../../../helpers/wallets";

export const maxDuration = 60; // This function can run for a maximum of 60 seconds
const maxTxnAgeMins = 5;

export const POST = async (request) => {
  noStore();
  try {
    return await handler(request);
  } catch (error) {
    sendError(error);
    return Response.json({ ok: false, error });
  }
};

const handler = async (request) => {
  console.log("🚀 Running address activity webhook");
  console.log(`Parameters: ${JSON.stringify(CONFIG, null, 2)}`);
  const { DEV_MODE } = CONFIG;

  const json = await request.json();
  console.log(`📫 Received body: ${JSON.stringify(json, null, 2)}`);

  const activity = json?.event?.activity;
  const webhookNotifyId = json?.id;

  const exists = await kv.set(webhookNotifyId, true, {
    get: true,
    ex: 60 * 60 * 24, // Expire in 24 hours
  });

  if (exists && !DEV_MODE) {
    console.log(`🔔 Webhook notification already exists: ${webhookNotifyId}`);
    return Response.json({ ok: true });
  }

  if (!activity) {
    sendError("⁉️ No activity found from webhook request");
    return Response.json({ ok: false, error: "No activity found" });
  }
  console.log(`📈 Activity count: ${activity.length}`);

  console.log(`Fetching top wallets...`);
  const topWallets = await getTopWalletsKV();
  console.log(`✅ Top wallets: ${JSON.stringify(topWallets, null, 2)}`);

  const {
    excludedTokens,
    excludedAddresses,
    showWalletStats,
    showWalletLinks,
    name: alertName,
  } = walletAlert;

  console.log(`Filtering activity...`);
  const matchedActivities = activity.filter(
    (a) =>
      (DEV_MODE || topWallets.includes(a.toAddress)) &&
      a.category === "token" &&
      !excludedTokens.includes(a.asset) &&
      !excludedAddresses.includes(a.fromAddress) &&
      !/reward|claim|\.com/i.test(a.asset)
  );

  if (!matchedActivities.length) {
    console.log("🥱 No matched activity found");
    return Response.json({ ok: true });
  }

  console.log(
    `🤓 Matched activity: ${JSON.stringify(matchedActivities, null, 2)}`
  );

  await Promise.all(
    matchedActivities.map(async (a) => {
      const {
        // fromAddress,
        toAddress: walletAddress,
        value,
        hash,
        blockNum,
        // category,
        rawContract: { address: contractAddress },
      } = a;

      const createdAt = await getContractCreation(contractAddress);
      if (!createdAt) {
        sendError(
          `⁉️ Failed to fetch contract creation date for address ${contractAddress}`
        );
        return;
      }

      const txnTime = await getBlockTimestamp(blockNum);
      const txnAge = getAge(txnTime);
      const txnAgeMins = txnAge.asMinutes();
      console.log(`Transaction age: ${txnAgeMins} minutes`);

      if (txnAgeMins > maxTxnAgeMins && !DEV_MODE) {
        sendError(
          `⏰ Skipping activity (hash: ${hash}) due to age ${txnAgeMins} minutes > ${maxTxnAgeMins} minutes`
        );
        return;
      }

      const contractInfo = await getContractInfo(contractAddress);
      if (!contractInfo) {
        sendError(
          `⁉️ Failed to fetch token info for address ${contractAddress}`
        );
        return;
      }

      const portfolioAESKey = await fetchPortfolioAESKey();
      const walletLink = getCandleStickUrl(walletAddress, portfolioAESKey);

      const walletObj = {
        address: walletAddress,
        link: walletLink,
      };

      if (showWalletStats) {
        await addBuyerStats({
          tokens: [
            {
              distinctAddresses: [walletObj],
            },
          ],
          portfolioAESKey,
        });
      }
      const txnInfo = await getTxnInfo(hash);

      const tokenName = contractInfo.name;
      const symbol = contractInfo.symbol;
      const txnValue = txnInfo?.value_quote;
      const price = txnValue && value ? txnValue / value : null;

      const alertNameString = `<b><i>${alertName}</i></b>`;
      const tokenString = `Token: <b>${tokenName} ($${symbol})</b>`;
      const caString = `CA: <code>${contractAddress}</code>`;
      const walletString = `Wallet: <code>${walletAddress}</code>`;
      const ageString = `Token age: ${getRelativeDate(createdAt)}`;
      const distinctWalletsString = `Distinct wallets: 1`;
      const totalTxnValueString = `Total txn value: ${
        txnValue ? `$${txnValue.toLocaleString()}` : "-"
      }`;
      const tokenLinkString = `<a href="https://www.candlestick.io/crypto/${contractAddress}">View ${symbol} on Candlestick</a>`;
      const transactionsTable = constructTxnsTable2([
        {
          address: walletAddress,
          buy_price: price,
          txn_value: txnValue,
          time: txnTime,
        },
      ]);
      const walletsTable = showWalletStats
        ? constructWalletsTable([walletObj])
        : null;
      const walletLinks = showWalletLinks
        ? constructWalletLinks([walletObj])
        : null;

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
        walletsTable,
        walletLinks,
      ]
        .filter(Boolean)
        .join("\n");

      console.log("📩 Sending message", message);
      sendMessage(message);
    })
  );

  return Response.json({ ok: true });
};

const getTopWalletsKV = async () => {
  const walletAddresses = await kv.get(WALLETS_KEY);
  return [...walletAddresses];
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getTxnInfo = async (txHash) => {
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
