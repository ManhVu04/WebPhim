pipeline {
    agent any

    environment {
        // Define any environment variables here
        // For example, if you need to set JAVA_HOME or NODE_HOME
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            parallel {
                stage('Backend') {
                    steps {
                        dir('BEPhim') {
                            // Verify backend is running on Java 21
                            sh 'java -version 2>&1 | grep -Eq "version \"21(\\.|\\\")"'
                            // Clean install and skip tests if you want to run them separately
                            sh './mvnw clean install -DskipTests'
                            // If you want to run tests, use: sh './mvnw clean test'
                        }
                    }
                }
                stage('Frontend') {
                    steps {
                        dir('fe') {
                            // Install npm dependencies
                            sh 'npm install'
                            // Build the frontend for production
                            sh 'npm run build'
                            // Optionally run lint or tests if available
                            // sh 'npm run lint'
                        }
                    }
                }
            }
        }

        stage('Test') {
            // If you didn't run tests in the Build stage, run them here
            // Example for backend tests:
            // steps {
            //     dir('BEPhim') {
            //         sh 'mvn test'
            //     }
            // }
            // Example for frontend tests (if you add a test script):
            // steps {
            //     dir('fe') {
            //         sh 'npm test'
            //     }
            // }
        }

        stage('Archive Artifacts') {
            steps {
                // Archive the backend JAR
                archiveArtifacts artifacts: 'BEPhim/target/*.jar', fingerprint: true
                // Archive the frontend build directory
                archiveArtifacts artifacts: 'fe/dist/**', fingerprint: true
            }
        }
    }

    post {
        always {
            // Clean up workspace if needed
            cleanWs()
        }
        success {
            echo 'Build succeeded!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}