const path = require("path");
const webpack = require("webpack");
//const HtmlWebpackPlugin = require("html-webpack-plugin");

//npm WARN bootstrap-loader@2.2.0 requires a peer of extract-text-webpack-plugin@>=2.1.0 but none was installed.
//npm WARN extract-text-webpack-plugin@1.0.1 requires a peer of webpack@^1.9.11 but none was installed.
//npm WARN sass-loader@4.1.1 requires a peer of webpack@^2 || ^2.2.0-rc.0 || ^2.1.0-beta || ^1.12.6 but none was installed.

// use webpack --watch to watch code to recompile
// use express in server.js (ie use debug flag)

const CopyWebpackPlugin = require("copy-webpack-plugin");

const nodeModulesPath = path.resolve(__dirname, "node_modules");
const buildPath = path.resolve(__dirname, "public", "build");
const indexPath = path.resolve(__dirname, "app", "index.js");
const cesiumSource = path.resolve(__dirname,"node_modules", "cesium", "Source");
const cesiumWorkers = "../Build/Cesium/Workers";

// Cesium Navigation includes, this does not work the way cesium-navigation is packaged.
// For now we have the files copied into our cesium_util directory.
const cesiumNavigationPath = path.resolve(__dirname,"node_modules", "cesium-navigation", "Source");


const ENV_DEFAULTS = {'CONFIG_PATH': undefined};
module.exports = (env = ENV_DEFAULTS) => {
    return {
        // see https://blog.flennik.com/the-fine-art-of-the-webpack-2-config-dc4d19d7f172

        //devtool: "source-map",
        stats: "verbose",
        resolve: {
            alias: {
                // Cesium module name
                cesium: path.resolve(__dirname, cesiumSource),
                cesiumNavigation: path.resolve(__dirname, cesiumNavigationPath)
            }
            // modules: [
            //     path.resolve("./node_modules")
            // ]
        },
        entry: [
            indexPath
        ],
        output: {
            path: buildPath,
            publicPath: "/build/",
            filename: "sextant.bundle.js",
            //libraryTarget: "var",
            library: "sextant" // the name of the library we refer to
            //sourcePrefix: "" // required for cesium
        },
        amd: {
            // Enable webpack-friendly use of require in Cesium
            toUrlUndefined: true
        },
        plugins: [
            // new webpack.DefinePlugin({
            //     "process.env.CONFIG_PATH": JSON.stringify(process.env.CONFIG_PATH || undefined)
            // }),
            new webpack.DefinePlugin({'DEFAULT_CONFIG_PATH': JSON.stringify('./standalone_config.js')
//                                      'CONFIG_URL': env.CONFIG_URL
                                      }),
            new webpack.EnvironmentPlugin({
                'CONFIG_PATH': env.CONFIG_PATH
            }),
            // new webpack.optimize.UglifyJsPlugin({
            //     sourceMap: true,
            //     compress: {
            //         warnings: true
            //     }
            // }),
            // new webpack.LoaderOptionsPlugin({
            //     minimize: true
            // }),
            // new HtmlWebpackPlugin({
            //    template: "src/index.html"
            // }),
            // Copy Cesium Assets, Widgets, and Workers to a static directory
            new CopyWebpackPlugin([{from: path.join(cesiumSource, cesiumWorkers), to: "Workers"}]),
            new CopyWebpackPlugin([{from: path.join(cesiumSource, "Assets"), to: "Assets"}]),
            new CopyWebpackPlugin([{from: path.join(cesiumSource, "Widgets"), to: "Widgets"}])
        ],
        module: {
            // noParse: [
            //     /.pako_inflate.js/ //this module seems to cause some warning apparently
            // ],
            //unknownContextCritical: false,
            rules: [
                {
                    test: /\.jsx?$/,
                    use: [{
                        loader: "babel-loader",
                        options: {
                            plugins: ["transform-runtime"]
                            //presets: ["@babel/preset-env", { "modules": false }]
                            //presets: ["env", "react", "stage-0"]
                        }
                    }
                    ],
                    exclude: [nodeModulesPath]
                    // query: {
                    //     plugins: ["transform-runtime"], //Don"t know why needed, but recommended
                    //     presets: ["es2015", "stage-0", "react"]
                    // },

                },
                {
                    test: /\.js$/,
                    exclude: [nodeModulesPath],
                    use: [{
                        loader: "babel-loader",
                        options: {
                            plugins: ["transform-runtime"]
                            //presets: ["@babel/preset-env", { "modules": false }]
                            //presets: ["env", "react", "stage-0"]
                        }
                        //options: {presets: ["env", "react", "stage-0"] //, { "modules": false }
                        //}
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
                {test: /\.css$/, use: ["style-loader", "css-loader"]},
                {test: /\.less$/, use: ["style-loader", "css-loader", "less-loader"]},
                {test: /\.(png|gif|jpg|jpeg|glsl)$/, use: ["file-loader"]},
                {
                    test: /\.(woff|woff2|eot|ttf|svg)$/, use: [{
                        loader: "url-loader",
                        options: {limit: 8192}
                    }]
                },
                {test: /node_modules/, use: ["ify-loader"]}
            ]
        },
        node: {
            __dirname: true,
            fs: "empty" //bug fix for cannot resolve module fs error
        }
    }
};

