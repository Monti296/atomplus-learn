FROM node:24-alpine AS build

WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY converter/package.json converter/package.json
COPY frontend/package.json frontend/package.json
COPY gateway/package.json gateway/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY backend/tsconfig.json backend/tsconfig.json
COPY backend/src backend/src
RUN npm run build --workspace=@atomplus-learn/backend

FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY converter/package.json converter/package.json
COPY frontend/package.json frontend/package.json
COPY gateway/package.json gateway/package.json
RUN npm ci --omit=dev
COPY --from=build /app/backend/dist backend/dist

EXPOSE 3000
CMD ["node", "backend/dist/main.js"]
