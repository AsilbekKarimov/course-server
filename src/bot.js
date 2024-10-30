require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: false });

const GROUP_CHAT_ID_PENDING = "-4570225346";
const GROUP_CHAT_ID_PAID = "-4564047481";

const pendingMessageMap = new Map();

const sendOrderToBot = (orderData) => {
  console.log("Sending order data:", orderData);

  const amountToDisplay =
    orderData.status === "ОПЛАЧЕНО" ? orderData.amount / 100 : orderData.amount;

  const formattedAmount = new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountToDisplay || 0);

  const statusSticker = orderData.status === "ОПЛАЧЕНО" ? "✅" : "🟡";

  const chatId =
    orderData.status === "ОПЛАЧЕНО"
      ? GROUP_CHAT_ID_PAID
      : GROUP_CHAT_ID_PENDING;

  const message = `
    🧾 <b>Заказ12 ${orderData.course_id?.prefix || ""}${
    orderData.invoiceNumber
  }:</b>
    🔸 <b>Курс:</b> ${orderData.courseTitle}
    🔸 <b>Клиент:</b> ${orderData.clientName}
    🔸 <b>Телефон:</b> ${orderData.clientPhone}    
    🔸 <b>Телеграм:</b> ${orderData.tgUsername || "Kiritilmagan"}
    ${statusSticker} <b>Статус:</b> ${orderData.status}

    🇺🇿 <b>Сумма:</b> ${formattedAmount} сум
  `;

  bot
    .sendMessage(chatId, message, { parse_mode: "HTML" })
    .then((sentMessage) => {
      console.log("Message sent successfully");

      // Only store pending messages
      if (orderData.status === "ВЫСТАВЛЕНО") {
        console.log(
          `Storing message ID ${sentMessage.message_id} for invoice ${orderData.invoiceNumber}`
        );
        pendingMessageMap.set(orderData.invoiceNumber, sentMessage.message_id);
      }
    })
    .catch((error) => {
      console.error("Error sending message to bot:", error);
    });
};

const updateOrderStatus = (orderData) => {
  if (orderData.status === "ОПЛАЧЕНО") {
    const messageId = pendingMessageMap.get(orderData.invoiceNumber);
    console.log(
      `Attempting to delete message ID ${messageId} for invoice ${orderData.invoiceNumber}`
    );

    if (messageId) {
      bot
        .deleteMessage(GROUP_CHAT_ID_PENDING, messageId)
        .then(() => {
          console.log("Pending message deleted successfully");
          pendingMessageMap.delete(orderData.invoiceNumber);
        })
        .catch((error) =>
          console.error("Error deleting message from pending group:", error)
        );
    } else {
      console.warn(
        `Message ID for invoice ${orderData.invoiceNumber} not found in pendingMessageMap`
      );
    }
  }

  sendOrderToBot(orderData);
};

module.exports = { bot, sendOrderToBot, updateOrderStatus };
