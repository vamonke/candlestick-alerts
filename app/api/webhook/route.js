import { Bot, webhookCallback } from "grammy";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(token);

bot.command("start", async (ctx) => {
  console.log("ctx", JSON.stringify(ctx));
  await ctx.reply("Hello!");
});

bot.on("message", async (ctx) => {
  const message = ctx.message; // the message object
  console.log("message", JSON.stringify(message));
  await ctx.reply("I got your message!");
});

export const POST = (request) => {
  const body = request.body;
  console.log("body", JSON.stringify(body));
  webhookCallback(bot, "std/http")(request);
  return Response.json({ ok: true, body });
};
