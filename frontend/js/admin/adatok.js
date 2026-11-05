import { listaLekerese as kozosListaLekerese } from "../lista.js";

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
function listaLekerese(url, listaMezo) {
    if (!adatKeresek.has(url)) {
        const keres = kozosListaLekerese(url, listaMezo)
            .catch(hiba => {
                adatKeresek.delete(url);
                throw hiba;
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

// A PATCH a teljes osztálylistát lecseréli, ezért mentés előtt friss listát kérünk.
export async function tanarFrissAdatai(id) {
    const tanarok = await kozosListaLekerese(utvonalak.tanarok, "teachers");
    const tanar = tanarok.find(tanar => Number(tanar.id) === id);
    if (!tanar) throw new Error("A tanár már nem található.");
    if (!Array.isArray(tanar.class_ids)) throw new Error("Hiányzik a tanár osztálylistája.");
    return tanar;
}

export async function osztalyTanarhozRendelese(tanarId, osztalyId, hozzarendeles = true) {
    const tanar = await tanarFrissAdatai(tanarId);
    const osztalyIds = tanar.class_ids.map(Number);
    if (osztalyIds.includes(osztalyId) === hozzarendeles) {
        adatKeresek.delete(utvonalak.osztalyok);
        adatKeresek.delete(utvonalak.tanarok);
        return tanar;
    }
    const ujLista = hozzarendeles
        ? [...osztalyIds, osztalyId]
        : osztalyIds.filter(id => id !== osztalyId);

    const valasz = await apiRequest({
        url: utvonalak.tanarok,
        method: "PATCH",
        data: { id: tanarId, class_ids: ujLista }
    });

    adatKeresek.delete(utvonalak.tanarok);
    adatKeresek.delete(utvonalak.osztalyok);
    return valasz.teacher;
}

export async function tanarTorlese(id) {
    const valasz = await apiRequest({
        url: utvonalak.tanarok,
        method: "DELETE",
        data: { id }
    });

    if (valasz?.ok !== true) {
        throw new Error("A szerver nem igazolta vissza a törlést.");
    }

    adatKeresek.delete(utvonalak.tanarok);
    adatKeresek.delete(utvonalak.osztalyok);
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

    if (adatok.teacher_id != null) adatKeresek.delete(utvonalak.tanarok);
    return valasz.class;
}

export async function osztalyAtnevezese(id, name) {
    await apiRequest({
        url: utvonalak.osztalyok,
        method: "PATCH",
        data: { id, name }
    });
    adatKeresek.delete(utvonalak.osztalyok);
}

export async function osztalyTorlese(id) {
    const valasz = await apiRequest({
        url: utvonalak.osztalyok,
        method: "DELETE",
        data: { id }
    });
    if (valasz?.ok !== true) throw new Error("A szerver nem igazolta vissza a törlést.");

    adatKeresek.delete(utvonalak.osztalyok);
    adatKeresek.delete(utvonalak.tanarok);
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

export function diakokLekerese(osztalyId) {
    return kozosListaLekerese(utvonalak.diakok + "?class_id=" + osztalyId, "students");
}

export async function diakModositasa(id, mezok) {
    await apiRequest({ url: utvonalak.diakok, method: "PATCH", data: { id, ...mezok } });
}

export async function diakTorlese(id) {
    const valasz = await apiRequest({ url: utvonalak.diakok, method: "DELETE", data: { id } });
    if (valasz?.ok !== true) throw new Error("A szerver nem igazolta vissza a törlést.");
}

export function diakokImportalasa(osztalyId, adatok) {
    adatok.set("class_id", String(osztalyId));
    return apiRequest({
        url: "backend/public/admin/students-import.php",
        method: "POST",
        data: adatok
    });
}
