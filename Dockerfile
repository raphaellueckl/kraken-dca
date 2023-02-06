FROM node:18-alpine

WORKDIR /bot
ADD bot.js /bot/
USER node

CMD ["node", "bot.js"]
