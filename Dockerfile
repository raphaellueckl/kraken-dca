FROM node:18-alpine

ENV NODE_ENV=production
WORKDIR /app
ADD app.js /app/
USER node

CMD ["node", "app.js"]
