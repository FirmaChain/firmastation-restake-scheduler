import TelegramBot from 'node-telegram-bot-api';
import { TELEGRAM_BOT_CHATID, TELEGRAM_BOT_TOKEN, TELEGRAM_ERROR_BOT_CHATID, TELEGRAM_ERROR_BOT_TOKEN } from "src/config"

const restake_bot_token = TELEGRAM_BOT_TOKEN;
const restake_bot_chatId = TELEGRAM_BOT_CHATID;
const restakeTelegram = new TelegramBot(restake_bot_token, { polling: false });

const restake_error_bot_token = TELEGRAM_ERROR_BOT_TOKEN;
const restake_error_bot_chatId = TELEGRAM_ERROR_BOT_CHATID;
const restakeErrorTelegram = new TelegramBot(restake_error_bot_token, { polling: false });

export const sendRestakeResultMessage = async (message: string) => {
  try {
    await restakeTelegram.sendMessage(restake_bot_chatId, message, { disable_web_page_preview: true });
    console.log('<SUCCESS> Send message(restake result)');
  } catch (e) {
    console.log('<FAILED> Send message(restake result)');
  }
}

export const sendRestakeFailedResultMessage = async (message: string) => {
  try {
    await restakeErrorTelegram.sendMessage(restake_error_bot_chatId, message, { disable_web_page_preview: true });
    console.log('<SUCCESS> Send message(restake error result)');
  } catch (e) {
    console.log('<FAILED> Send message(restake error result)');
  }
}