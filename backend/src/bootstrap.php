<?php

declare(strict_types=1);

// Közös indítás a HTTP végpontokhoz: session, adatbázis és JSON válasz segédfüggvények.

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/../database/migrate.php';

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// Az adatbázis útvonala felülírható környezeti változóval, egyébként az alapértelmezett fájl.
function getDb(): PDO
{
    $path = getenv('AFPL_DB_PATH') ?: DEFAULT_DB_PATH;

    return migrate($path);
}

function jsonResponse(int $status, array $body): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

// A kérés JSON törzse tömbként (hibás vagy hiányzó törzsnél üres tömb).
function jsonRequestBody(): array
{
    $data = json_decode((string) file_get_contents('php://input'), true);

    return is_array($data) ? $data : [];
}

function requireMethod(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        header('Allow: ' . $method);
        jsonResponse(405, ['error' => 'Nem engedélyezett metódus']);
    }
}
