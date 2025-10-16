<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$cleaners = readJson(CLEANERS_FILE);
$logs = readJson(LOGS_FILE);

$result = [];
foreach ($cleaners as $cleaner) {
    if (!isset($cleaner['id'], $cleaner['name'])) {
        continue;
    }
    $state = getCleanerState((string) $cleaner['id'], $logs);
    $result[] = array_merge($cleaner, $state);
}

respondJson($result);
