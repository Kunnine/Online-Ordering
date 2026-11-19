# Stage 1: Build React application
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=https://fastfood-backend-production-cec51710.up.railway.app/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: Serve with lightweight SPA server
FROM node:20-alpine
WORKDIR /app

RUN npm install -g serve
COPY --from=build /app/dist /app/dist

EXPOSE 3000

CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
