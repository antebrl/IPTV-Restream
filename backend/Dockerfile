# Backend Dockerfile
FROM node:20

# Install ffmpeg with NVIDIA GPU support
# For GPU support, ffmpeg needs to be compiled with NVENC/NVDEC support
# or use a pre-built version with NVIDIA support
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Note: For full NVIDIA GPU support, you may need to build ffmpeg from source
# with --enable-cuda-nvcc --enable-cuvid --enable-nvenc --enable-nonfree
# or use a pre-built image like nvidia/cuda with ffmpeg compiled with GPU support
# Uncomment below to install additional NVIDIA libraries if needed:
# RUN apt-get update && apt-get install -y \
#     libnvidia-encode-* \
#     libnvidia-decode-* \
#     && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 5000
CMD ["npm", "start"]