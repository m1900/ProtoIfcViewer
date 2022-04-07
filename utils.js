// https://stackoverflow.com/a/661757
export function toFixedImproved(value, precision) {
    var power = Math.pow(10, precision || 0);
    return String(Math.round(value * power) / power);
}
