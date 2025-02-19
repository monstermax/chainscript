
const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
//const { getDefaultConfig } = require("metro-config");


//module.exports = {
//  transformer: {
//    getTransformOptions: async () => ({
//      transform: {
//        experimentalImportSupport: false,
//        inlineRequires: true,
//      },
//    }),
//  },
//};


/*
module.exports = (async () => {
  const defaultConfig = await getDefaultConfig();

  return {
    //...defaultConfig, // if decommented => warn No apps connected. Sending "reload" to all React Native apps failed

    projectRoot: __dirname,

    resolver: {
      //...defaultConfig.resolver,

      nodeModulesPaths: [
        path.resolve(__dirname, "node_modules"), // Pour le dossier 'mobile'
        path.resolve(__dirname, "../node_modules"), // Pour le dossier 'root'
      ],
    },

    extraNodeModules: new Proxy(
      {},
      {
        get: (target, name) => {
          if (typeof name === 'string') {
            return path.join(__dirname, `node_modules/${name}`);
          }
          return undefined;
        }
      }
    ),

    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },

    //watchFolders: [
    //  path.resolve(__dirname, ".."), // Regarder aussi dans le dossier parent pour les changements
    //],
  };
})();
*/




/*
const config = {
  projectRoot: __dirname,
  watchFolders: [
    path.resolve(__dirname, ".."),
    path.resolve(__dirname, "../node_modules")
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, "node_modules"),
      path.resolve(__dirname, "../node_modules")
    ]
  }
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
*/


const extraNodeModules = {
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  'react': path.resolve(__dirname, 'node_modules/react'),
  'invariant': path.resolve(__dirname, 'node_modules/invariant'),
  '@babel/runtime': path.resolve(__dirname, 'node_modules/@babel/runtime'),
};


module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  return {
    ...config,
    projectRoot: path.resolve(__dirname, './'),
    watchFolders: [
      path.resolve(__dirname, './'), 
      path.resolve(__dirname, '../node_modules')
    ],
    resolver: {
      ...config.resolver,
      //sourceExts: ['jsx', 'js', 'ts', 'tsx'],
      sourceExts: [...config.resolver.sourceExts, 'json'],
      nodeModulesPaths: [
        path.resolve(__dirname, './node_modules'),
        path.resolve(__dirname, '../node_modules')
      ],
      //hasteImplModulePath: null // Désactive Haste pour éviter les conflits
    }
  };
})();

