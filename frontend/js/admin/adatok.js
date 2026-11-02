// Az útvonalak az oldal URL-jéhez képest értendők.
const utvonalak = {
    tanarok: "backend/public/admin/teachers.php",
    osztalyok: "backend/public/admin/classes.php",
    diakok: "backend/public/admin/students.php"
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


// Új tanár felvétele.
export async function tanarHozzaadasa({
    username,
    password,
    display_name
}) {
    const valasz = await apiRequest({
        url: utvonalak.tanarok,
        method: "POST",

        data: {
            username,
            password,
            display_name
        }
    });

    // Sikeres mentés után a korábbi tanárlista már elavult.
    // A következő lekérés ezért friss adatokat kér a backendtől.
    adatKeresek.delete(utvonalak.tanarok);

    return valasz.teacher;
}

// Új osztály felvétele.
export async function osztalyHozzaadasa(adatok) {
    const valasz = await apiRequest({
        url: utvonalak.osztalyok,
        method: "POST",
        data: adatok
    });

    // A következő lekérés már friss osztálylistát kérjen.
    adatKeresek.delete(utvonalak.osztalyok);

    return valasz.class;
}

// Új diák felvétele a megadott osztályba.
export async function diakHozzaadasa(adatok) {
    const valasz = await apiRequest({
        url: utvonalak.diakok,
        method: "POST",
        data: adatok
    });

    return valasz.student;
}