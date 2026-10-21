<?php

declare(strict_types=1);

// POST /logout.php

require_once __DIR__ . '/../src/bootstrap.php';

requireMethod('POST');

logout();

jsonResponse(200, ['ok' => true]);
