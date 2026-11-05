import { osztalyokLekerese, osztalyTanarhozRendelese, tanarFrissAdatai } from "./adatok.js";
import { htmlEscape } from "./kozos.js";

export async function tanarAdatlapMegnyitasa(tanarId) {
    const adatlap = document.createElement("section");
    adatlap.textContent = "A tanár adatainak betöltése…";
    document.querySelector("#admin-tartalom").replaceChildren(adatlap);

    try {
        const [tanar, osztalyok] = await Promise.all([
            tanarFrissAdatai(tanarId),
            osztalyokLekerese()
        ]);
        adatlapKirajzolasa(adatlap, tanar, osztalyok);
    } catch (hiba) {
        adatlap.textContent = hiba.message || "Az adatlap nem tölthető be.";
    }
}

function adatlapKirajzolasa(adatlap, tanar, osztalyok) {
    const azonositok = new Set(tanar.class_ids.map(Number));
    const szabad = osztalyok.filter(o => !azonositok.has(Number(o.id)));
    const hozzarendelt = osztalyok.filter(o => azonositok.has(Number(o.id)));

    const gombCime = szabad.length ? "Osztály hozzárendelése" : "Nincs hozzárendelhető osztály.";
    adatlap.innerHTML = `
        <h2>${htmlEscape(tanar.display_name)}</h2>
        <h3>Hozzárendelt osztályok</h3>
        <table class="card">
            <thead><tr><th scope="col">Osztály neve</th><th scope="col">
                <button type="button" class="btn-img" data-hozzaadas ${szabad.length ? "" : "disabled"}
                    title="${gombCime}" aria-label="${gombCime}">
                    <img class="icon" src="img/insert.png" alt="">
                </button>
            </th></tr></thead>
            <tbody>${hozzarendelt.map(o => `<tr>
                <td><button type="button" data-muvelet="osztaly-info" data-osztaly-id="${htmlEscape(o.id)}">${htmlEscape(o.name)}</button></td>
                <td><button type="button" class="btn-img" data-levalasztas="${htmlEscape(o.id)}"
                    title="Hozzárendelés megszüntetése" aria-label="${htmlEscape(o.name)} hozzárendelésének megszüntetése">
                    <img class="icon" src="img/delete.png" alt="">
                </button></td>
            </tr>`).join("") || '<tr><td colspan="2">Még nincs hozzárendelt osztály.</td></tr>'}</tbody>
        </table>
        <p role="alert" data-levetel-hiba></p>
        <dialog aria-labelledby="hozzarendeles-cim">
            <h2 id="hozzarendeles-cim">Osztály hozzárendelése</h2>
            <form>
                <p><label for="hozzarendelendo-osztaly">Osztály</label>
                <select id="hozzarendelendo-osztaly" required>
                    <option value="">Válassz osztályt!</option>
                    ${szabad.map(o => `<option value="${htmlEscape(o.id)}">${htmlEscape(o.name)}</option>`).join("")}
                </select></p>
                <p role="alert"></p>
                <div class="urlap-gombok"><button type="button" class="megse">Mégse</button>
                    <button type="submit" disabled>Hozzárendelés</button></div>
            </form>
        </dialog>
    `;

    const dialog = adatlap.querySelector("dialog");
    const urlap = adatlap.querySelector("form");
    const valaszto = urlap.querySelector("select");
    const gomb = urlap.querySelector('[type="submit"]');
    const megse = urlap.querySelector('[type="button"]');
    const hibajelzes = urlap.querySelector('[role="alert"]');

    let mentesFolyamatban = false;
    adatlap.querySelector("[data-hozzaadas]").addEventListener("click", () => {
        urlap.reset();
        gomb.disabled = true;
        hibajelzes.textContent = "";
        dialog.showModal();
    });
    megse.addEventListener("click", () => dialog.close());
    dialog.addEventListener("cancel", event => {
        if (mentesFolyamatban) event.preventDefault();
    });

    valaszto.addEventListener("change", () => {
        gomb.disabled = !valaszto.value;
        hibajelzes.textContent = "";
    });

    async function hozzarendelesMentese(osztalyId, hozzaadas) {
        if (mentesFolyamatban) return;
        mentesFolyamatban = true;
        const hibaHelye = hozzaadas ? hibajelzes : adatlap.querySelector("[data-levetel-hiba]");
        hibaHelye.textContent = "";
        adatlap.inert = !hozzaadas;
        valaszto.disabled = megse.disabled = gomb.disabled = true;
        try {
            const frissTanar = await osztalyTanarhozRendelese(Number(tanar.id), osztalyId, hozzaadas);
            if (hozzaadas) dialog.close();
            adatlapKirajzolasa(adatlap, frissTanar, osztalyok);
        } catch (hiba) {
            hibaHelye.textContent = hiba.message || "Nem sikerült módosítani a hozzárendelést.";
        } finally {
            mentesFolyamatban = false;
            adatlap.inert = false;
            megse.disabled = valaszto.disabled = false;
            gomb.disabled = !valaszto.value;
        }
    }

    urlap.addEventListener("submit", event => {
        event.preventDefault();
        if (!gomb.disabled && valaszto.value) return hozzarendelesMentese(Number(valaszto.value), true);
    });

    adatlap.querySelector("tbody").addEventListener("click", event => {
        const torlesGomb = event.target.closest("button[data-levalasztas]");
        if (!torlesGomb || adatlap.inert) return;
        const id = Number(torlesGomb.dataset.levalasztas);
        const osztaly = hozzarendelt.find(o => Number(o.id) === id);
        if (window.confirm(`Megszünteted ${tanar.display_name} hozzárendelését a(z) ${osztaly.name} osztályhoz?`)) {
            return hozzarendelesMentese(id, false);
        }
    });
}
