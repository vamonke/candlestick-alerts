import { unstable_noStore as noStore } from "next/cache";
import { kv } from "@vercel/kv";
import { Alchemy, Network } from "alchemy-sdk";

import { getAuthToken } from "../../../helpers/auth";
import { sendError, sendMessage } from "../../../helpers/send";
import * as CONFIG from "../../../helpers/config";
import {
  ADDRESS_ACTIVITY_WEBHOOK_ID,
  WALLETS_KEY,
  walletAlert,
} from "../../../helpers/wallets";

export async function GET() {
  noStore();
  try {
    return await handler();
  } catch (error) {
    sendError(error);
    return Response.json({ ok: false, error });
  }
}

const { CANDLESTICK_PROXY } = CONFIG;

const handler = async () => {
  console.log("🚀 Running top wallets cron job");
  console.log(`Parameters: ${JSON.stringify(CONFIG, null, 2)}`);

  console.log(`Alert params: ${JSON.stringify(walletAlert, null, 2)}`);
  const authToken = await getAuthToken();

  if (!authToken) {
    const error = "⁉️ Missing authToken";
    sendError(error);
    return Response.json({ error }, { status: 500 });
  }

  const walletAddresses = await getTopWallets({ authToken });

  if (!walletAddresses?.length) {
    const error = "⁉️ Error fetching top wallets";
    sendError(error);
    return Response.json({ error }, { status: 500 });
  }

  const success = await setWallets(walletAddresses);
  if (!success) {
    const error = "⁉️ Error setting top wallets";
    sendError(error);
    return Response.json({ error }, { status: 500 });
  }

  const query = walletAlert.query;
  const title = `<i><b>👛 Alert 3: Monitoring new top ${walletAddresses.length} wallets</b></i>`;
  const alertParams =
    `<i>` +
    [
      `Sorted by ROI`,
      `Token traded in 1M`,
      `Token first-in in 1M`,
      `Active within 7D`,
      `Total profit ≥ $${query.total_profit}`,
      `Win rate ≥ ${query.win_rate * 100}%`,
      `Tokens traded ≥ ${query.token_traded}`,
      `Cost ≥ $${query.total_cost}`,
    ].join(", ") +
    `</i>`;
  const message = [title, alertParams].join("\n");
  await sendMessage(message);

  return Response.json({ success: true }, { status: 200 });
};

const getTopWallets = async ({ authToken }) => {
  try {
    console.log("Fetching top wallets..");
    const { count, query } = walletAlert;
    const { page_size } = query;
    const endpoint = `${CANDLESTICK_PROXY}/api/v1/address-explore/top-total-roi`;
    const totalPages = Math.ceil(count / page_size);
    const fetchPromises = [];

    for (let page = 1; page <= totalPages; page++) {
      const request = async () => {
        const url = new URL(endpoint);
        const searchParams = new URLSearchParams({
          current_page: page,
          ...query,
        });
        url.search = searchParams.toString();
        console.log(`🔗 Fetching page ${page} top wallets from:`, url.href);
        const response = await fetch(url, {
          headers: {
            "x-authorization": authToken,
            "Content-Type": "application/json",
          },
        });
        const json = await response.json();
        const addresses = json.data.chart.map(
          (wallet) => wallet.addressInfo.address
        );
        const start = page_size * (page - 1) + 1;
        const end = addresses.length + page_size * (page - 1);
        console.log(
          `✅ Fetched ${addresses.length} wallets, page ${page}, ${start} - ${end}`
        );
        return addresses;
      };
      fetchPromises.push(request());
    }

    const responses = await Promise.all(fetchPromises);
    const wallets = responses.flat();
    const distinctWallets = [...new Set(wallets)];

    console.log(`✅ Fetched top ${distinctWallets.length} wallets`);

    return distinctWallets;
  } catch (error) {
    sendError({ message: "Error fetching top wallets", error });
    return null;
  }
};

const setWallets = async (wallets) => {
  try {
    console.log("Monitoring wallets..");
    await monitorWallets(wallets);
    console.log("✅ Successfully set Alchemy Notify webhook");

    console.log("Setting wallets in KV store..");
    const result = await kv.set(WALLETS_KEY, wallets);
    console.log("✅ Successfully set wallets in KV store");

    return true;
  } catch (error) {
    sendError({ message: "Error setting wallets in KV store", error });
    return false;
  }
};

const monitorWallets = async (wallets) => {
  // authToken is required to use Notify APIs. Found on the top right corner of
  // https://dashboard.alchemy.com/notify.
  const settings = {
    authToken: process.env.ALCHEMY_AUTH_TOKEN,
    network: Network.ETH_MAINNET, // Replace with your network.
  };

  const alchemy = new Alchemy(settings);

  // Updating Address Activity Webhook: replace all addresses
  await alchemy.notify.updateWebhook(ADDRESS_ACTIVITY_WEBHOOK_ID, {
    newAddresses: wallets,
  });
};
