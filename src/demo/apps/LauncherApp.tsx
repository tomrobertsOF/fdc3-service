import * as React from 'react';
import {ApplicationOption} from 'openfin/_v2/api/application/applicationOption';

import /* type */ {Application} from '../../client/directory';
import {AppCard} from '../components/launcher/AppCard';
import {fdc3} from '../stub';

import '../../../res/demo/css/w3.css';

interface ManifestAppLaunchData {
    type: 'manifest';
    data: Application;
}

interface ProgrammaticAppLaunchData {
    type: 'programmatic';
    data: ApplicationOption & {description: string};
}

interface AppData {
    id: string;
    icon: string;
    title: string;
    color?: string;
    description: string;
    extraOptions?: {resizable: boolean; defaultWidth: number; defaultHeight: number; saveWindowState: boolean};
}

export type AppLaunchData = ManifestAppLaunchData | ProgrammaticAppLaunchData;

export const LauncherApp: React.FC = () => {
    const [applications, setApplications] = React.useState<ManifestAppLaunchData[]>([]);
    // @ts-ignore fin.me types do not exist
    const isPlatformWindow = fin.me ? fin.me.isView : false;

    React.useEffect(() => {
        document.title = 'Launcher';
    }, []);

    React.useEffect(() => {
        fdc3.findIntent(null!)
            .then((appIntent) => setApplications(appIntent.apps.map((app) => {
                return {
                    type: 'manifest',
                    data: app
                };
            })))
            .catch(console.error);
    }, []);

    const openApp = async (app: AppLaunchData) => {
        const id: string = (app.type === 'manifest') ? app.data.name : app.data.uuid;
        const title: string = ((app.type === 'manifest') ? app.data.title : app.data.name) || id;
        console.log(`Opening app ${title}`);
        try {
            await fdc3.open(id);
            console.log(`Opened app ${title}`);
        } catch (e) {
            // Stringifying an `Error` omits the message!
            const error: Error = {
                message: e.message,
                ...e
            };
            console.error(e, error);
        }
    };

    const launchApp = async (app: AppLaunchData) => {
        const id: string = (app.type === 'manifest') ? app.data.appId : app.data.uuid;
        const title: string = ((app.type === 'manifest') ? app.data.title : app.data.name) || id;
        console.log(`Launching app ${title}`);
        try {
            try {
                if (app.type === 'manifest') {
                    await fin.Application.startFromManifest(app.data.manifest);
                } else if (isPlatformWindow) {
                    await createPlatformWindow(app);
                } else {
                    await fin.Application.start(app.data);
                }
                console.log(`Launched app ${title}`);
            } catch (e) {
                if (/Application with specified UUID is already running/.test(e.message)) {
                    const window = fin.Window.wrapSync({uuid: id, name: id});
                    await window.setAsForeground();
                    console.log(`App ${title} was already running - focused`);
                } else {
                    throw e;
                }
            }
        } catch (e) {
            // Stringifying an `Error` omits the message!
            const error = {
                message: e.message,
                ...e
            };
            console.error(e, error);
        }
    };

    return (
        <div>
            <h1>Launcher</h1>
            {applications.map((app, index) => <AppCard key={`${app.data.appId}${index}`} app={app} handleClick={openApp} isDirectoryApp={true} />)}
            <hr />
            <h2>Non-directory apps</h2>
            {NON_DIRECTORY_APPS.map((app, index) => <AppCard key={`${app.data.appId}${index}`} app={app} handleClick={launchApp} isDirectoryApp={false} />)}
            <hr />
            <h2>Programmatic apps</h2>
            {PROGRAMMATIC_APPS.map((app, index) => <AppCard key={`${app.data.uuid}${index}`} app={app} handleClick={launchApp} isDirectoryApp={false} />)}
        </div>
    );
};

const APP_DATA: AppData[] = [
    {id: 'blotter', icon: 'blotter', title: 'Blotter', description: 'blotter app'},
    {id: 'contacts', icon: 'contacts', title: 'Contacts', description: 'contacts app'},
    {
        id: 'dialer', icon: 'dialer', title: 'Dialer', description: 'dialer app',
        extraOptions: {resizable: false, defaultWidth: 240, defaultHeight: 310, saveWindowState: false}
    },
    {id: 'charts', icon: 'charts', title: 'Charts:', color: 'Pink', description: 'charting app'},
    {id: 'charts', icon: 'charts', title: 'Charts:', color: 'Grey', description: 'charting app'},
    {id: 'charts', icon: 'charts', title: 'Charts:', color: 'Teal', description: 'charting app'},
    {id: 'news', icon: 'news', title: 'News Feed', description: 'news app'}
];

const NON_DIRECTORY_APPS: ManifestAppLaunchData[] = APP_DATA.map(({id, icon, title, description, color}) => ({
    type: 'manifest',
    color,
    data: {
        appId: createIdentifier(title, color, 'nodir'),
        name: createIdentifier(title, color, 'nodir'),
        manifestType: 'openfin',
        manifest: `http://localhost:3923/demo/${id}/${color}/config.json`,
        icons: [
            {icon: `http://localhost:3923/demo/img/app-icons/${icon}.svg`}
        ],
        title: `${title} ${color ?? ''}` || id,
        description: `Sample Non-Directory ${description}`
    }
}));

const PROGRAMMATIC_APPS: ProgrammaticAppLaunchData[] = APP_DATA.map(({id, icon, title, description, extraOptions, color}) => {
    color = (color || '').replace('Pink', 'Orange').replace('Grey', 'Cyan').replace('Teal', 'Purple');
    return {
        type: 'programmatic',
        color,
        data: {
            name: `${title} ${color ?? ''}`,
            description: `Sample Programmatic ${description}`,
            url: `http://localhost:3923/demo/index.html?app=${id}&color=${color}`,
            icon: `http://localhost:3923/demo/img/app-icons/${icon}.svg`,
            uuid: createIdentifier(id, color, 'programmatic'),
            autoShow: true,
            resizable: extraOptions && extraOptions.resizable,
            defaultWidth: extraOptions && extraOptions.defaultWidth,
            defaultHeight: extraOptions && extraOptions.defaultHeight,
            saveWindowState: extraOptions && extraOptions.saveWindowState
        }
    };
});

function createIdentifier(...args: (string | undefined)[]): string {
    return args.filter((arg) => !!arg).join('-');
}

async function createPlatformWindow(app: ProgrammaticAppLaunchData): Promise<void> {
    const platform = fin.Platform.getCurrentSync();

    await platform.createWindow({
        contextMenu: true,
        // @ts-ignore Type definition doesn't exist
        layout: {
            content: [{
                type: 'stack',
                content: [{
                    type: 'component',
                    componentName: 'view',
                    componentState: {
                        name: app.data.name,
                        url: app.data.url
                    }
                }]
            }]
        }
    });
}
