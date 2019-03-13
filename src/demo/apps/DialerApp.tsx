import * as React from 'react';
import * as fdc3 from '../../client/main';

import '../../../res/demo/css/w3.css';

import { Number } from '../components/dialer/Number';
import { Dialer } from '../components/dialer/Dialer';
import { CallTimer } from '../components/dialer/CallTimer';
import { CallButton } from '../components/dialer/CallButton';
import { ContactContext, Context } from '../../client/context';
import { Dialog } from '../components/common/Dialog';

interface IAppProps {
    phoneNumber?: string;
}

interface IAppState {
    inCall: boolean;
    phoneNumber: string;
    pendingCall: ContactContext|null;
}

export class DialerApp extends React.Component<IAppProps, IAppState> {
    constructor(props: IAppProps) {
        super(props);

        //Initialise App UI
        document.title = "Dialer";
        this.state = {
            inCall: false,
            phoneNumber: props.phoneNumber || "",
            pendingCall: null
        };
        this.onNumberEntry = this.onNumberEntry.bind(this);
        this.onDialerEntry = this.onDialerEntry.bind(this);
        this.toggleCall = this.toggleCall.bind(this);
        this.handleDialog = this.handleDialog.bind(this);

        //Add FDC3 listeners
        const dialListener = fdc3.addIntentListener(fdc3.Intents.DIAL_CALL, (context: Context): void => {
            if (!this.state.inCall) {
                this.handleIntent(context as ContactContext, false);
            } else if (context.id && context.id.phone) {
                this.setState({pendingCall: context as ContactContext});
            }
        });
        const callListener = fdc3.addIntentListener(fdc3.Intents.START_CALL, (context: Context): void => {
            if (!this.state.inCall) {
                this.handleIntent(context as ContactContext, true);
            } else if (context.id && context.id.phone) {
                this.setState({pendingCall: context as ContactContext});
            }
        });
        const contextListener = fdc3.addContextListener((context: Context): void => {
            if (context.type === "contact") {
                if (!this.state.inCall) {
                    this.handleIntent(context as ContactContext, false);
                }
            }
        });
    }

    public render(): JSX.Element {
        const pendingCall: ContactContext = this.state.pendingCall!;

        return (
            <div>
                <Number inCall={this.state.inCall} number={this.state.phoneNumber} handleChange={this.onNumberEntry} />
                { this.state.inCall
                    ? <CallTimer />
                    : <Dialer handleKeyPress={this.onDialerEntry} />
                }
                <CallButton canCall={this.state.phoneNumber.length > 0} inCall={this.state.inCall} handleClick={this.toggleCall} />
                <Dialog show={!!pendingCall} title="Replace call?" body={"Hang up and call " + (pendingCall && pendingCall.id.phone) + "?"} options={["No", "Yes"]} handleOption={this.handleDialog} />
            </div>
        );
    }

    private onNumberEntry(phoneNumber: string): void {
        this.setState({phoneNumber});
    }

    private onDialerEntry(key: string): void {
        this.setState({phoneNumber: this.state.phoneNumber + key});
    }

    private toggleCall(): void {
        this.setState({inCall: !this.state.inCall});
    }

    private handleDialog(option: string): void {
        if (option === "Yes") {
            this.setState({
                phoneNumber: this.state.pendingCall!.id.phone!,
                pendingCall: null
            });
        } else {
            this.setState({pendingCall: null});
        }
    }

    private handleIntent(context: ContactContext, startCall: boolean): void {
        const phoneNumber: string = context.id.phone!;

        if (phoneNumber) {
            this.setState({
                phoneNumber: context.id.phone!,
                inCall: startCall
            });
        } else {
            throw new Error("Contact doesn't have a phone number");
        }
    }
}