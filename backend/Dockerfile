# FROM node:20-alpine

# WORKDIR /app

# COPY package*.json ./
# RUN npm install --production

# COPY . .

# EXPOSE 3001

# CMD ["node", "server.js"]


FROM node:22-alpine

WORKDIR /app/slubpaulinabartek-backend

COPY package*.json ./
RUN npm ci --production --silent

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]