<?php

declare(strict_types=1);

// POST /teacher/settings.php  {"display_name": "..."} - a bejelentkezett tanár nevének módosítása

require_once __DIR__ . '/../../src/bootstrap.php';
require_once __DIR__ . '/../../src/admin.php';
require_once __DIR__ . '/../../src/teacher.php';

requireMethod('POST');
requireTeacher();

$displayName = cleanString(jsonRequestBody()['display_name'] ?? null);

if ($displayName === null) {
    jsonResponse(400, ['error' => 'A név megadása kötelező']);
}

if (!isValidDisplayName($displayName)) {
    jsonResponse(400, ['error' => 'A név egysoros, legfeljebb ' . MAX_DISPLAY_NAME_LENGTH . ' karakter hosszú lehet']);
}

if (!updateTeacherDisplayName(getDb(), (int) currentUser()['id'], $displayName)) {
    jsonResponse(404, ['error' => 'A felhasználó nem található']);
}

jsonResponse(200, ['user' => setCurrentUserDisplayName($displayName)]);
