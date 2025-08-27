# Base image: Node LTS
FROM node:lts-alpine3.21

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy rest of the code
COPY . .

# Build the app
RUN npm run build

# Expose port (NestJS runs on 3000)
EXPOSE 3000

# Run the app
CMD ["node", "dist/main.js"]
