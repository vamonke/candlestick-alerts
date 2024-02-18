import { Bot } from "grammy";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(BOT_TOKEN);

// bot.command("start", async (ctx) => {
//   console.log("ctx", JSON.stringify(ctx));
//   await ctx.reply("Hello!");
// });

// bot.on("message", async (ctx) => {
//   const message = ctx.message; // the message object
//   console.log("message", JSON.stringify(message));
//   await ctx.reply("I'm a bot!");
// });

export default bot;
