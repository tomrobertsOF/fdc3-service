import * as fs from 'fs';
import * as path from 'path';
import {Application, Request, Response} from 'express';

import {Hook, registerHook} from 'openfin-service-tooling/utils/allowHook';
import {CLIArguments} from 'openfin-service-tooling/types';
import {getProjectConfig} from 'openfin-service-tooling/utils/getProjectConfig';
import {getPlatformManifest} from 'openfin-service-tooling/utils/getManifest';
import {ClassicManifest, PlatformManifest} from 'openfin-service-tooling/utils/manifests';

const {PORT} = getProjectConfig();
registerHook(Hook.TEST_MIDDLEWARE, (app) => {
    // Sneakily return the test directory instead of the default one
    app.get('/provider/sample-app-directory.json', (req, res) => {
        const testDirectory = JSON.parse(fs.readFileSync(path.join('res', 'test', 'sample-app-directory.json')).toString());

        res.contentType('application/json');
        res.json(testDirectory);
    });

    // Delay response. Useful to test timeouts
    // Use as http://localhost:3923/fakeDelay/?t=5000
    app.get('/fakeDelay', (req, res) => {
        let ms = req.query.t;
        ms = parseInt(ms) || 0;
        setTimeout(() => res.status(200).send({delay: ms}), ms);
    });
});


// App generation
registerHook(Hook.APP_MIDDLEWARE, (app: Application, args: Partial<CLIArguments>) => {
    app.get('/demo/:app/:color?/config.json', (req, res) => generateApp(req, res, args));
    app.get('/demo/platform/:app/:color?/config.json', (req, res) => generateApp(req, res, {...args, platform: true}));
});

function generateApp(req: Request, res: Response, args: Partial<CLIArguments>) {
    const {runtime} = args;
    const appName = req.params.app?.toLowerCase();
    const color = (req.params.color || '').toLowerCase();

    let config: ClassicManifest | PlatformManifest = {
        ...appConfig,
        startup_app: {
            ...appConfig.startup_app,
            name: `${createIdentifier(appName, color)}`,
            uuid: `${createIdentifier('fdc3', appName, color)}`,
            icon: `http://localhost:${PORT}/demo/img/app-icons/${appName}.ico`,
            url: `http://localhost:${PORT}/demo/index.html?app=${appName}&color=${color}`
        },
        runtime: {
            ...appConfig.runtime,
            version: runtime || appConfig.runtime.version
        }
    };

    if (args.platform) {
        config = getPlatformManifest(config);
    }

    res.contentType('application/json');
    res.json(config);
}

/** Create strings delimited by `-` for identities */
function createIdentifier(...args: (string | undefined)[]): string {
    return args.filter(arg => !!arg).join('-');
}

const appConfig = {
    devtools_port: 9090,
    licenseKey: "64605fac-add3-48a0-8710-64b38e96a2dd",
    startup_app: {
        name: "FDC3 POC",
        description: "OpenFin FDC3 Sample Application",
        url: `http://localhost:${PORT}/demo/index.html`,
        icon: "",
        uuid: "fdc3-app",
        autoShow: true
    },
    services: [{
        name: "fdc3",
        manifestUrl: `http://localhost:${PORT}/provider/app.json`
    }],
    runtime: {
        arguments: "",
        version: require('./res/demo/app.json').runtime.version 
    }
};
