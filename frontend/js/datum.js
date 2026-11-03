export function datumFormazasa(datum) {
    return datum.toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}