import { Bot, webhookCallback } from "grammy";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(token);

bot.command("start", async (ctx) => {
  await ctx.reply("Hello!");
});

export default async function handler(req, res) {
  console.log("req.method", req.method);
  console.log("req.url", req.url);
  console.log("req.headers", req.headers);
  console.log("req.body", req.body);

  if (req.method === "POST") {
    const result = await webhookCallback(bot, "next-js");
    console.log("result", JSON.stringify(result));
    res.status(200).end();
  } else {
    res.status(405).end();
  }
}
