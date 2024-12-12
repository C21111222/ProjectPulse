# Étape 1: Base avec Playwright préinstallé
FROM node:22 as base

WORKDIR /app
RUN npm install -g npm@latest
RUN npx playwright install
RUN npx playwright install-deps

# Étape 2: Application spécifique
FROM base as app

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3333
CMD ["npm", "run", "dev"]
