const http = require('http');
const https = require('https');

exports.httpGet = httpGet = async function(url) {
	return new Promise(function(resolve, reject) {
		(url.slice(0,5) == "https" ? https : http).get(url, (res) => {
			if (res.statusCode !== 200) {
				//.error('Request Failed. Status Code: ' +  res.statusCode);
				res.resume();
				return reject(res.statusCode);
			}
			//res.setEncoding('utf8');
			let rawData = null;
			res.on('data', function(chunk) {
				//log.debug('url ' + url + ' received ' + chunk.length);
				rawData = rawData ? Buffer.concat([rawData, chunk]) : chunk;
			});
			res.on('end', () => {
				resolve(rawData);
			});
		}).on('error', (e) => {
			reject("http request error: " + e.message, null);
		});
	});
}

exports.httpGetJson = async function(url) {
	const data = await httpGet(url);
	try {
		return JSON.parse('' + data);
	} catch (e) {
		throw new Error('error during http response parsing: ' + e);
	}
}