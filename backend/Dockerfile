FROM node:22-alpine

# ffmpeg/ffprobe: wyciąganie plakatu z filmu i transkod do H.264 mp4.
# Bez tego backend wstaje, ale odrzuca filmy (galeria zdjęć działa dalej).
RUN apk add --no-cache ffmpeg

WORKDIR /app/slubpaulinabartek-backend

COPY package*.json ./

RUN npm ci --production --silent

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]