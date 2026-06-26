# Use Node.js LTS image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY server/package*.json ./

# Install dependencies
RUN npm install --production

# Copy server files
COPY server/ .

# Expose port
EXPOSE 3000

# Start the application
CMD [ "npm", "start" ]
