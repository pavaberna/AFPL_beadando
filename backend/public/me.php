<?php

declare(strict_types=1);

// GET /me.php - a bejelentkezett felhasználó lekérdezése (pl. oldalbetöltéskor)

require_once __DIR__ . '/../src/bootstrap.php';

requireMethod('GET');

$user = currentUser();

if ($user === null) {
    jsonResponse(401, ['error' => 'Nincs bejelentkezve']);
}

jsonResponse(200, ['user' => $user]);
