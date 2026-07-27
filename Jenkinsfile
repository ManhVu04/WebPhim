pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Start MongoDB') {
            steps {
                sh 'docker compose -f docker-compose.dev.yml up -d --wait mongo'
            }
        }

        stage('Quality Gates') {
            parallel {
                stage('Backend Verify') {
                    steps {
                        dir('BEPhim') {
                            sh '''java -version 2>&1 | grep -q 'version "21' '''
                            sh './mvnw clean verify'
                        }
                    }
                }

                stage('Frontend Verify') {
                    steps {
                        dir('fe') {
                            sh 'npm ci'
                            sh 'npm run lint'
                            sh 'npm test'
                            sh 'npm run build'
                            sh 'npm run audit:ci'
                        }
                    }
                }
            }
        }

        stage('Backend Dependency Audit') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'oss-index-api',
                        usernameVariable: 'OSS_INDEX_USERNAME',
                        passwordVariable: 'OSS_INDEX_TOKEN'
                    )
                ]) {
                    dir('BEPhim') {
                        sh '''
                            set -eu
                            settings_file="$WORKSPACE/.ossindex-settings.xml"
                            trap 'rm -f "$settings_file"' EXIT
                            umask 077
                            cat > "$settings_file" <<'SETTINGS'
<settings>
  <servers>
    <server>
      <id>ossindex</id>
      <username>${env.OSS_INDEX_USERNAME}</username>
      <password>${env.OSS_INDEX_TOKEN}</password>
    </server>
  </servers>
</settings>
SETTINGS
                            ./mvnw --settings "$settings_file" \
                                org.sonatype.ossindex.maven:ossindex-maven-plugin:3.1.0:audit \
                                -Dossindex.authId=ossindex \
                                -Dossindex.reportFile=target/ossindex-report.json
                        '''
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'BEPhim/target/ossindex-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                archiveArtifacts artifacts: 'BEPhim/target/*.jar', fingerprint: true
                archiveArtifacts artifacts: 'fe/dist/**', fingerprint: true
            }
        }
    }

    post {
        always {
            sh 'docker compose -f docker-compose.dev.yml down --remove-orphans || true'
            cleanWs()
        }
        success {
            echo 'Build and security gates succeeded.'
        }
        failure {
            echo 'Build or security gate failed.'
        }
    }
}
