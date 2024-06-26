import bot from "../bot";
import { DEV_MODE, SEND_MESSAGE } from "./config.js";

const DEVELOPER_USER_ID = 7160810601;
const V2_USER_ID = 278239097;
// const CHANNEL_ID = "@candlestick_alerts";

const USER_IDS = [
  DEVELOPER_USER_ID, // Developer
  V2_USER_ID, // User V2
  // CHANNEL_ID, // Telegram channel
];

export const sendMessage = async (message, replyMarkup) => {
  console.log("📢 Sending message:", message);
  const recipientIds = DEV_MODE ? [DEVELOPER_USER_ID] : USER_IDS;
  if (DEV_MODE) {
    console.log("👨‍💻 Running in dev mode", recipientIds);
  }
  for (const userId of recipientIds) {
    if (!SEND_MESSAGE) {
      console.log(`Skipping sending message to ${userId}`);
      continue;
    }
    try {
      const result = await safeSend(userId, message, replyMarkup);
      if (!DEV_MODE) {
        console.log(`📤 Sent message to ${userId}`, result);
      }
      return result;
    } catch (error) {
      console.error(`📛 Failed to send message to ${userId}`, error);
    }
  }
};

export const sendError = async (error) => {
  console.error("🚨 Error:", error);
  try {
    await safeSend(
      DEVELOPER_USER_ID,
      `Error:\n<pre>${JSON.stringify(error)}</pre>`
    );
  } catch (error) {
    console.error("📛 Failed to send error message", error);
  }
};

const MAX_RETRIES = 3;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const safeSend = async (userId, message, replyMarkup) => {
  let retries = 0;
  let sendError;
  while (retries < MAX_RETRIES) {
    try {
      const result = await bot.api.sendMessage(userId, message, {
        parse_mode: "HTML",
        link_preview_options: {
          is_disabled: true,
        },
        reply_markup: replyMarkup,
      });
      return result;
    } catch (error) {
      sendError = error;
      retries++;
      console.warn(
        `🚨 Failed to send message to ${userId}`,
        `Attempt:`,
        retries,
        `Error:`,
        error
      );
      await wait(1000 * retries);
    }
  }
  if (retries > MAX_RETRIES) {
    throw sendError;
  }
};

export const sendMessageV2 = async (chatId, message, replyMarkup) => {
  if (DEV_MODE && chatId.toString() !== DEVELOPER_USER_ID.toString()) {
    console.log(`DEV MODE: Skipping sending message to ${chatId}`);
    return;
  }
  console.log(`📢 Sending message to ${chatId}:`, message);
  try {
    const result = await safeSend(chatId, message, replyMarkup);
    return result;
  } catch (error) {
    console.error(`📛 Failed to send message to ${chatId}`, error);
  }
};
