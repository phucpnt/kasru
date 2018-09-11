const path = require('path');

module.exports.PORT = process.env.NODE_PORT || 3003;
module.exports.DIR_SPEC = process.env.DIR_SPEC ? path.resolve(process.env.DIR_SPEC) : process.cwd();
module.exports.GH_CLIENT_ID = process.env.GH_CLIENT_ID || 'client_id';
module.exports.GH_CLIENT_SECRET = process.env.GH_CLIENT_SECRET || 'client_secret';
module.exports.GH_CALLBACK_HOST = process.env.GH_CALLBACK_HOST || 'http://localhost:3003';
module.exports.BB_CLIENT_ID = process.env.BB_CLIENT_ID || '7pCm2wjNNrj7KvSCeJ';
module.exports.BB_CLIENT_SECRET = process.env.BB_CLIENT_SECRET || 'hU6XZwmhb6qZJXHuMK3Qj8nvD3YPDfzQ';
module.exports.BB_CALLBACK_HOST = process.env.BB_CALLBACK_HOST || 'http://localhost:3003';
