// config.client.ts

import { AccountAddress } from "@backend/types/account.types";


/** Nom de la Blockchain */
export const chainName = "ChainScript";

/** Symbole monétaire de la monnaie native de la Blockchain */
export const symbol = "DEV";

/** ID de la chaine (à renseigner dans Metamask) */
export const chainId = 9999999999;

/** Nombre de decimals de la monnaie native de la Blockchain */
export const decimals = 18;



export const contractsAddresses = {
    Tokens: {
      WDEV: '0xFc0B082912e40593c491ad40a5Be171343bC027F',
      Token1: '0x8DA55e2c6Fb4f7A8F59c920682c8E5D8a852b6C5',
      Token2: '0x24D622Dc18A8c9B21F1f00fe31d80106d13b63f4',
      ChainCoin: '0x6515286c39e79B72a8A53932Ede12936342D3C7f',
      BTCjs: '0x80dBFbedb1325f62B3971b57aDa17D1402401E7D',
      EtherJS: '0xA220cdCc5E25A1547077DCFe15d99F9237132cdD',
      USDjs: '0x34e3FCedfC075562Fa723b5650A29d2A5e2AdABc'
    },
    LpPairs: {
      WDEV_Token1: '0xF847f6c83C560F631C06404721e109bC2E4D58b7',
      WDEV_Token2: '0x98F3107c13C50eA96e9010CcAdc0867B0857A7b6',
      WDEV_ChainCoin: '0xEc794A651D54BF8455Ccb63b94CB203fAC257638',
      WDEV_BTCjs: '0xd1c549405D9E44DeA227C7b1f586b44C36B96E8c',
      WDEV_EtherJS: '0x0BF439F18A8541980A5fb801a5ff0a2758baaa36',
      WDEV_USDjs: '0xa3299614E6b099dFAFD9595B73cc3634B4F38a67'
    },
    //LpPair: '0xF847f6c83C560F631C06404721e109bC2E4D58b7',
    AmmRouter: '0x09679E29979F9B86557F42FCb6B592e47d1FD1CC',
    NftToken: '0x47174F3C1576e0824aCA48298f02a7ad1415d5C5',
    dApps: {
      ChainChat: '0x22B9b430a529AdA54C1e5057C371a1334055C2F0',
      ChainIt: '0x3D5Dff979d1F5FED2851Bc956F8269791f1019de',
      ChainTweet: '0x933293c50a45966F636974A482718e862aF5aE93',
      TeleScript: '0x752A204a5711D6c3bAE2B9394629d4eb4e9B115A',
      ChainStore: '0xda35CCE1489301Bb24ea3f0afe993E0559B112ca'
    }
};




/** Liste des Tokens "swappables" */
export const swapableTokens: Record<AccountAddress, string> = Object.fromEntries(
    Object.entries(contractsAddresses.Tokens).map(([a,b]) => [b,a])
);


