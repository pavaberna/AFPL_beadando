const svgNevter = "http://www.w3.org/2000/svg";
const sugar = 153;
const feliratX = 324;

export function kerekSzeletek(jelenlevok) {
    if (jelenlevok.length < 3) return [];

    const meret = 360 / jelenlevok.length;
    return jelenlevok.map((diak, index) => {
        const [vezeteknev, ...keresztnevek] = diak.name.trim().split(/\s+/);
        const kezdobetuk = keresztnevek.map(nev => nev[0].toLocaleUpperCase("hu") + ".");
        return {
            diak,
            felirat: [vezeteknev, ...kezdobetuk].join(" "),
            kezdet: index * meret,
            kozep: (index + 0.5) * meret,
            veg: (index + 1) * meret
        };
    });
}

function keruletiPont(fok) {
    const radian = fok * Math.PI / 180;
    return [200 + sugar * Math.cos(radian), 229 + sugar * Math.sin(radian)].join(" ");
}

function szeletekRajzolasa(tarcsa, szeletek) {
    tarcsa.replaceChildren();
    return szeletek.map(({ felirat, kezdet, kozep, veg }) => {
        const csoport = document.createElementNS(svgNevter, "g");
        const iv = document.createElementNS(svgNevter, "path");
        iv.setAttribute("d", `M200 229 L${keruletiPont(kezdet)} A${sugar} ${sugar} 0 0 1 ${keruletiPont(veg)}Z`);

        const nev = document.createElementNS(svgNevter, "text");
        nev.setAttribute("x", feliratX);
        nev.setAttribute("y", 229);
        nev.setAttribute("dominant-baseline", "central");
        nev.setAttribute("font-size", Math.min(16, 360 / szeletek.length));
        nev.textContent = felirat;
        csoport.append(iv, nev);
        tarcsa.append(csoport);
        if (nev.getComputedTextLength() > 94) {
            nev.setAttribute("textLength", 94);
            nev.setAttribute("lengthAdjust", "spacingAndGlyphs");
        }
        return { nev, kozep };
    });
}

function szogBeallitasa(tarcsa, feliratok, fok) {
    tarcsa.setAttribute("transform", `rotate(${fok} 200 229)`);
    for (const { nev, kozep } of feliratok) {
        const irany = (kozep + fok) % 360;
        const balOldalon = irany > 90 && irany < 270;
        nev.setAttribute("text-anchor", balOldalon ? "start" : "end");
        nev.setAttribute("transform",
            `rotate(${kozep} 200 229) rotate(${balOldalon ? 180 : 0} ${feliratX} 229)`);
    }
}

async function forgatas(tarcsa, feliratok, kezdet, cel) {
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const indulas = performance.now();
        await new Promise(befejez => {
            function kepkocka(ido) {
                if (!tarcsa.isConnected) return befejez();
                const arany = Math.min(1, Math.max(0, (ido - indulas) / 2400));
                szogBeallitasa(tarcsa, feliratok, kezdet + (cel - kezdet) * (1 - (1 - arany) ** 3));
                if (arany < 1) requestAnimationFrame(kepkocka);
                else befejez();
            }
            requestAnimationFrame(kepkocka);
        });
    }
    szogBeallitasa(tarcsa, feliratok, cel % 360);
}

// Helyi próbasorsolás a #12 API elkészültéig.
function probaNyertesek(jeloltek, darab) {
    const maradek = jeloltek.slice();
    const nyertesek = [];
    while (nyertesek.length < darab) {
        const sulyok = maradek.map(({ diak }) => Math.max(1, Number(diak.weight) || 1));
        let huzas = Math.random() * sulyok.reduce((osszeg, suly) => osszeg + suly, 0);
        const index = sulyok.findIndex(suly => (huzas -= suly) < 0);
        nyertesek.push(maradek.splice(index, 1)[0]);
    }
    return nyertesek;
}

export function szerencsekerekLetrehozasa(panel) {
    // Osztályváltáskor a régi tárcsa leválik, így a futó animáció is leáll.
    const regiTarcsa = panel.querySelector(".kerek-szeletek");
    const tarcsa = regiTarcsa.cloneNode(false);
    regiTarcsa.replaceWith(tarcsa);
    const gomb = panel.querySelector("button");
    gomb.onclick = null;

    return function jelenlevokBeallitasa(jelenlevok, porgetesInditasa) {
        const szeletek = kerekSzeletek(jelenlevok);
        const feliratok = szeletekRajzolasa(tarcsa, szeletek);
        szogBeallitasa(tarcsa, feliratok, 0);
        let szog = 0;
        let nyertesek;
        let automatikus;
        gomb.disabled = false;

        gomb.onclick = async () => {
            if (!nyertesek) {
                const beallitasok = porgetesInditasa(szeletek.length);
                if (!beallitasok) return;
                automatikus = beallitasok.automatikus;
                nyertesek = probaNyertesek(szeletek, beallitasok.darab);
            }
            gomb.disabled = true;
            do {
                const nyertes = nyertesek.shift();
                const cel = szog + 720 + (720 - nyertes.kozep - szog) % 360;
                await forgatas(tarcsa, feliratok, szog, cel);
                if (!tarcsa.isConnected) return;
                szog = cel % 360;
                console.log(nyertes.diak.name);
                if (automatikus && nyertesek.length) {
                    await new Promise(folytatas => setTimeout(folytatas, 450));
                    if (!tarcsa.isConnected) return;
                }
            } while (automatikus && nyertesek.length);
            gomb.disabled = nyertesek.length === 0;
        };
    };
}
