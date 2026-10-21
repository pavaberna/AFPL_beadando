<?php

declare(strict_types=1);

// Diáksorsoló - session alapú hitelesítés (admin / teacher szerepkör)

const SESSION_USER_KEY = 'user';

// Érvényes jelszóhash, amivel ismeretlen felhasználónál is lefut a jelszóellenőrzés,
// így a válaszidőből nem derül ki, hogy létezik-e a felhasználónév.
const DUMMY_PASSWORD_HASH = '$2y$10$r/J0ommltZ4X8RfLke85lO71bMCLg.X33R6VYJWesmWqVGxuyHjX.';

// Ellenőrzi a belépési adatokat. Siker esetén elmenti a felhasználót a sessionbe és visszaadja
// (jelszóhash nélkül), hibás adatoknál null-t ad vissza.
function login(PDO $db, string $username, string $password): ?array
{
    $stmt = $db->prepare('SELECT id, username, password_hash, display_name, role FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    $hash = $row !== false ? $row['password_hash'] : DUMMY_PASSWORD_HASH;
    $passwordOk = password_verify($password, $hash);

    if ($row === false || !$passwordOk) {
        return null;
    }

    $user = [
        'id' => (int) $row['id'],
        'username' => $row['username'],
        'display_name' => $row['display_name'],
        'role' => $row['role'],
    ];

    // Session fixation ellen: belépéskor új session azonosító kell.
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }
    $_SESSION[SESSION_USER_KEY] = $user;

    return $user;
}

// Törli a bejelentkezett felhasználót, és ha fut session, azt is megszünteti.
function logout(): void
{
    unset($_SESSION[SESSION_USER_KEY]);

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
}

// A bejelentkezett felhasználó, vagy null, ha nincs belépve.
function currentUser(): ?array
{
    return $_SESSION[SESSION_USER_KEY] ?? null;
}

// Igaz, ha van bejelentkezett felhasználó, és (ha megadtuk) a szerepköre egyezik.
function isAuthorized(?string $role = null): bool
{
    $user = currentUser();

    return $user !== null && ($role === null || $user['role'] === $role);
}
