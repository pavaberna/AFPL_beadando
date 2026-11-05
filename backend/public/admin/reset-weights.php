<?php

declare(strict_types=1);

// POST /admin/reset-weights.php - új félév indulásakor minden diák súlyát visszaállítja a kezdőértékre.
// A kérésnek nincs törzse. A kihúzási előzmények megmaradnak.

require_once __DIR__ . '/../../src/bootstrap.php';
require_once __DIR__ . '/../../src/admin.php';

requireMethod('POST');
requireAdmin();

jsonResponse(200, ['ok' => true, 'reset_count' => resetAllWeights(getDb())]);
