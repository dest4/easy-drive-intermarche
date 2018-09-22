import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(<App />, document.getElementById('root'));
//registerServiceWorker();

if ('serviceWorker' in navigator) {
	navigator.serviceWorker.ready.then(registration => {
		registration.unregister();
	});
}
