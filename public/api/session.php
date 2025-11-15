<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respondError('Method not allowed.', 405);
}

respondJson([
    'authenticated' => isAuthenticated(),
]);
