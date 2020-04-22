import * as React from 'react';
import {Icon} from '@openfin/desktop-ui';

import {Application} from '../../../../client/directory';

import * as Styles from './AppCard.module.scss';

interface AppCardProps {
    app: Application;
    openHandler: (app: Application) => void;
}

export function AppCard(props: AppCardProps): React.ReactElement {
    const {app, openHandler} = props;

    const clickHandler = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        openHandler(app);
    };

    return (
        <div className={Styles['app-card']} id={`app-card-${app.appId}`} data-appname={app.name} onClick={clickHandler}>
            {(app.icons && app.icons.length > 0) && <Icon className={Styles['app-icon']} src={app.icons[0].icon} size={50}/>}
            <h1>{app.title || app.name}</h1>
        </div>
    );
}
