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
      const result = await bot.api.sendMessage(userId, message, {
        parse_mode: "HTML",
        link_preview_options: {
          is_disabled: true,
        },
      });
      if (!DEV_MODE) {
        console.log(`💌 Sent message to ${userId}`, result);
      }
    } catch (error) {
      console.error(`🚨 Error sending message to ${userId}`, error);
    }
  }
};

export const sendError = async (error) => {
  console.error("🚨 Error:", error);
  try {
    await bot.api.sendMessage(
      DEVELOPER_USER_ID,
      `Error:\n<pre>${JSON.stringify(error)}</pre>`,
      {
        parse_mode: "HTML",
        link_preview_options: {
          is_disabled: true,
        },
      }
    );
  } catch (error) {
    console.error("🚨 Error sending error message", error);
  }
};
