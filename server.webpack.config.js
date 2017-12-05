const path = require('path');
const webpack = require('webpack');
const fs = require('fs');

// use webpack --watch to watch code to recompile
// use express in server.js (ie use debug flag)
const nodeModules = {};
fs.readdirSync('node_modules')
    .filter(function(x) {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function(mod) {
        nodeModules[mod] = 'commonjs ' + mod;
    });

const nodeModulesPath = path.resolve(__dirname, 'node_modules');
const buildPath = path.resolve(__dirname, 'dist');
const mainPath = path.resolve(__dirname, 'serversrc', 'server.js');

const config = {
    externals: nodeModules,
    entry: [
        mainPath
    ],
    output: {
        path: buildPath,
        filename: 'server_transpiled.js',
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.CONFIG_PATH': JSON.stringify(process.env.CONFIG_PATH || undefined)
        })
    ],
    module: {
        loaders: [
            {test: /\.json$/, loader: "json-loader"},
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: [nodeModulesPath],
                query: {
                    plugins: ['transform-runtime'], //Don't know why needed, but recommended
                    presets: ['es2015', 'stage-2']
                }
            },
        ]
    },
    target: 'node'
};

module.exports = config;