function formatAddress(address: string) {
    return address.slice(0, 6) + '...' + address.slice(address.length - 4, address.length);
}

function padNumber(n: number) {
    return (n < 10 ? '0' : '') + n
}

function logTransactionUpdate(update: any) {
    console.log("📡 Transaction Update:", update);
    if (update && (update.status === "confirmed" || update.status === 1)) {
        console.log(" 🍾 Transaction " + update.hash + " finished!");
        console.log(
            " ⛽️ " +
            update.gasUsed +
            "/" +
            (update.gasLimit || update.gas) +
            " @ " +
            parseFloat(update.gasPrice) / 1000000000 +
            " gwei",
        );
    }
}

export { formatAddress, padNumber, logTransactionUpdate }