// Az útvonalak az oldal URL-jéhez képest értendők.
const utvonalak = {
    tanarok: "backend/public/admin/teachers.php",
    osztalyok: "backend/public/admin/classes.php"
};

// Megőrizzük a lekéréseket, hogy a dashboard és a listák
// ugyanazokat az adatokat használhassák.
const adatKeresek = new Map();


// Közös lekérés.
// A listaMezo mondja meg, melyik mezőben érkezik a tömb:
// például "teachers" vagy "classes".
function listaLekerese(url, listaMezo) {
    if (!adatKeresek.has(url)) {
        const keres = apiRequest({
            url,
            cache: "no-store"
        })
            .then(valasz => {
                const lista = valasz?.[listaMezo];

                if (!Array.isArray(lista)) {
                    throw new Error(
                        `A válasz "${listaMezo}" mezőjében tömböt vártunk.`
                    );
                }

                return lista;
            })
            .catch(error => {
                // A hibás kérést nem őrizzük meg.
                // Így később újra megpróbálható.
                adatKeresek.delete(url);
                throw error;
            });

        adatKeresek.set(url, keres);
    }

    return adatKeresek.get(url);
}


// Ezeket a függvényeket használhatják a többi fájlban.
export function tanarokLekerese() {
    return listaLekerese(utvonalak.tanarok, "teachers");
}

export function osztalyokLekerese() {
    return listaLekerese(utvonalak.osztalyok, "classes");
}