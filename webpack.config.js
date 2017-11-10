const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// use webpack --watch to watch code to recompile
// use express in server.js (ie use debug flag)

const buildPath = path.resolve(__dirname, 'public', 'build');
const mainPath = path.resolve(__dirname, 'app', 'index.js');
//const mainPath = path.resolve(__dirname, 'app', 'cesium_util', 'gps_test.js');
const cesiumSource = path.resolve(__dirname,'node_modules','cesium','Source');
const cesiumWorkers = path.resolve(__dirname,'node_modules','cesium','Build','Cesium','Workers');

const config = {
    context: __dirname, //from cesium tutorial
    devtool: "eval",
    stats: {
    	errorDetails: true
    },
    resolve: {
        alias: {
            // Cesium module name
            cesium: path.resolve(__dirname, cesiumSource)
        }
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
        // Enable webpack-friendly use of require in cesium
        toUrlUndefined: true
    },
    node: {
        // Resolve node module use of fs
        fs: "empty"
    },
    plugins: [
        new webpack.DefinePlugin({
            CESIUM_BASE_URL: JSON.stringify(''),
            'process.env.CONFIG_PATH': JSON.stringify(process.env.CONFIG_PATH || undefined)
        }),
        new CopyWebpackPlugin([{from: cesiumWorkers, to: 'Workers'}]),
        new CopyWebpackPlugin([{from: path.join(cesiumSource, 'Assets'), to: 'Assets'}]),
        new CopyWebpackPlugin([{from: path.join(cesiumSource, 'Widgets'), to: 'Widgets'}]),
        /*new webpack.optimize.CommonsChunkPlugin({
            name: 'cesium',
            minChunks: function (module) {
                return module.context && module.context.indexOf('cesium') !== -1;
            }
        })*/
//        new webpack.ProvidePlugin({
//           $: "jquery",
//           jQuery: "jquery"
//       })
    ],
    module: {
        unknownContextCritical : false, // required for cesium
        rules: [
            {
                test: /\.js$/, 
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        //plugins: ['transform-runtime']
                        presets: ['babel-preset-env'],
                        plugins: ['transform-runtime']
                    }
                  }
            },{
                test: /\.css$/, 
                use: ["style-loader", "css-loader"] 
            },{
                test: /\.(png|gif|jpg|jpeg|svg|xml|json)$/,
                use: ['url-loader']
            }
        ]
    }
};

module.exports = config;