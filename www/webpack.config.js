
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");


module.exports = {
    mode: "development",
    entry: `./www/src/index.tsx`,
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js",
    },
    devServer: {
        static: path.resolve(__dirname, "dist"),
        port: 3000, // ✅ Webpack Dev Server sur port 3000
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
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
            template: "./www/index.html",
        }),
    ],
};

