const path = require('path');
const webpack = require('webpack');
//const HtmlWebpackPlugin = require('html-webpack-plugin');

// use webpack --watch to watch code to recompile
// use express in server.js (ie use debug flag)

const CopyWebpackPlugin = require('copy-webpack-plugin');

const nodeModulesPath = path.resolve(__dirname, 'node_modules');
const buildPath = path.resolve(__dirname, 'public', 'build');
const mainPath = path.resolve(__dirname, 'app', 'index.js');
const cesiumSource = path.resolve(__dirname,'node_modules', 'cesium', 'Source');
const cesiumWorkers = '../Build/Cesium/Workers';

// Cesium Navigation includes
const cesiumNavigationPath = path.resolve(__dirname,'node_modules', 'cesium-navigation', 'dist', 'amd');

const config = {
    devtool: "source-map",
    stats: {
        errorDetails: true
    },
    resolve: {
        alias: {
			// Cesium module name
			cesium: path.resolve(__dirname, cesiumSource),
            csNavigation: path.resolve(__dirname, cesiumNavigationPath)
		},
        modules: [
            path.resolve('./node_modules')
        ]
    },
    entry: [
        mainPath
    ],
    output: {
        path: buildPath,
        publicPath: '/build/',
        filename: 'sextant.bundle.js',
        libraryTarget: "var",
        library: 'sextant', // the name of the library we refer to
        sourcePrefix: '' // required for cesium
    },
    amd: {
        // Enable webpack-friendly use of require in Cesium
        toUrlUndefined: true
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.CONFIG_PATH': JSON.stringify(process.env.CONFIG_PATH || undefined)
        }),
        // new HtmlWebpackPlugin({
	     //    template: 'src/index.html'
        // }),
        // Copy Cesium Assets, Widgets, and Workers to a static directory
        new CopyWebpackPlugin([ { from: path.join(cesiumSource, cesiumWorkers), to: 'Workers' } ]),
        new CopyWebpackPlugin([ { from: path.join(cesiumSource, 'Assets'), to: 'Assets' } ]),
        new CopyWebpackPlugin([ { from: path.join(cesiumSource, 'Widgets'), to: 'Widgets' } ])
    ],
    module: {
        noParse: [
            /.pako_inflate.js/ //this module seems to cause some warning apparently
        ],
        unknownContextCritical: false,
        loaders: [
            {test: /\.json$/, loader: "json-loader"},
            {
                test: /\.jsx?$/,
                loader: 'babel-loader',
                exclude: [nodeModulesPath],
                query: {
                    plugins: ['transform-runtime'], //Don't know why needed, but recommended
                    presets: ['es2015', 'stage-0', 'react']
                }
            },
            {test: /\.js$/, loader: 'babel', exclude: [nodeModulesPath]},
            {test: /\.css$/, loader: "style!css"},
            {test: /\.(png|gif|jpg|jpeg|glsl)$/, loader: "file-loader"},
            {test: /\.(woff|woff2|eot|ttf|svg)$/, loader: 'url?limit=10000'},
            {test: /node_modules/, loader: 'ify'}
        ]
    },
    node: {
        __dirname: true,
        fs: "empty" //bug fix for cannot resolve module fs error
    }
};

module.exports = config;