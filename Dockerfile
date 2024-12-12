# Étape 1: Utiliser une image Node.js comme base
FROM node:22

# Étape 2: Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Étape 3: Copier les fichiers de votre projet dans le conteneur
COPY package*.json ./

# Étape 4: Installer les dépendances
RUN npm install

RUN npx playwright install
RUN npx playwright install-deps
# Étape 5: Copier le reste du projet dans le conteneur
COPY . .

# Étape 6: Exposer le port 3333
EXPOSE 3333

# Étape 7: Démarrer l'application AdonisJS
CMD ["npm", "run", "dev"]
