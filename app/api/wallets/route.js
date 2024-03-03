import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import bot from "../../../bot";
import MOCK_WALLETS from "../../../mock-wallets.json";
import { getAuthToken } from "../../../helpers/auth";
import { kv } from "@vercel/kv";

const DEV_MODE = false;
const USE_MOCK_DATA = false;
const SEND_MESSAGE = true;
const WALLETS_KEY = "topWallets";

const PARAMETERS = {
  DEV_MODE,
  USE_MOCK_DATA,
  SEND_MESSAGE,
};

console.log("🚀 Running top wallets cron job");
console.log(`Parameters: ${JSON.stringify(PARAMETERS, null, 2)}`);

dayjs.extend(duration);

export async function GET() {
  noStore();
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

  await bot.api.sendMessage(
    DEVELOPER_USER_ID,
    `👛 Successfully fetched top ${walletAddresses.length} wallets`
  );

  return Response.json({ success }, { status: 200 });
}

const getTopWallets = async ({ authToken }) => {
  try {
    const endpoint =
      "https://www.candlestick.io/api/v1/address-explore/top-total-roi";

    const url = new URL(endpoint);
    const searchParamsObj = {
      current_page: 1,
      page_size: 50,
      sort_type: 0,
      oriented: 1,
      blockchain_id: 2,
      active_within: 2,
      timeframe: 3,
      total_profit: 4000,
      profitFilterType: "totalProfit",
      total_cost: 100,
      first_in: 1,
      token_traded: 3,
      win_rate: 0.9,
    };
    Object.keys(searchParamsObj).forEach((key) =>
      url.searchParams.append(key, searchParamsObj[key])
    );

    const result = await fetch(url, {
      headers: {
        "x-authorization": authToken,
        "Content-Type": "application/json",
      },
      method: "GET",
    });
    const json = await result.json();
    console.log("✅ Fetched top wallets -", json.data.chart.length, "wallets");
    return json?.data?.chart?.map((wallet) => wallet.addressInfo.address);
  } catch (error) {
    console.error("Error fetching top wallets", error);
    sendError({ message: "Error fetching top wallets", error });
    return null;
  }
};

const DEVELOPER_USER_ID = 265435469;

const sendError = async (error) => {
  await bot.api.sendMessage(
    DEVELOPER_USER_ID,
    `Something went wrong\n\n${JSON.stringify(error)}`
  );
};

const setWallets = async (wallets) => {
  try {
    console.log("Setting wallets in KV store..");
    const result = await kv.set(WALLETS_KEY, wallets);
    console.log("✅ Successfully set wallets in KV store");
    return true;
  } catch (error) {
    console.error(error);
    sendError({ message: "Error setting wallets in KV store", error });
    return false;
  }
};
