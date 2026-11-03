export async function listaLekerese(url, listaMezo) {
    const valasz = await apiRequest({
        url,
        cache: "no-store"
    });

    const lista = valasz?.[listaMezo];

    if (!Array.isArray(lista)) {
        throw new Error(
            `A válasz "${listaMezo}" mezőjében tömböt vártunk.`
        );
    }

    return lista;
}