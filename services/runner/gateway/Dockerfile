FROM node:24-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app/services/runner/gateway
COPY services/runner/gateway/package.json services/runner/gateway/package-lock.json ./
RUN npm ci
COPY services/runner/gateway/tsconfig.json ./
COPY services/runner/gateway/src ./src
COPY services/runner/gateway/migrations ./migrations
COPY contracts/learning-event-contract.ts /app/contracts/learning-event-contract.ts
COPY content/mentor-index.json /app/content/mentor-index.json
COPY content/verified-public-cases.json /app/content/verified-public-cases.json
COPY content/problems /app/content/problems
EXPOSE 8787
CMD ["npm", "run", "start"]
