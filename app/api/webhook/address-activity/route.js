import { kv } from "@vercel/kv";
import { sendError, sendMessage } from "../../../../helpers/send";
import { WALLETS_KEY, walletAlert } from "../../../../helpers/wallets";
import * as CONFIG from "../../../../helpers/config";

export const POST = async (request) => {
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
        // category,
        rawContract: { address },
      } = a;
      // const message = `<b><i>${alert.name}</i></b>\n\n<code>${toAddress.slice(
      //   -4
      // )}</code> received <b>${value} $${asset}</b>\nCA: <code>${address}</code>`;

      const alertNameString = `<b><i>${walletAlert.name}</i></b>`;
      const tokenString = `Token: <b>$${asset.toUpperCase()}</b>`;
      const caString = `CA: <code>${address}</code>`;
      // const distinctWalletsString = `Distinct wallets: 1`;
      const buyerString = `Wallet: <code>${toAddress}</code>`;
      const valueString = value ? `Txn amount: ${value}` : null;
      const tokenLinkString = `<a href="https://www.candlestick.io/crypto/${address}">View on Candlestick</a>`;

      const message = [
        alertNameString + "\n",
        tokenString,
        caString,
        // distinctWalletsString,
        buyerString,
        valueString,
        tokenLinkString,
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

/*
{
  "blockNum": "0xdf34a3",
  "hash": "0x7a4a39da2a3fa1fc2ef88fd1eaea070286ed2aba21e0419dcfb6d5c5d9f02a72",
  "fromAddress": "0x503828976d22510aad0201ac7ec88293211d23da",
  "toAddress": "0xbe3f4b43db5eb49d1f48f53443b9abce45da3b79",
  "value": 293.092129,
  "erc721TokenId": null,
  "erc1155Metadata": null,
  "asset": "USDC",
  "category": "token",
  "rawContract": {
    "rawValue": "0x0000000000000000000000000000000000000000000000000000000011783b21",
    "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "decimals": 6
  },
  "typeTraceAddress": null,
  "log": {
    "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "topics": [
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      "0x000000000000000000000000503828976d22510aad0201ac7ec88293211d23da",
      "0x000000000000000000000000be3f4b43db5eb49d1f48f53443b9abce45da3b79"
    ],
    "data": "0x0000000000000000000000000000000000000000000000000000000011783b21",
    "blockNumber": "0xdf34a3",
    "transactionHash": "0x7a4a39da2a3fa1fc2ef88fd1eaea070286ed2aba21e0419dcfb6d5c5d9f02a72",
    "transactionIndex": "0x46",
    "blockHash": "0xa99ec54413bd3db3f9bdb0c1ad3ab1400ee0ecefb47803e17f9d33bc4d0a1e91",
    "logIndex": "0x6e",
    "removed": false
  }
}
*/
