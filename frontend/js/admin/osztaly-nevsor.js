import {
    diakokLekerese, diakokImportalasa, diakModositasa, diakTorlese,
    osztalyokLekerese, tanarokLekerese, osztalyTanarhozRendelese
} from "./adatok.js";
import { htmlEscape } from "./kozos.js";

document.addEventListener("click", event => {
    const gomb = event.target.closest('button[data-muvelet="osztaly-info"]');
    if (gomb) nevsorMegnyitasa(Number(gomb.dataset.osztalyId));
});

function ikongomb(muvelet, ikon, cim, id, extra = "") {
    return `<button type="button" class="btn-img" data-muvelet="${muvelet}" data-id="${id}"
        title="${htmlEscape(cim)}" aria-label="${htmlEscape(cim)}" ${extra}>
        <img class="icon" src="img/${ikon}.png" alt="">
    </button>`;
}

function valasztasiLehetoseg(ertek, felirat, kijelolt = false) {
    return `<option value="${Number(ertek)}" ${kijelolt ? "selected" : ""}>${htmlEscape(felirat)}</option>`;
}

// A párbeszédablak a névsorhoz tartozik. Sikertelen mentéskor nyitva marad.
function urlapMegnyitasa(panel, cim, mezok, mentes, frissites, gombFelirat = "Mentés") {
    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-labelledby", "nevsor-dialog-cim");
    dialog.innerHTML = `<h2 id="nevsor-dialog-cim">${htmlEscape(cim)}</h2>
        <form autocomplete="off">${mezok}<p role="alert"></p>
            <div class="urlap-gombok"><button type="button" class="megse">Mégse</button>
            <button type="submit">${htmlEscape(gombFelirat)}</button></div>
        </form>`;
    panel.append(dialog);
    const urlap = dialog.querySelector("form");
    const megse = urlap.querySelector('button[type="button"]');
    const mentesGomb = urlap.querySelector('button[type="submit"]');
    megse.onclick = () => dialog.close();
    dialog.onclose = () => dialog.remove();
    dialog.oncancel = event => { if (mentesGomb.disabled) event.preventDefault(); };
    urlap.onsubmit = async event => {
        event.preventDefault();
        if (mentesGomb.disabled) return;
        mentesGomb.disabled = megse.disabled = true;
        try {
            await mentes(new FormData(urlap));
        } catch (hiba) {
            urlap.querySelector('[role="alert"]').textContent = hiba.message;
            mentesGomb.disabled = megse.disabled = false;
            return;
        }
        dialog.close();
        await frissites();
    };
    dialog.showModal();
}

function diakAdatlap(panel, diak, osztalyok, frissites) {
    const opciok = osztalyok.map(o =>
        valasztasiLehetoseg(o.id, o.name, Number(o.id) === Number(diak.class_id))
    ).join("");
    const mezok = `<p>Azonosító: ${htmlEscape(diak.id)}</p>
        <p>Felvéve: ${htmlEscape(diak.created_at)}</p>
        <p><label>Név <input name="name" required value="${htmlEscape(diak.name)}"></label></p>
        <p><label>Súly <input name="weight" type="number" min="1" step="1" required value="${htmlEscape(diak.weight)}"></label></p>
        <p><label>Osztály <select name="class_id" required>${opciok}</select></label></p>`;

    urlapMegnyitasa(panel, diak.name, mezok, async adatok => {
        const nev = adatok.get("name").trim();
        const suly = Number(adatok.get("weight"));
        const osztalyId = Number(adatok.get("class_id"));
        if (!nev) throw new Error("A diák neve kötelező.");
        if (!Number.isSafeInteger(suly) || suly < 1) throw new Error("A súly legalább 1 egész szám legyen.");

        const valtozas = {};
        if (nev !== diak.name) valtozas.name = nev;
        if (suly !== Number(diak.weight)) valtozas.weight = suly;
        if (osztalyId !== Number(diak.class_id)) valtozas.class_id = osztalyId;
        if (Object.keys(valtozas).length) await diakModositasa(Number(diak.id), valtozas);
    }, frissites);
}

function nevsorMegnyitasa(osztalyId) {
    const panel = document.createElement("section");
    document.querySelector("#admin-tartalom").replaceChildren(panel);
    let sorszam = 0;
    let diakok, osztalyok, tanarok, osztaly;
    let importUzenet = "";

    async function frissites() {
        const keres = ++sorszam;
        panel.textContent = "Névsor betöltése…";
        try {
            const adatok = await Promise.all([
                diakokLekerese(osztalyId), osztalyokLekerese(), tanarokLekerese()
            ]);
            if (keres !== sorszam || !panel.isConnected) return;
            [diakok, osztalyok, tanarok] = adatok;
            osztaly = osztalyok.find(o => Number(o.id) === osztalyId);
            if (!osztaly) throw new Error("Az osztály már nem található.");
            kirajzolas();
        } catch (hiba) {
            if (keres !== sorszam) return;
            panel.textContent = hiba.message + " ";
            const ujra = document.createElement("button");
            ujra.textContent = "Újrapróbálás";
            ujra.onclick = frissites;
            panel.append(ujra);
        }
    }

    function kirajzolas() {
        const diakSorok = diakok.map(d => `<tr><td>${htmlEscape(d.name)}</td>
            <td>${ikongomb("diak-info", "info", d.name + " adatai", Number(d.id))}</td>
            <td>${ikongomb("diak-torles", "delete", d.name + " törlése", Number(d.id))}</td></tr>`).join("");
        const tanarSorok = osztaly.teachers.map(t => {
            const tanar = tanarok.find(adat => Number(adat.id) === Number(t.id));
            return `<tr><td>${htmlEscape(tanar?.username ?? "—")}</td><td>${htmlEscape(t.display_name)}</td>
                <td>${ikongomb("tanar-levalasztas", "delete", t.display_name + " hozzárendelésének törlése", Number(t.id))}</td></tr>`;
        }).join("");
        const vanSzabadTanar = szabadTanarok().length > 0;
        panel.innerHTML = `
            <div class="nevsor-fejlec">
                <h2>${htmlEscape(osztaly.name)} – ${diakok.length ? diakok.length + " fő" : "Nincs tanuló"}</h2>
                <button type="button" data-muvelet="nevsor-import">Névsor importálása</button>
            </div>
            <p class="nevsor-import-uzenet" role="status">${htmlEscape(importUzenet)}</p>
            <div class="nevsor-tablazatok">
                <section>
                    <h3>Osztálynévsor</h3>
                    <table class="card">
                        <thead><tr><th scope="col">Név</th><th scope="col">Info</th><th scope="col">
                            ${ikongomb("diak-hozzaadas", "insert", "Új diák felvétele", osztalyId, `data-osztaly-nev="${htmlEscape(osztaly.name)}"`)}
                        </th></tr></thead>
                        <tbody>${diakSorok || '<tr><td colspan="3">Nincs tanuló.</td></tr>'}</tbody>
                    </table>
                </section>
                <section>
                    <h3>Hozzárendelt tanárok</h3>
                    <table class="card">
                        <thead><tr><th scope="col">Felhasználónév</th><th scope="col">Tanár neve</th><th scope="col">
                            ${ikongomb("tanar-rendeles", "insert", vanSzabadTanar ? "Tanár hozzárendelése" : "Nincs hozzárendelhető tanár", osztalyId, vanSzabadTanar ? "" : "disabled")}
                        </th></tr></thead>
                        <tbody>${tanarSorok || '<tr><td colspan="3">Nincs hozzárendelt tanár.</td></tr>'}</tbody>
                    </table>
                </section>
            </div>`;
    }

    function szabadTanarok() {
        const azonositok = new Set(osztaly.teachers.map(t => Number(t.id)));
        return tanarok.filter(t => !azonositok.has(Number(t.id)));
    }

    panel.addEventListener("nevsor-frissites", frissites);
    panel.addEventListener("click", async event => {
        const gomb = event.target.closest("button[data-muvelet]");
        if (!gomb || gomb.disabled) return;
        const id = Number(gomb.dataset.id);
        const muvelet = gomb.dataset.muvelet;
        if (muvelet === "nevsor-import") {
            const mezok = `<p>UTF-8 kódolású CSV-fájlt válassz. Az első sorban legyen
                <strong>név</strong>, <strong>nev</strong> vagy <strong>name</strong> oszlop.
                Az elválasztó vessző vagy pontosvessző lehet.</p>
                <p><label>Névsorfájl <input type="file" name="file" accept=".csv,text/csv" required></label></p>`;
            urlapMegnyitasa(panel, `Névsor importálása – ${osztaly.name}`, mezok, async adatok => {
                const { imported, skipped } = await diakokImportalasa(osztalyId, adatok);
                importUzenet = imported.length
                    ? `Felvett diákok: ${imported.length}. Kihagyott nevek: ${skipped.length}.`
                    : `Nem került be új diák. Kihagyott nevek: ${skipped.length}.`;
            }, frissites, "Importálás");
            return;
        }
        if (muvelet === "tanar-rendeles") {
            const opciok = szabadTanarok().map(t =>
                valasztasiLehetoseg(t.id, `${t.display_name} (${t.username})`)
            ).join("");
            urlapMegnyitasa(panel, "Tanár hozzárendelése", `<p><label>Tanár <select name="tanar" required>
                <option value="">Válassz tanárt!</option>${opciok}</select></label></p>`,
                adatok => osztalyTanarhozRendelese(Number(adatok.get("tanar")), osztalyId), frissites);
            return;
        }
        if (muvelet === "diak-info") {
            diakAdatlap(panel, diakok.find(d => Number(d.id) === id), osztalyok, frissites);
            return;
        }
        if (muvelet !== "diak-torles" && muvelet !== "tanar-levalasztas") return;
        const diakTorles = muvelet === "diak-torles";
        const uzenet = diakTorles
            ? `Törlöd ${diakok.find(d => Number(d.id) === id).name} adatait és sorsolási előzményeit?`
            : `Megszünteted ${osztaly.teachers.find(t => Number(t.id) === id).display_name} hozzárendelését a(z) ${osztaly.name} osztályhoz? A tanári fiók megmarad.`;
        if (!window.confirm(uzenet)) return;
        gomb.disabled = true;
        panel.inert = true;
        try {
            if (diakTorles) await diakTorlese(id);
            else await osztalyTanarhozRendelese(id, osztalyId, false);
            await frissites();
        } catch (hiba) {
            alert(hiba.message);
            gomb.disabled = false;
        } finally {
            panel.inert = false;
        }
    });
    return frissites();
}
