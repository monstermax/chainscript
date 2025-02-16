
```bash
curl -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [{
        "to": "0xCONTRACT_ADDRESS",
        "data": "0xMETHOD_SIGNATURE"
    }],
    "id": 1
  }'
```



```bash
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getBalance","params":["0xee5392913a7930c233aa711263f715f616114e9b", "latest"]}'
```



```bash
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"0x0000000000000000000000000000000000000030","data":"0x60fe47b1"}, "latest"]}'
```



