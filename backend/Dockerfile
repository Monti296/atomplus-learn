FROM node:24-alpine AS build

WORKDIR /app
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma
RUN cd backend && npm ci && npx prisma generate

COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
RUN cd backend && npm run build

FROM node:24-alpine

WORKDIR /app/backend
ENV NODE_ENV=production
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci --omit=dev
COPY --from=build /app/backend/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
