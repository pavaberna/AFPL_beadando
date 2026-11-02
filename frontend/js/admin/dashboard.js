export function dashboardTartalma(adatok) {
    console.log("Dashboard feldolgozása:", adatok);

    const hely = document.querySelector("#admin-tartalom");

    if (!hely) return;

    hely.innerHTML = `
        <h2>Admin Dashboard</h2>

        <div class="grid grid-2">
            <p class="card admin-card">
                Tanárok
                <strong id="tanarok-szama">${adatok.tanarokSzama}</strong>
            </p>

            <p class="card admin-card">
                Osztályok
                <strong id="osztalyok-szama">${adatok.osztalyokSzama}</strong>
            </p>
        </div>
    `;
}