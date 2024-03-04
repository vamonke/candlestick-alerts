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
    await bot.api.sendMessage(userId, message, {
      parse_mode: "HTML",
      link_preview_options: {
        is_disabled: true,
      },
    });
  }
};

export const sendError = async (error) => {
  await bot.api.sendMessage(
    DEVELOPER_USER_ID,
    `Something went wrong\n\n${JSON.stringify(error)}`
  );
};