import { listaLekerese } from "../lista.js";

const utvonalak = {
    osztalyok: "backend/public/teacher/classes.php",
    beallitasok: "backend/public/teacher/settings.php"
};

export function nevModositasa(nev) {
    return apiRequest({
        url: utvonalak.beallitasok,
        method: "POST",
        data: { display_name: nev }
    });
}

export function sajatOsztalyokLekerese() {
    return listaLekerese(utvonalak.osztalyok, "classes");
}

export function osztalyNevsorLekerese(osztalyId) {
    const parameterek = new URLSearchParams({ class_id: osztalyId });

    return listaLekerese(
        `${utvonalak.osztalyok}?${parameterek}`,
        "students"
    );
}