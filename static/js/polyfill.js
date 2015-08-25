Number.isFinite = Number.isFinite || function isFinite(x) {
    return x === x &&
           x !== null &&
           x !== Number.POSITIVE_INFINITY &&
           x !== Number.NEGATIVE_INFINITY;
};
