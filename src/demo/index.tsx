import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {BlotterApp} from './apps/BlotterApp';
import {ChartsApp} from './apps/ChartsApp';
import {ContactsApp} from './apps/ContactsApp';
import {DialerApp} from './apps/DialerApp';
import {LauncherApp} from './apps/LauncherApp';
import {NewsApp} from './apps/NewsApp';

/*
 * This file defines the entry point for all of the applications in this project. This "bootstrap" is intended to allow
 * the creation of many small, simple applications whilst avoiding boilerplate.
 *
 * Each application has it's own "app.json" file, but each file shares the same HTML page. This file will check the
 * UUID of the current application in order to determine which React component to create and add to the DOM.
 *
 * For demo purposes, we also need to have multiple applications capable of handling the same intent. This is done by
 * making the demo applications skinnable, to create several similar applications that differ only in colour scheme.
 * Whilst these applications clearly share the same code, they should be assumed to be completely unrelated
 * applications, likely made by different vendors, that are both capable of providing the same funcionality.
 */

function App(): React.ReactElement {
    const urlParams = new URLSearchParams(window.location.search);
    const appToken = urlParams.get('app')?.toLowerCase();
    const color = urlParams.get('color')?.toLowerCase() || 'blue-grey';
    const cssURL = `https://www.w3schools.com/lib/w3-theme-${color}.css`;

    return (
        <React.Fragment>
            <link rel="stylesheet" type="text/css" href={cssURL} />
            <SelectApp appToken={appToken} color={color} />
        </React.Fragment>
    );
}

interface SelectAppProps {
    appToken?: string;
    color?: string;
}

function SelectApp(props: SelectAppProps): React.ReactElement {
    const {appToken, color} = props;
    let selectedApp: JSX.Element;

    switch (appToken) {
        case 'launcher':
            selectedApp = <LauncherApp />;
            break;
        case 'blotter':
            selectedApp = <BlotterApp />;
            break;
        case 'charts':
            selectedApp = <ChartsApp color={color} />;
            break;
        case 'contacts':
            selectedApp = <ContactsApp />;
            break;
        case 'dialer':
            selectedApp = <DialerApp />;
            break;
        case 'news':
            selectedApp = <NewsApp />;
            break;

        default:
            selectedApp = (<div>Unknown application token: &quot;{appToken}&quot;. Add application to index.tsx</div>);
    }
    return selectedApp;
}

ReactDOM.render(<App />, document.getElementById('react-app'));
