pipeline {
    agent none
    options { timestamps() }

    stages {
        stage('Input') {
            when {
                branch 'master'
                beforeInput true
            }
            steps {
                script {
                    env.DEPLOY_CLIENT = input \
                        message: 'Would you like to deploy the client to NPM?', \
                        parameters: [choice(name: 'DEPLOY_CLIENT', choices: ['Yes', 'No'], description: '')]
                }
            }
        }

        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    agent { label 'linux-slave' }
                    steps {
                        install()
                        sh "npm run test:unit -- --noColor -x \"--no-cache --verbose\""
                        sh "npm run check -- --noCache"
                    }
                    post {
                        always {
                            junit "dist/test/results-unit.xml"
                        }
                    }
                }

                stage('Integration Tests') {
                    agent { label 'win10-dservices' }
                    steps {
                        install()
                        bat "npm run test:int -- --noColor -x \"--no-cache --verbose\""
                    }
                    post {
                        always {
                            junit "dist/test/results-int.xml"
                        }
                    }
                }
            }
        }

        stage('Release') {
            agent { label 'linux-slave' }
            stages {
                stage('Install') {
                    steps {
                        install()
                        configure()
                    }
                }

                stage('Build') {
                    steps {
                        buildProject()
                        addReleaseChannels()
                    }
                }

                stage('Deploy') {
                    when { anyOf { branch 'develop' ; branch 'master' ; not { environment name: 'PROJECT', value: '' } } }
                    steps {
                        deployToS3()
                        deployToNPM()
                    }
                }
            }
        }
    }
}

def install() {
    withCredentials([string(credentialsId: "NPM_TOKEN_WRITE", variable: 'NPM_TOKEN')]) {
        if (isUnix()) {
            sh "echo //registry.npmjs.org/:_authToken=$NPM_TOKEN > $WORKSPACE/.npmrc"
        } else {
            bat "echo //registry.npmjs.org/:_authToken=$NPM_TOKEN > $WORKSPACE/.npmrc"
        }
    }

    if (isUnix()) {
        sh "npm ci"
    } else {
        bat "npm ci"
    }
}

def configure() {
    def config = readJSON file: './services.config.json'
    def manifest = readJSON file: './package.json'

    GIT_SHORT_SHA = GIT_COMMIT.substring(0, 7)
    PKG_VERSION = manifest.version
    METADATA = env.METADATA?.replaceAll(/[. \/#]/, '-')?.toLowerCase()
    TIMESTAMP = new Date().format("yyyyMMdd.HHmmss", TimeZone.getTimeZone('UTC'))
    SERVICE_NAME = config.NAME

    if (METADATA) {
        BUILD_VERSION = "${PKG_VERSION}-custom.${TIMESTAMP}+${METADATA.replaceAll('-', '.')}"
        MANIFEST_NAME = "tags/${METADATA}.json"
        CHANNEL = null
    } else if (env.PROJECT) {
        BUILD_VERSION = "${PKG_VERSION}-custom.${TIMESTAMP}"
        MANIFEST_NAME = null
        CHANNEL = null
    } else if (env.BRANCH_NAME == 'master') {
        BUILD_VERSION = PKG_VERSION
        MANIFEST_NAME = 'app.json'
        CHANNEL = 'stable'
    } else {
        BUILD_VERSION = "${PKG_VERSION}-alpha.${env.BUILD_NUMBER}"
        MANIFEST_NAME = 'app.staging.json'
        CHANNEL = 'staging'
    }

    // Local directory paths
    DIR_LOCAL_RES = './res/provider/'
    DIR_LOCAL_DIST = './dist/provider/'
    DIR_LOCAL_DOCS = './dist/docs/'

    // CDN directory paths
    DIR_CDN_BUILD_ROOT = env.DSERVICE_S3_ROOT + SERVICE_NAME + '/'
    DIR_CDN_BUILD_VERSION = DIR_CDN_BUILD_ROOT + BUILD_VERSION
    DIR_CDN_DOCS_ROOT = env.DSERVICE_S3_ROOT_DOCS + SERVICE_NAME + '/'
    DIR_CDN_DOCS_CHANNEL = DIR_CDN_DOCS_ROOT + CHANNEL
    DIR_CDN_DOCS_VERSION = DIR_CDN_DOCS_ROOT + BUILD_VERSION
}

def buildProject() {
    sh "npm run clean"
    sh "VERSION=${BUILD_VERSION} npm run build"
    sh "echo ${GIT_SHORT_SHA} > ${DIR_LOCAL_DIST}SHA.txt"

    sh "npm run zip"
    sh "npm install bootprint@2.0.1 bootprint-json-schema@2.0.0-rc.3 --no-save"
    sh "npm run docs"
}

def addReleaseChannels() {
    if (env.BRANCH_NAME == 'master') {
        sh "npm run channels"
    }
}

def deployToS3() {
    if (env.ALLOW_CDN != 'false') {
        PATHS_TO_INVALIDATE = []

        assert sh(script: "aws s3 ls ${DIR_CDN_BUILD_VERSION}/ --summarize", returnStdout: true).contains("Total Objects: 0")

        sh "aws s3 cp ${DIR_LOCAL_RES} ${DIR_CDN_BUILD_VERSION}/ --recursive --exclude \"*.svg\""
        sh "aws s3 cp ${DIR_LOCAL_RES} ${DIR_CDN_BUILD_VERSION}/ --recursive --exclude \"*\" --include \"*.svg\" --content-type \"image/svg+xml\""
        sh "aws s3 cp ${DIR_LOCAL_DIST} ${DIR_CDN_BUILD_VERSION}/ --recursive --exclude \"*.svg\""
        sh "aws s3 cp ${DIR_LOCAL_DIST} ${DIR_CDN_BUILD_VERSION}/ --recursive --exclude \"*\" --include \"*.svg\" --content-type \"image/svg+xml\""
        sh "aws s3 cp ./dist/client/openfin-${SERVICE_NAME}.js ${DIR_CDN_BUILD_VERSION}/"

        if (!env.PROJECT) {
            sh "aws s3 cp ${DIR_LOCAL_DOCS} ${DIR_CDN_DOCS_CHANNEL} --recursive"
            sh "aws s3 cp ${DIR_LOCAL_DOCS} ${DIR_CDN_DOCS_VERSION} --recursive"
            PATHS_TO_INVALIDATE << DIR_CDN_DOCS_CHANNEL
        }

        if (MANIFEST_NAME) {
            sh "aws s3 cp ${DIR_LOCAL_DIST}app.json ${DIR_CDN_BUILD_ROOT}${MANIFEST_NAME}"
            sh "aws s3 cp ${DIR_LOCAL_DIST} ${DIR_CDN_BUILD_ROOT} --exclude \"*\" --include \"app.runtime-*.json\""
            PATHS_TO_INVALIDATE << "${DIR_CDN_BUILD_ROOT}${MANIFEST_NAME}"
        }

        invalidateCache(PATHS_TO_INVALIDATE)
    }
}

def deployToNPM() {
    if (env.ALLOW_NPM != 'false' && env.DEPLOY_CLIENT != 'No') {
        withCredentials([string(credentialsId: 'NPM_TOKEN_WRITE', variable: 'NPM_TOKEN')]) {
            sh "echo //registry.npmjs.org/:_authToken=$NPM_TOKEN > $WORKSPACE/.npmrc"
        }

        if (BUILD_VERSION == PKG_VERSION) {
            // Assume production release
            echo "publishing to npm, version: ${BUILD_VERSION}"
            sh "npm publish"
        } else if (!env.PROJECT) {
            // Assume staging release, and tag as 'alpha'
            echo "publishing pre-release version to npm: ${BUILD_VERSION}"
            sh "npm version --no-git-tag-version ${BUILD_VERSION}"
            sh "npm publish --tag alpha"
            sh "npm version --no-git-tag-version ${PKG_VERSION}"
        } else {
            // Tag as 'custom', to not interfere with alpha/latest tags
            echo "publishing pre-release version to npm: ${BUILD_VERSION}"
            sh "npm version --no-git-tag-version ${BUILD_VERSION}"
            sh "npm publish --tag custom"
            sh "npm version --no-git-tag-version ${PKG_VERSION}"
        }
    }
}

def invalidateCache(PATHS) {
    if (!PATHS.isEmpty()) {
        BATCH = "Paths={Quantity=${PATHS.size()},Items=[${PATHS.collect { it.replace(env.CDN_S3_ROOT, "/") }.join(",")}]},CallerReference=${SERVICE_NAME}-${BUILD_VERSION}"
        CMD = "aws cloudfront create-invalidation --distribution-id ${env.CDN_S3_DISTRIBUTION_ID} --invalidation-batch \"${BATCH}\""
        INVALIDATION_ID = readJSON(text: sh(script: CMD, returnStdout: true)).Invalidation.Id
        sh "aws cloudfront wait invalidation-completed --distribution-id ${env.CDN_S3_DISTRIBUTION_ID} --id ${INVALIDATION_ID}"
    }
}
