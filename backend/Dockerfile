FROM node:24-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY docs/db-data.json docs/test-data.json /app/docs/
USER node
EXPOSE 3001
CMD ["node", "app.js"]
