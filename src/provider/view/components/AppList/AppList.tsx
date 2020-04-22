import * as React from 'react';
import {ListGroup} from '@openfin/desktop-ui';

import {Application} from '../../../../client/directory';
import {AppCard} from '../AppCard/AppCard';

import * as Styles from './AppList.module.scss';

interface AppListProps {
    applications: Application[];
    onAppOpen: (app: Application) => void;
}

export function AppList(props: AppListProps): React.ReactElement {
    return (
        <div className={Styles['app-list']}>
            <p>Available Applications</p>
            <ListGroup className={Styles['app-list-group']} horizontal={false} itemActiveBackground={false}>
                {props.applications.map((app: Application) => (
                    <AppCard key={app.appId || app.name} app={app} openHandler={props.onAppOpen} />
                ))}
            </ListGroup>
        </div>
    );
}
