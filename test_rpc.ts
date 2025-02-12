// test_rpc.ts

import http from 'http';


/* ######################################################### */


// Tests des méthodes RPC
async function main() {
    try {
        console.log('\n🔹 Test: sendTransaction');

        const result = await sendRpcRequest('eth_sendTransaction', [
            {
                from: '0x0000000000000000000000000000000000000010',
                to: '0x0000000000000000000000000000000000000020',
                value: '1000000',
                nonce: '0x0'
            }
        ]);

        console.log(result);

    } catch (error) {
        console.error(`❌ Erreur lors du test RPC: ${error}`);
    }
}



// Envoie une requête RPC au serveur
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
                'Connection': 'close',
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            console.log(`[Client] Status Code: ${res.statusCode}`);

            res.setEncoding('utf8');

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



main();
