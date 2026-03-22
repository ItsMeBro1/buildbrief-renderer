FROM node:22-bullseye

RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --build-from-source
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

Salva, poi:
```
cd C:\Users\dampa\OneDrive\Desktop\buildbrief-renderer
git add .
git commit -m "add dockerfile for canvas"
git push