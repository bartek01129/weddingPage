# # Build stage
# FROM node:22-alpine AS build

# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run build

# # Production stage
# FROM nginx:alpine

# COPY --from=builder /app/dist /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# EXPOSE 80

# CMD ["nginx", "-g", "daemon off;"]


# Build stage
FROM node:22-alpine AS build

WORKDIR /build/slubpaulinabartek
COPY package.json package-lock.json ./
RUN npm ci --silent

ARG VITE_PASSWORD
ENV VITE_PASSWORD=$VITE_PASSWORD

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS production
WORKDIR /app/slubpaulinabartek
RUN npm install -g serve

COPY --from=build /build/slubpaulinabartek/dist ./dist

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app/slubpaulinabartek

USER appuser
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:3000"]