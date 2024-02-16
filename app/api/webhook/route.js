import { Bot, webhookCallback } from "grammy";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(token);

bot.command("start", async (ctx) => {
  console.log("ctx", JSON.stringify(ctx));
  await ctx.reply("Hello!");
});

export const POST = webhookCallback(bot, "std/http");
