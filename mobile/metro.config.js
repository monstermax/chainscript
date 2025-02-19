// metro.config.js

const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");


const wwwSrc = path.resolve(__dirname, '../www/src');


function resolveRequest(context, realModuleName, platform) {

    // hack pour contourner "extraNodeModules" qui ne fonctionne pas

    // Si le module commence par "@frontend/"
    if (realModuleName.startsWith('@frontend/')) {
        const newPath = path.join(wwwSrc, realModuleName.replace('@frontend/', ''));
        return context.resolveRequest(context, newPath, platform);
    }

    return context.resolveRequest(context, realModuleName, platform);
}


module.exports = (async () => {
    const config = await getDefaultConfig(__dirname);

    return {
        ...config,
        //projectRoot: path.resolve(__dirname, './'),
        watchFolders: [
            path.resolve(__dirname, './'),
            path.resolve(__dirname, '../node_modules'),
            path.resolve(__dirname, '../backend/src'),
            path.resolve(__dirname, '../www/src'),
        ],
        resolver: {
            ...config.resolver,
            sourceExts: [...config.resolver.sourceExts, 'ts', 'tsx', 'json'],
            extraNodeModules: {
                //'@frontend': path.resolve(__dirname, '../www/src'),
            },
            resolveRequest,
        }
    };
})();

