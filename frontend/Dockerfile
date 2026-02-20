# --- Build stage ---
FROM node:22-alpine AS build

WORKDIR /build/slubpaulinabartek

COPY package.json package-lock.json ./
RUN npm ci --silent

ARG VITE_PASSWORD
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_CLOUDINARY_UPLOAD_PRESET

ENV VITE_PASSWORD=$VITE_PASSWORD \
    VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME \
    VITE_CLOUDINARY_UPLOAD_PRESET=$VITE_CLOUDINARY_UPLOAD_PRESET

COPY . .

RUN npm run build

# --- Production stage ---
FROM nginx:stable-alpine AS production

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY nginx.main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

COPY --from=build /build/slubpaulinabartek/dist /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf && \
    chown -R appuser:appgroup /usr/share/nginx/html /var/cache/nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appgroup /var/run/nginx.pid
    
USER appuser
EXPOSE 3000                          
CMD ["nginx", "-g", "daemon off;"]