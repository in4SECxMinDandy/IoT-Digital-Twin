FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace @iot-twin/api

COPY apps/api apps/api

CMD ["npm", "run", "simulator", "--workspace", "@iot-twin/api"]
