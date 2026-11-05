import "./osztaly-nevsor.js";
import { htmlEscape } from "./kozos.js";
import {
    tanarokLekerese,
    osztalyokLekerese,
    osztalyHozzaadasa,
    osztalyAtnevezese,
    osztalyTorlese
} from "./adatok.js";

export function osztalyokTartalma(osztalyok) {
    const hely = document.querySelector("#admin-tartalom");

    if (!hely) return;

    const sorok = osztalyok.map(osztaly => {
        const felvetelDatuma = String(
            osztaly.created_at ?? ""
        ).slice(0, 10);

        return `
            <tr data-id="${htmlEscape(osztaly.id)}" data-nev="${htmlEscape(osztaly.name)}">
                <td>
                    <button type="button" class="btn-img" data-muvelet="osztaly-atnevezes"
                        title="Átnevezés" aria-label="${htmlEscape(osztaly.name)} átnevezése">
                        <img class="icon" src="img/update.png" alt="">
                    </button>
                </td>
                <td>${htmlEscape(osztaly.name)}</td>
                <td>${htmlEscape(felvetelDatuma)}</td>
                <td>
                    <button type="button" class="btn-img" data-muvelet="osztaly-info" data-osztaly-id="${htmlEscape(osztaly.id)}"
                        title="Osztály adatai" aria-label="${htmlEscape(osztaly.name)} adatai">
                        <img class="icon" src="img/info.png" alt="">
                    </button>
                </td>
                <td>
                    <button type="button" class="btn-img" data-muvelet="osztaly-torles"
                        title="Törlés" aria-label="${htmlEscape(osztaly.name)} törlése">
                        <img class="icon" src="img/delete.png" alt="">
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    hely.innerHTML = `
        <h2>Osztályok</h2>

        <table class="card">
            <thead>
                <tr>
                    <th scope="col">Módosítás</th>
                    <th scope="col">Osztály neve</th>
                    <th scope="col">Felvéve</th>
                    <th scope="col">Info</th>
                    <th scope="col">
                        <button
                            type="button"
                            class="btn-img"
                            data-muvelet="osztaly-hozzaadas"
                            title="Új osztály felvétele"
                            aria-label="Új osztály felvétele"
                        >
                            <img class="icon" src="img/insert.png" alt="">
                        </button>
                    </th>
                </tr>
            </thead>

            <tbody>
                ${sorok || `
                    <tr>
                        <td colspan="5">Még nincsenek osztályok.</td>
                    </tr>
                `}
            </tbody>
        </table>
    `;
}


const osztalyDialog = document.querySelector("#osztaly-dialog");
const osztalyUrlap = document.querySelector("#osztaly-urlap");
const osztalyTanarSelect = document.querySelector("#osztaly-teacher");
const osztalyUrlapHiba = document.querySelector("#osztaly-urlap-hiba");
const osztalyMegse = document.querySelector("#osztaly-megse");

let osztalyMentesFolyamatban = false;


const osztalyCim = document.querySelector("#osztaly-dialog-cim");
const osztalyNev = document.querySelector("#osztaly-name");
let modositottOsztalyId = null;

function urlapMegnyitasa(sor = null) {
    modositottOsztalyId = sor ? Number(sor.dataset.id) : null;
    osztalyUrlap.reset();
    osztalyUrlapHiba.textContent = "";
    osztalyCim.textContent = sor ? "Osztály átnevezése" : "Új osztály felvétele";
    osztalyTanarSelect.closest("p").hidden = Boolean(sor);
    osztalyTanarSelect.disabled = Boolean(sor);
    osztalyNev.value = sor?.dataset.nev ?? "";
    osztalyDialog.showModal();
    osztalyNev.focus();
}

document.addEventListener("click", event => {
    const gomb = event.target.closest('[data-muvelet="osztaly-atnevezes"]');
    if (gomb) urlapMegnyitasa(gomb.closest("tr"));
});

async function listaFrissitese(tablazat) {
    try {
        const osztalyok = await osztalyokLekerese();
        if (tablazat?.isConnected) osztalyokTartalma(osztalyok);
    } catch {
        alert("A művelet sikerült, de a lista nem frissült. Nyisd meg újra az Osztályok menüpontot.");
    }
}

document.addEventListener("click", async event => {
    const gomb = event.target.closest('[data-muvelet="osztaly-torles"]');
    if (!gomb || gomb.disabled) return;

    const sor = gomb.closest("tr");
    const tablazat = gomb.closest("table");
    const uzenet = `Törlöd a(z) ${sor.dataset.nev} osztályt?\n` +
        "Az osztály összes diákja és a hozzájuk tartozó sorsolási előzmények is törlődnek. A tanárok megmaradnak.";
    if (!window.confirm(uzenet)) return;

    gomb.disabled = true;
    try {
        await osztalyTorlese(Number(sor.dataset.id));
    } catch (hiba) {
        alert(hiba.message || "Nem sikerült törölni az osztályt.");
        gomb.disabled = false;
        return;
    }
    await listaFrissitese(tablazat);
});

// A hozzáadásgomb megnyitja az űrlapot.
document.addEventListener("click", async event => {
    const gomb = event.target.closest(
        'button[data-muvelet="osztaly-hozzaadas"]'
    );

    if (!gomb || gomb.disabled) return;

    event.preventDefault();
    gomb.disabled = true;

    try {
        // A korábban lekért tanárlistát is fel tudja használni.
        const tanarok = await tanarokLekerese();


        // Minden megnyitáskor újra összeállítjuk a választékot.
        osztalyTanarSelect.replaceChildren(
            new Option("Nincs hozzárendelt tanár", "")
        );

        tanarok.forEach(tanar => {
            // Látható szöveg: a tanár neve.
            // Beküldött érték: a tanár azonosítója.
            const opcio = new Option(tanar.display_name, tanar.id);
            osztalyTanarSelect.append(opcio);
        });

        if (gomb.isConnected) urlapMegnyitasa();
    } catch (error) {
        console.error("A tanárok nem tölthetők be.", error);
        alert("Nem sikerült betölteni a tanárokat. Próbáld újra!");
    } finally {
        gomb.disabled = false;
    }
});


// Mégse gomb.
osztalyMegse.addEventListener("click", () => {
    if (osztalyMentesFolyamatban) return;

    osztalyDialog.close();
});


// Mentés közben az Escape se zárja be.
osztalyDialog.addEventListener("cancel", event => {
    if (osztalyMentesFolyamatban) {
        event.preventDefault();
    }
});


// Bezáráskor kiürítjük az űrlapot.
osztalyDialog.addEventListener("close", () => {
    osztalyUrlap.reset();
    osztalyUrlapHiba.textContent = "";
});


// Az osztály mentése.
osztalyUrlap.addEventListener("submit", async event => {
    event.preventDefault();

    if (osztalyMentesFolyamatban) return;

    osztalyUrlapHiba.textContent = "";

    const mezok = new FormData(osztalyUrlap);

    const adatok = {
        name: mezok.get("name").trim()
    };

    if (!adatok.name) {
        osztalyUrlapHiba.textContent = "Az osztály neve kötelező.";
        return;
    }

    const tanarAzonosito = mezok.get("teacher_id");

    // Csak kiválasztott tanár esetén küldünk teacher_id mezőt.
    if (modositottOsztalyId === null && tanarAzonosito !== "") {
        const teacherId = Number(tanarAzonosito);

        if (!Number.isSafeInteger(teacherId)) {
            osztalyUrlapHiba.textContent =
                "Érvénytelen tanárazonosító. Válassz tanárt a listából!";
            return;
        }

        adatok.teacher_id = teacherId;
    }

    const mentesGomb = osztalyUrlap.querySelector(
        'button[type="submit"]'
    );
    const eredetiFelirat = mentesGomb.textContent;

    osztalyMentesFolyamatban = true;
    mentesGomb.disabled = true;
    osztalyMegse.disabled = true;
    mentesGomb.textContent = "Mentés…";

    try {
        const tablazat = document.querySelector("#admin-tartalom table");
        if (modositottOsztalyId === null) {
            await osztalyHozzaadasa(adatok);
        } else {
            await osztalyAtnevezese(modositottOsztalyId, adatok.name);
        }
        osztalyDialog.close();
        await listaFrissitese(tablazat);
    } catch (error) {
        if (error.status === 409) {
            osztalyUrlapHiba.textContent =
                "Ez az osztálynév már foglalt. Válassz másikat!";
        } else if (error.status === 404) {
            osztalyUrlapHiba.textContent =
                modositottOsztalyId !== null ? "Az osztály már nem létezik." :
                "A kiválasztott tanár már nem létezik. Válassz másikat!";
        } else {
            osztalyUrlapHiba.textContent =
                error.message || "Nem sikerült elmenteni az osztályt.";
        }
    } finally {
        osztalyMentesFolyamatban = false;
        mentesGomb.disabled = false;
        osztalyMegse.disabled = false;
        mentesGomb.textContent = eredetiFelirat;
    }
});
