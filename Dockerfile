FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY frontend/package.json frontend/package-lock.json frontend/
RUN npm ci --prefix frontend

COPY . .

RUN npm run onixsat:frontend:build

RUN mkdir -p saida

EXPOSE 8081

ENV NODE_ENV=production
ENV PORT=8081

CMD ["node", "scripts/server_excessos.js"]
