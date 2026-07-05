# Base stage
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Build stage
FROM base AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 4000
ENV NODE_ENV=production
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
