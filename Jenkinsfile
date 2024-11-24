pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'adonisjs-project'
        CONTAINER_NAME = 'adonisjs-container'
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
                    // Lancer le nouveau conteneur Docker sur le port 3333
                    sh "docker run -d -p 3333:3333 --name $CONTAINER_NAME $DOCKER_IMAGE"
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
