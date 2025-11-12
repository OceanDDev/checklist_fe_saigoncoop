# Stage 1: Build React
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve bằng nginx
FROM nginx:alpine

# Copy build files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config (tạo file này ở bước sau)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 5173 (hoặc port nào bạn muốn)
EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]