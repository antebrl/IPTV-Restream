# Backend Dockerfile
FROM node:20

# Install ffmpeg with NVIDIA GPU support
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 5000
CMD ["npm", "start"]
