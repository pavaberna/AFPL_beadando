import { htmlEscape } from "./kozos.js";
import {
    tanarokLekerese,
    osztalyokLekerese,
    osztalyHozzaadasa
} from "./adatok.js";

export function osztalyokTartalma(osztalyok) {
    const hely = document.querySelector("#admin-tartalom");

    if (!hely) return;

    const sorok = osztalyok.map(osztaly => {
        const felvetelDatuma = String(
            osztaly.created_at ?? ""
        ).slice(0, 10);

        return `
            <tr>
                <td>${htmlEscape(osztaly.name)}</td>
                <td>?</td>
                <td>${htmlEscape(felvetelDatuma)}</td>

                <td>
                    <button
                        type="button"
                        class="btn-img"
                        data-muvelet="diak-hozzaadas"
                        data-id="${htmlEscape(osztaly.id)}"
                        data-osztaly-nev="${htmlEscape(osztaly.name)}"
                        title="Új diák felvétele"
                        aria-label="Új diák felvétele"
                    >
                        <img class="icon" src="img/insert.png" alt="">
                    </button>
                </td>

                <td>
                    <button
                        type="button"
                        class="btn-img"
                        data-muvelet="osztaly-torles"
                        data-id="${htmlEscape(osztaly.id)}"
                        title="Törlés"
                        aria-label="Osztály törlése"
                    >
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
                    <th scope="col">Osztály</th>
                    <th scope="col">Tanár? Létszám?</th>
                    <th scope="col">Felvéve</th>
                    <th scope="col"></th>
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

        osztalyUrlap.reset();
        osztalyUrlapHiba.textContent = "";

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

        osztalyDialog.showModal();
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
    if (tanarAzonosito !== "") {
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
        await osztalyHozzaadasa(adatok);

        // Csak sikeres mentés után zárjuk be.
        osztalyDialog.close();

        try {
            const osztalyok = await osztalyokLekerese();
            osztalyokTartalma(osztalyok);
        } catch (error) {
            console.error("Az osztálylista nem frissíthető.", error);

            alert(
                "Az osztály felvétele sikerült, de a lista nem frissült. " +
                "Nyisd meg újra az Osztályok menüpontot."
            );
        }
    } catch (error) {
        if (error.status === 409) {
            osztalyUrlapHiba.textContent =
                "Ez az osztálynév már foglalt. Válassz másikat!";
        } else if (error.status === 404) {
            osztalyUrlapHiba.textContent =
                "A kiválasztott tanár már nem létezik. " +
                "Válassz másikat vagy a tanár nélküli lehetőséget!";
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