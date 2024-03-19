import { Bot } from "grammy";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(BOT_TOKEN);

// bot.command("start", async (ctx) => {
//   console.log("ctx", JSON.stringify(ctx));
//   await ctx.reply("Hello!");
// });

bot.callbackQuery("refresh", async (ctx) => {
  console.log("ctx", JSON.stringify(ctx));
  // await ctx.answerCallbackQuery({ text: "Refreshing..." });
  await ctx.answerCallbackQuery();

  const now = new Date();

  await ctx.editMessageText(`Refreshed at ${now.toLocaleTimeString()}`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Refresh",
            callback_data: "refresh",
          },
        ],
      ],
    },
  });
});

// bot.on("callback_query", async (ctx) => {
//   const callbackQuery = ctx.callbackQuery;
//   console.log(
//     "Received callback query:",
//     JSON.stringify(callbackQuery, null, 2)
//   );

//   const message = callbackQuery.message;
//   if (!message.date) {
//     console.log("Message is too old");
//     return;
//   }

//   console.log("Message is fresh");

//   await ctx.answerCallbackQuery({ text: "You were curious, indeed!" });

//   // await ctx.answerCallbackQuery();
// });

bot.on("message", async (ctx) => {
  const message = ctx.message; // the message object
  console.log("Received message:", message);
  // await ctx.reply("I'm a bot!");
});

export default bot;
