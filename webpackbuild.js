const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
import {config} from './config/config_loader';

function build(app, hmr) {
    (function () {
        // Step 1: Create & configure a webpack compiler
        const webpack = require('webpack');
        const webpackConfig = require('./webpack.config');
        const compiler = webpack(webpackConfig);

        // Step 2: Attach the dev middleware to the compiler & the server
        app.use(webpackDevMiddleware(compiler, {
            noInfo: true, publicPath: webpackConfig.output.publicPath
        }));

        if (hmr) {
            // Step 3: Attach the hot middleware to the compiler & the server
            app.use(webpackHotMiddleware(compiler, {
                log: console.log, path: '/' + config.server.nginx_prefix + '/__webpack_hmr', heartbeat: 10 * 1000
            }));
        }
    })();
}
export {build}