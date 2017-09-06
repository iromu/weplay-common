node('node') {
    currentBuild.result = "SUCCESS"

    try {

       stage('Checkout'){
          checkout scm
       }

        stage('Initialize') {
          echo 'Initializing...'
          def node = tool name: 'Node-8.4.0', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
          env.PATH = "${node}/bin:${env.PATH}"
          env.NODE_ENV = "test"
          sh 'node -v'
          sh 'yarn install'
        }

       stage('Build'){
         env.NODE_ENV = "test"
         sh 'node -v'
         sh 'yarn build'
       }

       stage('Test'){
         env.NODE_ENV = "test"
         sh 'yarn ci-test'
         junit 'artifacts/test/xunit.xml'
       }

       stage('Link'){
         env.NODE_ENV = "test"
         sh 'yarn link'
       }

       stage('Archive'){
         sh 'yarn pack'
         archiveArtifacts '*.tgz', onlyIfSuccessful: true
       }

       stage('Cleanup'){
         cleanWs()
       }

    }
    catch (err) {
        currentBuild.result = "FAILURE"
        throw err
    }

}
