
// Az egyes nézetek beállításai.
const nezetek = {
    osztalyok: {
        cim: "Osztályok",
        url: "./mock/classes.json",
        tartalomKeszito: osztalyokTartalma
    },

    tanarok: {
        cim: "Tanárok",
        url: "./mock/users.json",
        szuro: felhasznalo => felhasznalo.role === "teacher",
        tartalomKeszito: tanarokTartalma
    },

    diakok: {
        cim: "Diákok",
        url: "./mock/students.json",
        tartalomKeszito: diakokTartalma
    }
};

const nezetTaroloKulcs = "admin-aktiv-nezet";
let betoltesFolyamatban = false;


// Az összes nézetválasztó gomb letiltása vagy engedélyezése.
function nezetGombokTiltasa(tiltva) {
    document.querySelectorAll("button[data-nezet]").forEach(gomb => {
        gomb.disabled = tiltva;
    });
}


// Megjeleníti a címet és alatta az egyedi tartalmat.
function tartalomMegjelenitese(hely, cim, adatok, tartalomKeszito) {
    const fejlec = document.createElement("h2");
    fejlec.textContent = cim;

    hely.replaceChildren(fejlec);

    if (adatok.length === 0) {
        const uzenet = document.createElement("p");
        uzenet.textContent = "Nincs megjeleníthető adat.";
        hely.append(uzenet);
        return;
    }

    // A teljes adattömböt átadjuk az egyedi megjelenítőnek.
    const egyediTartalom = tartalomKeszito(adatok);

    // Az elkészült HTML-elemet a cím alá illesztjük.
    hely.append(egyediTartalom);
}


// Lekéri, szükség esetén szűri, majd megjeleníti az adatokat.
async function nezetMegnyitasa(nezetNev) {
    if (!Object.hasOwn(nezetek, nezetNev)) return;
    if (betoltesFolyamatban) return;

    const hely = document.querySelector("#admin-tartalom");

    if (!hely) return;

    const nezet = nezetek[nezetNev];

    betoltesFolyamatban = true;
    nezetGombokTiltasa(true);
    hely.textContent = "Betöltés…";

    try {
        // Megjegyezzük a kiválasztott nézetet.
        // Ha a tárolás tiltott, az adatlekérés akkor is működik.
        try {
            sessionStorage.setItem(nezetTaroloKulcs, nezetNev);
        } catch (error) {
            console.warn(
                "A kiválasztott nézet nem jegyezhető meg.",
                error
            );
        }

        // onError nélkül az apiRequest továbbadja a hibát
        // a lenti catch ágnak.
        await apiRequest({
            url: nezet.url,
            cache: "no-store",

            onSuccess: adatok => {
                if (!Array.isArray(adatok)) {
                    throw new Error("A válaszban tömböt vártunk.");
                }

                // Csak akkor szűrünk, ha van megadott szűrő.
                const szurtAdatok = nezet.szuro
                    ? adatok.filter(nezet.szuro)
                    : adatok;

                tartalomMegjelenitese(
                    hely,
                    nezet.cim,
                    szurtAdatok,
                    nezet.tartalomKeszito
                );
            }
        });
    } catch (error) {
        hely.textContent = "Az adatokat nem sikerült betölteni.";
        console.error(error);
    } finally {
        betoltesFolyamatban = false;
        nezetGombokTiltasa(false);
    }
}



function osztalyokTartalma(osztalyok) {
    const tartalom = document.createElement("div");

    // !!! osztályok lista összeállítása
    console.log(osztalyok)

    return tartalom;
}


function tanarokTartalma(tanarok) {
    const tartalom = document.createElement("div");

    // !!! tanarok lista összeállítása 
    console.log(tanarok)        

    return tartalom;
}


function diakokTartalma(diakok) {
    const tartalom = document.createElement("div");

    // !!! diakok lista összeállítása
    console.log(diakok)

    return tartalom;
}


// Közös kattintáskezelő.
// A később beillesztett gombokkal is működik.
document.addEventListener("click", event => {
    const gomb = event.target.closest("button[data-nezet]");

    if (!gomb || gomb.disabled) return;

    event.preventDefault();

    nezetMegnyitasa(gomb.dataset.nezet);
});


// Oldalfrissítés után visszatöltjük az utolsó nézetet.
// Az adatokat újra lekérjük.
try {
    const mentettNezet = sessionStorage.getItem(nezetTaroloKulcs);

    if (mentettNezet) {
        nezetMegnyitasa(mentettNezet);
    }
} catch (error) {
    console.warn(
        "A korábban kiválasztott nézet nem olvasható ki.",
        error
    );
}