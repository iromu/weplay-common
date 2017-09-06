pipeline {
    agent any

    stages  {

       stage('Checkout'){
          checkout scm
       }

        stage('Initialize') {
          echo 'Initializing...'
          def node = tool name: 'Node-8.4.0', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
          env.PATH = "${node}/bin:${env.PATH}"
          sh 'node -v'
          sh 'yarn install'
        }

       stage('Build'){
         sh 'yarn build'
       }

       stage('Test'){
         sh 'yarn ci-test'
         junit 'artifacts/test/xunit.xml'
       }

       stage('Link'){
         sh 'yarn link'
       }

       stage('Archive'){
         sh 'yarn pack'
         archiveArtifacts '*.tgz'
       }

       stage('Cleanup'){
         cleanWs()
       }

    }
}
