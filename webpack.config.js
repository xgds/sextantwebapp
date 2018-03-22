const path = require("path");
const webpack = require("webpack");

// use webpack --watch to watch code to recompile
// use express in server.js (ie use debug flag)

const CopyWebpackPlugin = require("copy-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const CleanWebpackPlugin = require('clean-webpack-plugin');

const nodeModulesPath = path.resolve(__dirname, "node_modules");
const buildPath = path.resolve(__dirname, "public", "build");
const indexPath = path.resolve(__dirname, "app", "index.js");
const cesiumSource = path.resolve(__dirname,"node_modules", "cesium", "Source");
const cesiumWorkers = "../Build/Cesium/Workers";
const staticPath = path.resolve(__dirname, "static");

// Cesium Navigation includes, this does not work the way cesium-navigation is packaged.
// For now we have the files copied into our cesium_util directory.
//const cesiumNavigationPath = path.resolve(__dirname,"node_modules", "cesium-navigation", "dist", "amd");

const ENV_DEFAULTS = {'CONFIG_PATH': undefined};
module.exports = (env = ENV_DEFAULTS) => {
    return {
        // see https://blog.flennik.com/the-fine-art-of-the-webpack-2-config-dc4d19d7f172

        //devtool: "source-map",
        stats: "verbose",
        resolve: {
            alias: {
                // Cesium module name
                'cesium': path.resolve(__dirname, cesiumSource),
                'jquery': require.resolve('jquery')
                //cesiumNavigation: path.resolve(__dirname, cesiumNavigationPath)
            },
            modules: [
                path.resolve("./app"),
                path.resolve("./config"),
                path.resolve("./node_modules")
            ]
        },
        entry: [
            indexPath
        ],
        output: {
            path: buildPath,
            publicPath: "/build/",
            filename: "xgds-3d-view.bundle.js",
            library: "xgds3dview", // the name of the library we refer to
            libraryTarget: "umd"
        },
        amd: {
            // Enable webpack-friendly use of require in Cesium
            toUrlUndefined: true
        },
        plugins: [
            // new webpack.DefinePlugin({
            //     "process.env.CONFIG_PATH": JSON.stringify(process.env.CONFIG_PATH || undefined)
            // }),
            new CleanWebpackPlugin(['public/build']),
            new webpack.EnvironmentPlugin({
                'CONFIG_PATH': env.CONFIG_PATH
            }),
            // new webpack.optimize.UglifyJsPlugin({
            //     sourceMap: true,
            //     compress: {
            //         warnings: true
            //     }
            // }),
            // Copy Cesium Assets, Widgets, and Workers to a static directory
            new CopyWebpackPlugin([{from: path.join(cesiumSource, cesiumWorkers), to: "Workers"}]),
            new CopyWebpackPlugin([{from: path.join(cesiumSource, "Assets"), to: "Assets"}]),
            new CopyWebpackPlugin([{from: path.join(cesiumSource, "Widgets"), to: "Widgets"}]),
            new CopyWebpackPlugin([{from: path.join(staticPath, "icons"), to: "icons"}]),
            new webpack.ProvidePlugin({
              // Make jQuery / $ available in every module:
              $: 'jquery',
              jQuery: 'jquery',
              jquery: 'jquery'
            })
            // new ExtractTextPlugin({filename:"styles.css",
            //                        allChunks: true})
        ],
        module: {
            // noParse: [
            //     /.pako_inflate.js/ //this module seems to cause some warning apparently
            // ],
            rules: [
                {
                    test: /\.jsx?$/,
                    use: [{
                        loader: "babel-loader",
                        options: {
                            plugins: ["transform-runtime"]
                        }
                    }
                    ],
                    exclude: [nodeModulesPath]
                },
                {
                    test: /\.js$/,
                    exclude: [nodeModulesPath],
                    use: [{
                        loader: "babel-loader",
                        options: {
                            plugins: ["transform-runtime"]
                        }
                    }]
                },
                // {
                //     // Remove pragmas
                //     test: /\.js$/,
                //     enforce: 'pre',
                //     include: path.resolve(__dirname, cesiumSource),
                //     use: [{
                //         loader: 'strip-pragma-loader',
                //         options: {
                //             pragmas: {
                //                 debug: false
                //             }
                //         }
                //     }]
                // },
                {
                test: /\.css$/,
                use: [
                    {
                        loader: "style-loader",
                        options: {
                            sourceMap: true,
                            includePaths:['node_modules'],
                        }
                    },
                    {
                        loader: "css-loader",
                        options: {
                            sourceMap: true,
                            includePaths:['node_modules'],
                        }
                    }
                    // {
                    //     loader: 'sass-loader',
                    //     options: {
                    //         sourceMap: true
                    //     }
                    // }
                ]
                },
                // {
                //     test: /\.css$/,
                //     use: ExtractTextPlugin.extract({
                //         fallback: "style-loader",
                //         use: [{
                //                     loader: 'css-loader'
                //             /*
                //                     options: {
                //                         // If you are having trouble with urls not resolving add this setting.
                //                         // See https://github.com/webpack-contrib/css-loader#url
                //                         url: false,
                //                         minimize: true,
                //                         sourceMap: true
                //                         // alias: { "./Viewer": path.join(cesiumSource, "Widgets", "Viewer"),
                //                         //          "./Animation": path.join(cesiumSource, "Widgets", "Animation"),
                //                         //          "./BaseLayerPicker": path.join(cesiumSource, "Widgets", "BaseLayerPicker"),
                //                         //          "./Cesium3DTilesInspector": path.join(cesiumSource, "Widgets", "Cesium3DTilesInspector"),
                //                         //          "./CesiumWidget": path.join(cesiumSource, "Widgets", "CesiumWidget"),
                //                         //          "./FullscreenButton": path.join(cesiumSource, "Widgets", "FullscreenButton"),
                //                         //          "./Geocoder": path.join(cesiumSource, "Widgets", "Geocoder"),
                //                         //          "./HomeButton": path.join(cesiumSource, "Widgets", "HomeButton"),
                //                         //          "./Images": path.join(cesiumSource, "Widgets", "Images"),
                //                         //          "./InfoBox": path.join(cesiumSource, "Widgets", "InfoBox"),
                //                         //          "./NavigationHelpButton": path.join(cesiumSource, "Widgets", "NavigationHelpButton"),
                //                         //          "./PerformanceWatchdog": path.join(cesiumSource, "Widgets", "PerformanceWatchdog"),
                //                         //          "./SceneModePicker": path.join(cesiumSource, "Widgets", "SceneModePicker"),
                //                         //          "./SelectionIndicator": path.join(cesiumSource, "Widgets", "SelectionIndicator"),
                //                         //          "./Timeline": path.join(cesiumSource, "Widgets", "Timeline"),
                //                         //          "./VRButton": path.join(cesiumSource, "Widgets", "VRButton")
                //                         // }
                //                     }
                //                     */
                //                 },
                //                 {
                //                     loader: 'sass-loader',
                //                     options: {
                //                         sourceMap: true
                //                     }
                //                 }
                //               ]
                //     })
                // },
                {test: /\.less$/, use: ["style-loader", "css-loader", "less-loader"]},
                {
                    test: /\.(?:png|jpe?g|woff|woff2|eot|ttf|svg|gif|glsl)$/, use: [{
                        loader: "url-loader",
                        options: {limit: 10000}
                    }]
                }
            ]
        },
        node: {
            __dirname: true,
            fs: "empty" //bug fix for cannot resolve module fs error
        }
    }
};

