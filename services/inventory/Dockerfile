FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN mkdir -p data
EXPOSE 3002
CMD ["node", "app/index.js"]