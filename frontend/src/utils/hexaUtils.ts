


export function bufferToHex(buffer: ArrayBuffer): string {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}


/** Convertir une chaîne hexadécimale en Uint8Array */
//export function hexToUint8Array(hexString: string): Uint8Array {
//    //if (hex.startsWith("0x")) hex = hex.slice(2);
//    //return new Uint8Array(Buffer.from(hex, "hex"));
//    const h = hexString.match(/.{1,2}/g);
//    const m = h ? h.map((byte) => parseInt(byte, 16)) : [];
//    return Uint8Array.from(m);
//}


/** Convertir une chaîne hexadécimale en Uint8Array */
export function hexToUint8Array(hexString: string): Uint8Array {
    if (!hexString.startsWith("0x")) {
        throw new Error("Hex string must start with '0x'");
    }
    const hex = hexString.slice(2);
    if (hex.length % 2 !== 0) {
        throw new Error("Invalid hex string");
    }
    const uint8Array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        uint8Array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return uint8Array;
}


