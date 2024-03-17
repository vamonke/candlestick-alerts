import { webhookCallback } from "grammy";
import bot from "../../../../bot";

export const POST = async (request) => {
  console.log("📩 Telegram webhook");
  webhookCallback(bot, "std/http")(request);
  return Response.json({ ok: true });
};
