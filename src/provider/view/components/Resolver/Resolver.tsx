import * as React from 'react';
import {Header, ListGroup, Cell, AppLogo, ListGroupItem} from '@openfin/desktop-ui';

import {Application} from '../../../../client/directory';
import {ResolverArgs, ResolverResult} from '../../../controller/ResolverHandler';
import OpenWithIcon from '../../../../../res/provider/ui/resolver/assets/OpenWithIcon.svg';

import * as Styles from './Resolver.module.scss';

let sendSuccess: (result: {app: Application}) => void;

export const Resolver: React.FC = () => {
    const [applications, setApplications] = React.useState<Application[]>([]);
    const handleAppOpen = (app: Application) => sendSuccess({app});
    const handleClose = (event: React.MouseEvent) => {
        event.stopPropagation();
        sendSuccess(null!);
    };

    React.useEffect(() => {
        fin.InterApplicationBus.Channel.create('resolver').then((channel) => {
            Object.assign(window, {channel});

            channel.register('resolve', async (args: ResolverArgs) => {
                setApplications(args.applications);
                return new Promise<ResolverResult>((resolve) => {
                    sendSuccess = resolve;
                });
            });
        });
    }, []);

    return (
        <div className={Styles['resolver']}>
            <Header text="Open with:" onClose={handleClose} image={OpenWithIcon} />
            <ListGroup
                ref={(node) => node?.focus()}
                style={{outline: 'none'}}
                border={false}
                animationTimeout={0}
            >
                {
                    applications.map((app, i) => {
                        const icon = <AppLogo src={app.icons?.[0].icon ?? ''} />;

                        return (
                            <ListGroupItem item={app} key={app.appId + i}>
                                <Cell
                                    onClick={() => handleAppOpen(app)}
                                    text={app.name}
                                    image={icon}
                                    id={`app-card-${app.appId}`}
                                    data-appname={app.name}
                                />
                            </ListGroupItem>
                        );
                    })
                }
            </ListGroup>
        </div>
    );
};
