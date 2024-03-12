import bot from "../bot";
import { DEV_MODE, SEND_MESSAGE } from "./config.js";

const DEVELOPER_USER_ID = 265435469;
const USER_V_ID = 278239097;

const USER_IDS = [
  // dev
  DEVELOPER_USER_ID,
  USER_V_ID,
];

export const sendMessage = async (message) => {
  // const recipientIds = USER_IDS;
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
      const result = await safeSend(userId, message);
      if (!DEV_MODE) {
        console.log(`💌 Sent message to ${userId}`, result);
      }
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

const safeSend = async (userId, message) => {
  let retries = 0;
  let sendError;
  while (retries < MAX_RETRIES) {
    try {
      const result = await bot.api.sendMessage(userId, message, {
        parse_mode: "HTML",
        link_preview_options: {
          is_disabled: true,
        },
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
