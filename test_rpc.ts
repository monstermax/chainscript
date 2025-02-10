// test_rpc.ts

import http from 'http';


/** 📤 Envoie une requête RPC au serveur */
function sendRpcRequest(method: string, params: object): Promise<any> {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ method, params });

        const options = {
            hostname: '127.0.0.1',
            port: 8545,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Connection': 'close'  // ✅ Assure que la connexion est bien fermée après la réponse
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            console.log(`[Client] Status Code: ${res.statusCode}`);

            res.setEncoding('utf8');  // ✅ Force le format UTF-8 pour éviter les problèmes d'encodage

            res.on('data', (chunk) => {
                console.log(`[Client] Réponse reçue (data): ${chunk}`);
                data += chunk;
            });

            res.on('end', () => {
                console.log(`[Client] Connexion fermée, traitement des données...`);
                try {
                    if (!data) {
                        reject(`[Client] Erreur: Réponse vide du serveur`);
                        return;
                    }
                    const jsonResponse = JSON.parse(data);
                    resolve(jsonResponse);
                } catch (error) {
                    reject(`[Client] Erreur de parsing JSON: ${data}`);
                }
            });
        });

        req.on('error', (error) => {
            reject(`[Client] Erreur de connexion RPC: ${error.message}`);
        });

        req.write(postData);
        req.end();
    });
}


/** ✅ Tests des méthodes RPC */
async function testRpc() {
    try {
        console.log('🔹 Test: getBlock(0)');
        console.log(await sendRpcRequest('getBlock', { blockHeight: 0 }));

        console.log('\n🔹 Test: getAccount(0x0000000000000000000000000000000000000010)');
        console.log(await sendRpcRequest('getAccount', { address: '0x0000000000000000000000000000000000000010' }));

        console.log('\n🔹 Test: sendTransaction');
        console.log(await sendRpcRequest('sendTransaction', {
            from: '0x0000000000000000000000000000000000000010',
            to: '0x0000000000000000000000000000000000000020',
            amount: '1000000'
        }));

    } catch (error) {
        console.error(`❌ Erreur lors du test RPC: ${error}`);
    }
}

testRpc();
