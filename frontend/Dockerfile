FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install && \
    npm install @tailwindcss/oxide-linux-x64-musl

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
