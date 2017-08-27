
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
        }

       stage('Build'){

         env.NODE_ENV = "test"

         print "Environment will be : ${env.NODE_ENV}"

         sh 'node -v'
         sh 'yarn install'
         sh 'yarn'

       }

       stage('Test'){

         env.NODE_ENV = "test"

         print "Environment will be : ${env.NODE_ENV}"

         sh 'yarn test'

       }

       stage('Cleanup'){

         echo 'prune and cleanup'

       }



    }
    catch (err) {

        currentBuild.result = "FAILURE"

        throw err
    }

}
