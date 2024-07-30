# Selete Base Image
FROM --platform=linux/amd64 node:22.5.1

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Delete node_modules and package-lock.json (if have)
RUN rm -rf node_modules package-lock.json

# Install app dependencies
RUN npm install

# Install bcrypt
RUN npm install bcrypt

# Bundle app source
COPY . .

# Expose ports for HTTP and TCP
EXPOSE 8080
EXPOSE 3000

# Start the app
CMD ["node", "tcpserver.js"]


