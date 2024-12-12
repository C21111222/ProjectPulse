pipeline {
    agent any
    environment {
        DOCKER_IMAGE = 'adonisjs-project'
        CONTAINER_NAME = 'adonisjs-container'
        ENV_FILE_PATH = '/var/secret/.env'  // Chemin du fichier .env sur le VPS
        ENV_TEST_FILE_PATH = '/var/secret/.env.test'  // Chemin du fichier .env.test sur le VPS
        UPLOAD_DIR = '/var/projectpulse/uploads'  // Chemin du répertoire d'uploads sur le VPS
    }
    stages {
        stage('Build Docker Image') {
            steps {
                script {
                    // Construire l'image Docker à partir du Dockerfile
                    sh 'docker build -t $DOCKER_IMAGE .'
                }
            }
        }

        stage('Run Tests') {
            steps {
                script {
                    // Exécuter les tests dans un conteneur temporaire
                    sh "docker run --rm -v $UPLOAD_DIR:/app/uploads -v $ENV_FILE_PATH:/app/.env -v $ENV_TEST_FILE_PATH:/app/.env.test $DOCKER_IMAGE node ace test "
                }
            }
        }

        stage('Stop and Remove Old Container') {
            steps {
                script {
                    // Arrêter et supprimer l'ancien conteneur s'il existe
                    sh "docker rm -f $CONTAINER_NAME || true"
                }
            }
        }

        stage('Run Docker Container') {
            steps {
                script {
                    // Monter le fichier .env dans le conteneur
                    sh "docker run -d --network=host --name $CONTAINER_NAME -v $UPLOAD_DIR:/app/uploads -v $ENV_FILE_PATH:/app/.env $DOCKER_IMAGE"
                }
            }
        }
    }
}