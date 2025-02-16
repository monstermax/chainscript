


# ADD CHAIN TO METAMASK

```js
await window.ethereum.request({
    "method": "wallet_addEthereumChain",
    "params": [
    {
        chainId: "0x64",
        chainName: "ChainScript",
        rpcUrls: [
            "http://localhost:8545"
        ],
        nativeCurrency: {
            name: "DEV",
            symbol: "DEV",
            decimals: 18
        },
        blockExplorerUrls: [
            "http://localhost:8545/"
        ]
    }
],
});
```


# SWITCH TO CHAIN

```js
await window.ethereum.request({
    "method": "wallet_switchEthereumChain",
    "params": [
    {
        chainId: "0x2540be3ff"
    }
],
});
```



# GET CONNECTED ACCOUNTS

```js
ethereum.request({ method: 'eth_requestAccounts' })
    .then(accounts => console.log("Comptes autorisés :", accounts))
    .catch(error => console.error("Erreur Metamask :", error));
```




# GET BALANCE

```js
await ethereum.request({
    method: "eth_getBalance",
    params: [
        "0xee5392913a7930c233aa711263f715f616114e9b",
        "latest"
    ],
});
```


# GET TRANSACTION RECEIPT

```js
await ethereum.request({
    method: 'eth_getTransactionReceipt',
    params: ["0x8d32f7705420ca65a11f81771d3d2d7603edd6aac82127be0460a0c814b11446"]
}).then(console.log).catch(console.error);
```


# CREATE CONTRACT (TODO)

```js
await ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
        from: '0xee5392913a7930c233Aa711263f715f616114e9B',
        data: "0xa9059cbb000000000000000000000000123456789abcdef123456789abcdef123456789abcdef000000000000000000000000000000000000000000000000000000000000000a",
        gas: "0x27100",  // 100000 (en hexadécimal)
    }]
}).then(console.log).catch(console.error);
```


# CALL CONTRACT (OK)

```js
ethereum.request({
    method: 'eth_call',
    params: [{
        to: "0xdc0c7f994d58af4e7346ebe8fb0917af55d6ca45", // ContractTest1
        data: "0xa594bdbb", // test_vm_1
    }, "latest"]
}).then(console.log).catch(console.error);
```

