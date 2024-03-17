import { unstable_noStore as noStore } from "next/cache";
import { webhookCallback } from "grammy";
import bot from "../../../../bot";

export const POST = async (request) => {
  noStore();
  console.log("📩 Telegram webhook");
  webhookCallback(bot, "std/http")(request);
  return Response.json({ ok: true });
};

// curl -F "url=https://candlestick-alerts.vercel.app/api/webhook/telegram" https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
