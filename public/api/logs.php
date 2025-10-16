<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$logs = readJson(LOGS_FILE);
respondJson($logs);
