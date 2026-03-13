const http = require('http');

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/hierarchy/demo',
    method: 'POST'
}, res => {
    let rawData = '';
    res.on('data', chunk => rawData += chunk);
    res.on('end', () => console.log('Demo restore complete:', rawData));
});
req.on('error', console.error);
req.end();
