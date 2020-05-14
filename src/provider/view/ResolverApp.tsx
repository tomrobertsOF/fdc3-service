import * as React from 'react';
import {ThemeProvider} from '@openfin/desktop-ui';
import * as ReactDOM from 'react-dom';

import {Resolver} from './components/Resolver/Resolver';
import '@openfin/desktop-ui/ui-styles.css';

ReactDOM.render(<ThemeProvider autoConnect updateBody><Resolver /></ThemeProvider>, document.getElementById('react-app'));
