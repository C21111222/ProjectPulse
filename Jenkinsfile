pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'adonisjs-project'
        CONTAINER_NAME = 'adonisjs-container'
        ENV_FILE_PATH = '/var/secret/.env'  // Chemin du fichier .env sur le VPS
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
                    sh "docker run -d --network=host --name $CONTAINER_NAME -v /var/projectpulse/uploads:/app/uploads $ENV_FILE_PATH:/app/.env $DOCKER_IMAGE"
                }
            }
        }
    }

    post {
        always {
            // Nettoyage de l'espace de travail après le déploiement
            cleanWs()
        }
    }
}
