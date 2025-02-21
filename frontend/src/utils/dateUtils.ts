// dateUtils.ts




// Dates

export function getUsDate(date?: Date) {
    date = date || new Date;
    return date.toLocaleDateString().split('/').reverse().join('-');
}

export function getUsDateTime(date?: Date) {
    date = date || new Date;
    return `${getUsDate(date)} ${date.toLocaleTimeString()}`;
}


export function now(): string {
    const options: { hour: string | any, minute: string | any, second: string | any } = {
        /* year: "numeric", month: "2-digit", day: "2-digit", */
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    }
    return new Date().toLocaleTimeString("fr-FR", options);
}


