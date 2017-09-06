pipeline {
    agent any

    stages  {

        stage('Initialize') {
          steps {
            script {
              def node = tool name: 'Node-8.4.0', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
              env.PATH = "${node}/bin:${env.PATH}"
            }
            sh 'node -v'
            sh 'yarn install'
          }
        }

       stage('Build'){
         steps {
            sh 'yarn build'
         }
       }

       stage('Test'){
         steps {
            sh 'yarn ci-test'
            junit 'artifacts/test/xunit.xml'
         }
       }

       stage('Link'){
         steps {
            sh 'yarn link'
         }
       }

       stage('Archive'){
         steps {
            sh 'yarn pack'
            archiveArtifacts '*.tgz'
            publishHTML (target: [
                  allowMissing: false,
                  alwaysLinkToLastBuild: false,
                  keepAll: true,
                  reportDir: 'coverage/lcov-report',
                  reportFiles: 'index.html',
                  reportName: "Coverage Report"
                ])
         }
       }

       stage('Cleanup'){
         steps {
            cleanWs()
         }
       }

    }
}
