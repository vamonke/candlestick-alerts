import AlertToken from "@/classes/AlertToken";
import config from "@/classes/Config";
import { getTimestamp } from "@/helpers/parse";
import { Bot, Context } from "grammy";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is unset");

const bot = new Bot(BOT_TOKEN);

const handleRefresh = async (ctx: Context): Promise<void> => {
  console.log("🌄 Received callbackQuery", JSON.stringify(ctx));

  const message = ctx.callbackQuery.message;
  if (!message || !message.date) {
    console.log("Message is too old");
    return;
  }

  await ctx.answerCallbackQuery({ text: "Refreshing..." });

  try {
    await config.init();
    const alertToken = await AlertToken.getAlertTokenFromMessage(message);
    const text = await alertToken.craftMessage();
    const timestamp = getTimestamp();
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      link_preview_options: {
        is_disabled: true,
      },
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `🔃 Last updated at ${timestamp}`,
              callback_data: "refresh",
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Error refreshing message", error);
  }
};

bot.callbackQuery("refresh", handleRefresh);

export default bot;
