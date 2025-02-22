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
      WDEV: '0x7DA538B464cDa5271017e0220e3332214805944D',
      Token1: '0x93FD6B09Bb59fC60defB8967686a7c3932AAF804',
      Token2: '0xb6f6E8BDA93879EB1a6D16313d951350B245BE68',
      ChainCoin: '0x4d0b4807C5aac1Ea0760ddA1936B99AA63848c49',
      BTCjs: '0x9352f038834a3ff50C95Afde74d46a1bC84477F8',
      EtherJS: '0x86F250b0d899b44C59F123D65e117e784695216f',
      USDjs: '0x28EAfa5D7a29416AECcc3C5620B1F5468092fEE5'
    },
    LpPairs: {
      WDEV_Token1: '0x334869e82e85Bc5e04072B56e253C61D34E141D8',
      WDEV_Token2: '0x21f1aDBD90aea4b3fE0Ec2bB4e509bd292345246',
      WDEV_ChainCoin: '0x3B7665Ae1f373e651Dc46FD4BBC0637949B1ad7d',
      WDEV_BTCjs: '0x6e90FC51E4a840461374878E1832362469478410',
      WDEV_EtherJS: '0x695e4F17581F59339fFBFC5b89E73abBF42AE42d',
      WDEV_USDjs: '0x6b07C8E15B5B2086845303179587c00D116b8759'
    },
    AmmRouter: '0x939dc50f544AB21CAd541Ac126E0E8232E86DFdD',
    NftToken: '0x15afb09F45C3133A7f423d7d4d88e3308CebCEC1',
    dApps: {
      ChainChat: '0x9917e684e5452b64c81f1b5f6BE9c5a939ecE93e',
      ChainIt: '0x45df6a3644BD73c94207d53cf49d0Bae2fd0eFde',
      ChainTweet: '0xC10a2805C1610d81eA3037B041b6669CB4944251',
      TeleScript: '0xbe7E187734C30F11e7E7D3bc00D84F27CFD0e345',
      ChainStore: '0xD6b48e9f3e7a3e233ECD3E1a493de5e9A764B80C'
    }
};




/** Liste des Tokens "swappables" */
export const swapableTokens: Record<AccountAddress, string> = Object.fromEntries(
    Object.entries(contractsAddresses.Tokens).map(([a, b]) => [b, a])
);


