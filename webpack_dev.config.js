const HTMLPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require("path");

module.exports = {
    entry: "./src/index.tsx",
    mode: "development",
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                use: 'babel-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                include: path.resolve(__dirname, 'src'),
                use: ["style-loader", "css-loader", "postcss-loader"],
                exclude: /node_modules/,
            },
        ],
    },
    devtool: 'inline-source-map',
    resolve: {
        extensions: [".tsx", ".ts", ".js", ".jsx"],
    },
    output: {
        path: path.resolve(__dirname, "dev_dist"),
        filename: "bundle.js",
    },
    plugins: [
        /* Necessary to use HTMLPlugin to inject the bundle into the index.html */
        new HTMLPlugin({
            title: "development",
            template: "./public/index.html",
        }),
        new CopyWebpackPlugin({
            patterns: [
                { 
                    from: "public", 
                    to: "", 
                    globOptions: {
                        ignore: ["**/index.html"], // This line excludes index.html
                    },
                },
            ],
        }),
    ],
};
