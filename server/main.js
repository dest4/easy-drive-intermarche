'use strict';
const fs = require('fs-extra');
const axios = require('axios');
//const https = require('https');
const util = require('util');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const compression = require('compression');

const WEBMIN_DEV = process.env.WEBMIN_DEV;

const config = JSON.parse(fs.readFileSync('config.json'));
let cookies = {};
try {
	cookies = JSON.parse(fs.readFileSync('cookies.json'));
} catch(e) {
	console.log('no cookie file found. create it!');
}
//console.log(JSON.stringify(config, null, '\t'));

const sleep = function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const saveCookies = async function(str) {
	//console.log('save cookies');
	for (let i=0; i<str.length; i++) {
		//console.log('read cookie ' + str[i]);
		const separator = str[i].indexOf('='); //split('=', 2);
		const key = str[i].slice(0, separator);
		const value = str[i].slice(separator+1);
		cookies[key] = value;
		//console.log('set cookie ' + key + '=' + value);
	}
	await fs.writeFile('cookies.json', JSON.stringify(cookies, null, '\t'));
}

const readCookies = function() {
	//console.log('read cookies');
	let result = '';
	for (var property in cookies) {
		if (cookies.hasOwnProperty(property)) {
			result += property + '=' + cookies[property] + '; ';
			//console.log('read cookie ' + property + '=' + cookies[property]);
		}
	}
	return result;
}

const getInitialCookies = async function() {
	console.log('load homepage to get cookie');
	let response = {"response": "empty response"};
	try {
		response = await axios.request({
			url: 'https://drive.intermarche.com/381-villeurbanne',
			method: 'get',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				'Accept-Encoding': 'gzip, deflate, sdch, br',
				'Accept-Language': config.acceptlang,
				'Connection': 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
				'User-Agent': config.useragent,
			},
		});
		await saveCookies(response.headers['set-cookie']);
		return true;
	} catch(e) {
		console.log('getCookie. err=' + e); // + '\n' + util.inspect(response));
		return false;
	}
}

const connect = async function() {
	let cookies = readCookies();
	if (!cookies) {
		console.log('need cookies to connect. abort');
		return null;
	}
	console.log('connect...');
	try {
		const response = await axios.request({
			url: 'https://drive.intermarche.com/Connexion',
			method: 'post',
			headers: {
				'Accept': 'application/json, text/javascript, */*; q=0.01',
				'Accept-Encoding': 'gzip, deflate, br',
				'Accept-Language': config.acceptlang,
				'Connection': 'keep-alive',
				//'Content-Length': 129,
				'Content-Type': 'application/json; charset=utf-8',
				'Cookie': cookies,
				'DNT': 1,
				'Referer' : 'https://drive.intermarche.com/',
				'User-Agent': config.useragent,
				'X-Requested-With': 'XMLHttpRequest'
			},
			data: {
				txtEmail: config.email,
				txtMotDePasse: config.pass,
				largeur: '1920',
				hauteur: '1080',
				resteConnecte: 'false',
			}
		})

		//console.log(util.inspect(response));
		console.log('connected!');
		await saveCookies(response.headers['set-cookie']);
		const profile = {
			firstName: response.data.ClientEco.Prenom,
			lastName: response.data.ClientEco.Nom,
			id: response.data.ClientEco.IdClient,
		}
		return profile;
	} catch(e) {
		console.log('connect err=' + e);
		return null;
	}
}

const getFavorites = async function() {
	let cookies = readCookies();
	if (!cookies) {
		console.log('need cookies to get favorites. abort');
		return null;
	}
	console.log('load favorites...');
	try {
		const response = await axios.request({
			url: 'https://drive.intermarche.com/ChargerFavoris',
			method: 'post',
			headers: {
				'Accept': 'application/json, text/javascript, */*; q=0.01',
				'Accept-Encoding': 'gzip, deflate, br',
				'Accept-Language': config.acceptlang,
				'Connection': 'keep-alive',
				//'Content-Length': 20,
				'Content-Type': 'application/json; charset=utf-8',
				'Cookie' : cookies,
				'DNT': 1,
				'Referer': 'https://drive.intermarche.com/381-villeurbanne',
				'User-Agent' : config.useragent,
				'X-Requested-With': 'XMLHttpRequest',
			},
			data: {
				'idOnglet': '1'
			}
		});
		if (response.headers['content-type'].indexOf('text/html') >= 0) {
			throw new Error('favorites. expected a JSON response and got HTML instead');
		}
		await saveCookies(response.headers['set-cookie']);

		console.log('got ' + response.data.Produits.length + ' favorites');
		return response.data;
	} catch(e) {
		console.log('favorites err=' + e);
		return null;
	}
}

const getCartContents = async function() {
	let cookies = readCookies();
	if (!cookies) {
		console.log('need cookies to get cart contents. abort');
		return null;
	}
	console.log('load cart contents...');

	try {
		const response = await axios.request({
			url: 'https://drive.intermarche.com/AfficherPanier',
			method: 'post',
			headers: {
				'Accept': 'application/json, text/javascript, */*; q=0.01',
				'Accept-Language': config.acceptlang,
				'Connection': 'keep-alive',
				'Content-Length': 2,
				'Content-Type': 'application/json; charset=utf-8',
				'Cookie' : cookies,
				'DNT': 1,
				'Referer': 'https://drive.intermarche.com/381-villeurbanne',
				'User-Agent' : config.useragent,
				'X-Requested-With': 'XMLHttpRequest',
			},
			data: '{}'
		});

		await saveCookies(response.headers['set-cookie']);
		//response.data = JSON.parse(response.data);
		console.log('got ' + response.data.Panier.length + ' items in the cart for a total amount of ' + response.data.Total);
		return response.data;
	} catch(e) {
		console.log('cart err=' + e);
		return null;
	}
}

const addRemoveItem = async function(itemId, isAdd) {
	let cookies = readCookies();
	if (!cookies) {
		console.log('need cookies to add or remove item from cart. abort');
		return null;
	}
	console.log((isAdd ? 'add item to' : 'remove item from') + ' cart');
	const VERBOSE = false;
	try {
		const response = await axios.request({
			url: 'https://drive.intermarche.com/' + (isAdd ? 'Plus' : 'Moins'),
			method: 'post',
			headers: {
				'Accept': 'application/json, text/javascript, */*; q=0.01',
				'Accept-Language': config.acceptlang,
				'Connection': 'keep-alive',
				'Content-Type': 'application/json; charset=utf-8',
				'Cookie' : cookies,
				'DNT': 1,
				'Referer': 'https://drive.intermarche.com/381-villeurbanne',
				'User-Agent' : config.useragent,
				'X-Requested-With': 'XMLHttpRequest',
			},
			data: {
				'idProduit' : itemId,
				'trackingCode' : '',
				//'idSource': 44,
				//'idUniversProduitComplementaire': 'null'
			}
		});

		await saveCookies(response.headers['set-cookie']);
		if (VERBOSE) {
			console.log(response.headers);
			console.log(response.data);
		}
		if (response.data.Article.EstEnErreur) {
			throw new Error('addRemoveItem: API returned an error');
		}
		//response.data = JSON.parse(response.data);
		//console.log('got ' + response.data.Panier.length + ' items in the cart for a total amount of ' + response.data.Total);
		return response.data;
	} catch(e) {
		console.log('cart err=' + e);
		return null;
	}
}

async function main() {
	if (!Object.keys(cookies).length) {
		if (!await getInitialCookies()) return;
		await sleep(100);
	}

	const profile = await connect();
	if (!profile) return;
	console.log('connected as ' + profile.firstName + ' ' + profile.lastName);

	await sleep(100);

	const favorites = await getFavorites();
	console.log(favorites.Produits[0].idProduit);

	//await sleep(100);

	await getCartContents();

	const id = favorites.Produits[0].IdProduit;
	console.log('will add item with id=' + id);
	await addRemoveItem(id, true);

	await getCartContents();

	await addRemoveItem(id, false);

	await getCartContents();
}

//main();


const app = express();

app.use(helmet())
	.use(compression())
	.use(cors());

http.createServer(app).listen(config.serverport, 'localhost');

if (WEBMIN_DEV) {
	console.log("WEBMIN DEV");
	// proxy everything but /api requests
	// /api/* is managed by this program
	// everything else is routed to localhost:3000, the react dev server.
	const proxy = require('http-proxy-middleware');
	const apiProxy = proxy('!/api/**', { target: 'http://localhost:3000', loglevel: 'warn' });
	//app.use('/login.html', apiProxy);
	app.use('/', apiProxy);

} else {
	console.log('Webmin server started in production mode.');
	//app.use('/login.html', express.static('webmin-src/build/login.html'));
	app.use('/', express.static('webmin-src/build'));
}

app.get('/api/account', async function(req, res) {
	try {
		if (!Object.keys(cookies).length) {
			if (!await getInitialCookies()) throw new Error('could not get initial cookies');
			await sleep(100);
		}

		const profile = await connect();
		if (!profile) throw new Error('could not connect');

		console.log('connected as ' + profile.firstName + ' ' + profile.lastName);
		res.json(profile);

	} catch(e) {
		console.log('/account err=' + e);
		res.status(500).end();
	}
});

app.get('/api/favorites', async function(req, res) {
	try {
		const favorites = await getFavorites();
		res.json(favorites);
	} catch(e) {
		console.log('/favorites err=' + e);
		res.status(500).end();
	}
});

app.get('/api/cart', async function(req, res) {
	try {
		const cartContents = await getCartContents();
		res.json(cartContents);
	} catch(e) {
		console.log('/cart err=' + e);
		res.status(500).end();
	}
});

app.post('/api/item/:action/:id', async function(req, res) {
	try {
		const id = req.params.id;
		const action = req.params.action;
		if (action !== 'add' && action !== 'remove') {
			throw new Error('action must either be add or remove. abort');
		}
		await addRemoveItem(id, action === 'add');
		res.status(200).end();

	} catch(e) {
		console.log('/item err=' + e);
		res.status(500).end();
	}
});

console.log('server listening on port ' + config.serverport);