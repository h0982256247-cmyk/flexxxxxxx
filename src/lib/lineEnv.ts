export function isLineInApp(): boolean {
    if (typeof navigator === "undefined") return false;
    return navigator.userAgent.toLowerCase().includes("line");
}

export function isMobile(): boolean {
    if (typeof navigator === "undefined") return false;
    return /iphone|ipad|ipod|android/i.test(navigator.userAgent);
}
