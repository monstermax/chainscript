// webpack.config.js

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");


module.exports = {
    mode: "development",
    entry: `./src/index.tsx`,
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js",
    },
    devServer: {
        static: path.resolve(__dirname, "dist"),
        port: 3366,
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
        alias: {
          "@backend": path.resolve(__dirname, "../backend"),
          "@frontend": path.resolve(__dirname, "src"),
          "@mobile": path.resolve(__dirname, "../mobile"),
          "@desktop": path.resolve(__dirname, "../desktop"),
        },
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env", "@babel/preset-react"],
                    },
                },
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./index.html",
        }),
    ],
};

