import { unstable_noStore as noStore } from "next/cache";
import { getAuthToken } from "@/helpers/auth";
import { fetchPortfolioAESKey } from "@/helpers/portfolioAESKey";
import { sendError } from "@/helpers/send";
import * as CONFIG from "@/helpers/config";
import Alert from "@/classes/Alert";

export const maxDuration = 60; // This function can run for a maximum of 60 seconds

export async function GET() {
  noStore();
  try {
    return await handler();
  } catch (error) {
    sendError(error);
    return Response.json({ ok: false, error });
  }
}

const handler = async () => {
  console.log("🚀 Running cron job");
  console.log(`Config: ${JSON.stringify(CONFIG, null, 2)}`);
  const authToken = await getAuthToken();
  const portfolioAESKey = await fetchPortfolioAESKey();

  if (!authToken) {
    const error = "⁉️ Missing token";
    sendError(error);
    return Response.json({ error }, { status: 500 });
  }

  const alerts = [
    new Alert({
      name: "🔴 Alert 1 - Stealth Wallets (1D, 1 token)",
      query: {
        pageSize: 100,
        valueFilter: 120,
        walletAgeDays: 1,
        boughtTokenLimit: true, // Tokens bought <= 2
      },
      filters: {
        minsAgo: 5,
        // minsAgo: 300, // For testing
        minDistinctWallets: 3,
        excludedTokens: ["WETH", "weth"],
      },
    }),
  ];

  console.log(`Alerts to execute: ${alerts.length}`);

  for (const [index, alert] of alerts.entries()) {
    console.log(`Executing alert ${index + 1}: ${alert.name}`);
    console.log(`Parameters: ${JSON.stringify(alert, null, 2)}`);
    try {
      await alert.execute({ authToken, portfolioAESKey });
      console.log(`Finished executing alert ${index + 1}: ${alert.name}`);
    } catch (error) {
      sendError({ message: "Error executing alert", error });
    }
  }

  return Response.json({ success: true }, { status: 200 });
};
