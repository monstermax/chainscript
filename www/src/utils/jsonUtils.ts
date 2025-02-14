

export function jsonReplacer(key: string, value: any): any {
    if (typeof value === 'bigint') {
        return `bigint:${value.toString()}`;
    }

    if (typeof value === 'bigint') { // alternative
        return { _jsonReplace: true, type: 'bigint', value: value.toString() };
    }

    return value;
}




export function jsonReviver(key: string, value: any): any {
    if (typeof value === 'string') {
        const parts = value.split(':');

        if (parts.length === 2 && parts[0] === 'bigint' && /^[0-9]+$/.test(parts[1])) {
            return BigInt(parts[1]); // "bigint:12345" => BigInt("12345")
        }
    }

    if (typeof value === 'object' && value && value._jsonReplace && value.type === 'bigint') { // alternative compatibility
        return BigInt(value.value); // { _jsonReplace: true, type: "bigint", value: "12345" } => BigInt("12345")
    }

    return value;
}
