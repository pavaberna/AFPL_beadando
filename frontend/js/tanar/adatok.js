import { listaLekerese } from "../lista.js";

const utvonalak = {
    osztalyok: "backend/public/teacher/classes.php",
    sorsolas: "backend/public/teacher/draw.php"
};

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

export async function diakokSorsolasa(osztalyId, darab, hianyzok) {
    const valasz = await apiRequest({
        url: utvonalak.sorsolas,
        method: "POST",
        data: { class_id: Number(osztalyId), count: darab, absent_ids: hianyzok }
    });
    if (!Array.isArray(valasz?.students)) {
        throw new Error("Hiányzik a sorsolás eredménye a válaszból.");
    }
    return valasz.students;
}

export function nevModositasa(nev) {
    return apiRequest({
        url: "backend/public/teacher/settings.php",
        method: "POST",
        data: { display_name: nev }
    });
}