const menu = document.getElementById("admin-menu");
const beallitasok = document.getElementById("beallitasok-dialog");
const temaUrlap = document.getElementById("tema-urlap");
const tema = document.getElementById("beallitasok-tema");
const temaHiba = document.getElementById("tema-hiba");
const eredmeny = document.getElementById("felevvaltas-eredmeny");
const megerosites = document.getElementById("felevvaltas-dialog");
const visszaallitas = megerosites.querySelector('button[type="submit"]');
const megse = megerosites.querySelector(".megse");
const hibaHelye = document.getElementById("felevvaltas-hiba");

menu.addEventListener("mouseleave", () => {
    menu.open = false;
});

document.getElementById("beallitasok-gomb").addEventListener("click", () => {
    menu.open = false;
    menu.querySelector("summary").focus();
    tema.value = window.afplTema.lekeres();
    temaHiba.textContent = "";
    eredmeny.textContent = "";
    beallitasok.showModal();
});

temaUrlap.querySelector(".megse").addEventListener("click", () => beallitasok.close());
temaUrlap.addEventListener("submit", event => {
    event.preventDefault();
    try {
        window.afplTema.mentes(tema.value);
        beallitasok.close();
    } catch {
        temaHiba.textContent = "A témát nem sikerült elmenteni ebben a böngészőben.";
    }
});

document.getElementById("felevvaltas-gomb").addEventListener("click", () => {
    hibaHelye.textContent = "";
    eredmeny.textContent = "";
    megerosites.showModal();
});

megse.addEventListener("click", () => megerosites.close());
megerosites.addEventListener("cancel", event => {
    if (visszaallitas.disabled) event.preventDefault();
});

megerosites.querySelector("form").addEventListener("submit", async event => {
    event.preventDefault();
    if (visszaallitas.disabled) return;

    visszaallitas.disabled = true;
    megse.disabled = true;
    hibaHelye.textContent = "";
    try {
        const valasz = await apiRequest({
            url: "backend/public/admin/reset-weights.php",
            method: "POST"
        });
        if (valasz?.ok !== true || !Number.isSafeInteger(valasz.reset_count) || valasz.reset_count < 0) {
            throw new Error("A szerver nem igazolta vissza a félévváltást.");
        }
        megerosites.close();
        eredmeny.textContent = `A félévváltás megtörtént. Érintett diákok száma: ${valasz.reset_count}.`;
        document.querySelector("#admin-tartalom .osztaly-nevsor")?.dispatchEvent(new Event("nevsor-frissites"));
    } catch (hiba) {
        hibaHelye.textContent = hiba.status ? hiba.message : "A félévváltás eredményét nem sikerült ellenőrizni.";
    } finally {
        visszaallitas.disabled = false;
        megse.disabled = false;
    }
});
