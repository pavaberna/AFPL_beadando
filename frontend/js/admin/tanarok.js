import {
    tanarHozzaadasa,
    tanarokLekerese,
    tanarTorlese
} from "./adatok.js";
import { tanarAdatlapMegnyitasa } from "./tanar-adatlap.js";
import { htmlEscape } from "./kozos.js";


export function tanarokTartalma(tanarok) {
    const hely = document.querySelector("#admin-tartalom");

    if (!hely) return;

    const sorok = tanarok.map(tanar => {
        // ÉÉÉÉ-HH-NN formátumú dátum vagy időbélyeg első 10 karaktere.
        const felvetelDatuma = String(tanar.created_at ?? "").slice(0, 10);

        return `
            <tr>
                <td>${htmlEscape(tanar.username)}</td>
                <td>${htmlEscape(tanar.display_name)}</td>
                <td>${htmlEscape(felvetelDatuma)}</td>

                <td>
                    <button
                        type="button"
                        class="btn-img"
                        data-muvelet="tanar-info"
                        data-id="${htmlEscape(tanar.id)}"
                        title="Tanár adatlapja"
                        aria-label="${htmlEscape(tanar.display_name)} adatlapja"
                    >
                        <img class="icon" src="img/info.png" alt="">
                    </button>
                </td>

                <td>
                    <button
                        type="button"
                        class="btn-img"
                        data-muvelet="tanar-torles"
                        data-nev="${htmlEscape(tanar.display_name)}"
                        data-felhasznalonev="${htmlEscape(tanar.username)}"
                        data-id="${htmlEscape(tanar.id)}"
                        title="Törlés"
                        aria-label="Tanár törlése"
                    >
                        <img class="icon" src="img/delete.png" alt="">
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    hely.innerHTML = `
        <h2>Tanárok</h2>

        <table class="card">
            <thead>
                <tr>
                    <th scope="col">Név</th>
                    <th scope="col">Tanár neve</th>
                    <th scope="col">Felvéve</th>
                    <th scope="col"></th>
                    <th scope="col">
                        <button
                            type="button"
                            class="btn-img"
                            data-muvelet="tanar-hozzaadas"
                            title="Új tanár felvétele"
                            aria-label="Új tanár felvétele"
                        >
                            <img class="icon" src="img/insert.png" alt="">
                        </button>
                    </th>
                </tr>
            </thead>

            <tbody>
                ${sorok || `
                    <tr>
                        <td colspan="5">Még nincsenek tanárok.</td>
                    </tr>
                `}
            </tbody>
        </table>
    `;
}


document.addEventListener("click", event => {
    const gomb = event.target.closest('button[data-muvelet="tanar-info"]');
    if (gomb) tanarAdatlapMegnyitasa(Number(gomb.dataset.id));
});


const tanarDialog = document.querySelector("#tanar-dialog");
const tanarUrlap = document.querySelector("#tanar-urlap");
const tanarUrlapHiba = document.querySelector("#tanar-urlap-hiba");
const tanarMegse = document.querySelector("#tanar-megse");


// A dinamikusan megjelenő hozzáadásgombot is kezeli.
document.addEventListener("click", event => {
    const gomb = event.target.closest(
        'button[data-muvelet="tanar-hozzaadas"]'
    );

    if (!gomb || gomb.disabled) return;

    event.preventDefault();

    tanarUrlap.reset();
    tanarUrlapHiba.textContent = "";
    tanarDialog.showModal();
});


document.addEventListener("click", async event => {
    const gomb = event.target.closest('button[data-muvelet="tanar-torles"]');
    if (!gomb || gomb.disabled) return;

    const { id, nev, felhasznalonev } = gomb.dataset;
    const uzenet = `Biztosan törlöd ezt a tanárt: ${nev} (${felhasznalonev})?\n` +
        "Az osztályai megmaradnak, de a tanár hozzárendelései megszűnnek.";
    if (!window.confirm(uzenet)) return;

    gomb.disabled = true;
    try {
        await tanarTorlese(Number(id));
    } catch (hiba) {
        alert(hiba.message || "Nem sikerült törölni a tanárt.");
        gomb.disabled = false;
        return;
    }

    try {
        const tanarok = await tanarokLekerese();
        if (gomb.isConnected) tanarokTartalma(tanarok);
    } catch {
        alert("A tanár törlése sikerült, de a lista nem frissült. Nyisd meg újra a Tanárok menüpontot.");
    }
});


// A Mégse gomb bezárja az ablakot.
tanarMegse.addEventListener("click", () => {
    tanarDialog.close();
});


// Bezáráskor kiürítjük a mezőket.
tanarDialog.addEventListener("close", () => {
    tanarUrlap.reset();
    tanarUrlapHiba.textContent = "";
});


let tanarMentesFolyamatban = false;


// Mentés közben az Escape se zárja be az ablakot.
tanarDialog.addEventListener("cancel", event => {
    if (tanarMentesFolyamatban) {
        event.preventDefault();
    }
});


// Az űrlap beküldése.
tanarUrlap.addEventListener("submit", async event => {
    event.preventDefault();

    if (tanarMentesFolyamatban) return;

    tanarUrlapHiba.textContent = "";

    const mezok = new FormData(tanarUrlap);

    const adatok = {
        username: mezok.get("username").trim(),
        display_name: mezok.get("display_name").trim(),
        password: mezok.get("password")
    };

    // A csak szóközből álló nevek se legyenek elfogadhatók.
    if (!adatok.username || !adatok.display_name || !adatok.password) {
        tanarUrlapHiba.textContent = "Minden mező kitöltése kötelező.";
        return;
    }

    const mentesGomb = tanarUrlap.querySelector('button[type="submit"]');
    const eredetiFelirat = mentesGomb.textContent;

    tanarMentesFolyamatban = true;
    mentesGomb.disabled = true;
    tanarMegse.disabled = true;
    mentesGomb.textContent = "Mentés…";

    try {
        // Valódi adatküldés a backendnek.
        await tanarHozzaadasa(adatok);

        // Csak sikeres mentés után zárjuk be.
        // A meglévő close eseménykezelő kiüríti az űrlapot.
        tanarDialog.close();

        // A mentés sikerült; a lista frissítését külön kezeljük.
        try {
            const tanarok = await tanarokLekerese();
            tanarokTartalma(tanarok);
        } catch (error) {
            console.error("A tanárlista nem frissíthető.", error);

            alert(
                "A tanár felvétele sikerült, de a lista nem frissült. " +
                "Nyisd meg újra a Tanárok menüpontot."
            );
        }
    } catch (error) {
        if (error.status === 409) {
            tanarUrlapHiba.textContent =
                "Ez a felhasználónév már foglalt. Válassz másikat!";
        } else if (error.status === 400) {
            tanarUrlapHiba.textContent =
                error.message || "Ellenőrizd a megadott adatokat!";
        } else {
            tanarUrlapHiba.textContent =
                error.message || "Nem sikerült elmenteni a tanárt.";
        }
    } finally {
        tanarMentesFolyamatban = false;
        mentesGomb.disabled = false;
        tanarMegse.disabled = false;
        mentesGomb.textContent = eredetiFelirat;
    }
});
