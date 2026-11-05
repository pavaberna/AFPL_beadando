window.afplTema = (() => {
    const sotetStiluslap = document.getElementById("tema-sotet");
    const kulcs = "afpl-tema";
    const keziTemak = ["light", "dark", "colorful"];
    let szinesStiluslap;

    function lekeres() {
        try {
            const tema = localStorage.getItem(kulcs);
            if (keziTemak.includes(tema)) return tema;
        } catch {
            // Tiltott tárolásnál a böngésző beállítása az alapértelmezés.
        }
        return "default";
    }

    function alkalmazas(tema) {
        const sotetFeltetelek = {
            default: "(prefers-color-scheme: dark)",
            dark: "all",
            light: "not all",
            colorful: "not all"
        };
        sotetStiluslap.media = sotetFeltetelek[tema];

        if (tema === "colorful" && !szinesStiluslap) {
            szinesStiluslap = document.createElement("link");
            szinesStiluslap.rel = "stylesheet";
            szinesStiluslap.href = new URL("tema-szines.css", sotetStiluslap.href).href;
            sotetStiluslap.after(szinesStiluslap);
        }
        if (szinesStiluslap) {
            szinesStiluslap.media = tema === "colorful" ? "all" : "not all";
        }
    }

    function frissites() {
        alkalmazas(lekeres());
    }

    function mentes(tema) {
        if (tema === "default") {
            localStorage.removeItem(kulcs);
        } else if (keziTemak.includes(tema)) {
            localStorage.setItem(kulcs, tema);
        } else {
            throw new Error("Ismeretlen téma.");
        }
        alkalmazas(tema);
    }

    frissites();
    window.addEventListener("pageshow", frissites);
    window.addEventListener("storage", event => {
        if (event.key === kulcs || event.key === null) frissites();
    });

    return { lekeres, mentes };
})();
