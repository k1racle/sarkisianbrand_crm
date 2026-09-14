FROM node:20-alpine

WORKDIR /app

# Установка зависимостей для Prisma и сборки
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .

# Генерация Prisma Client
RUN npm run prisma:generate

# Сборка приложения
RUN npm run build

# Продакшн зависимости (опционально, можно убрать для dev)
# RUN npm prune --production

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
