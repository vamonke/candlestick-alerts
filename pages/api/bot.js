import { Bot, webhookCallback } from "grammy";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is unset");

export default async function handler(req, res) {
  // console.log("req.method", req.method);
  // console.log("req.url", req.url);
  // console.log("req.headers", req.headers);
  // console.log("req.body", req.body);

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const bot = new Bot(token);
  bot.command("start", async (ctx) => {
    console.log("ctx", ctx);
    await ctx.reply("Hello!");
  });

  const result = webhookCallback(bot, "https");
  console.log("result", result(req, res));
  res.status(200).end();
}
