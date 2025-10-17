<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respondError('Method not allowed.', 405);
}

$originalLogs = readJson(LOGS_FILE);
$logs = pruneOldLogs($originalLogs);

if (count($logs) !== count($originalLogs)) {
    writeJson(LOGS_FILE, $logs);
}

$monthParam = isset($_GET['month']) ? trim((string) $_GET['month']) : '';
if ($monthParam !== '') {
    $start = DateTimeImmutable::createFromFormat('!Y-m', $monthParam);
    if (!$start) {
        respondError('Invalid month format. Use YYYY-MM.', 400);
    }
    $end = $start->modify('+1 month');

    $logs = array_values(array_filter($logs, static function (array $entry) use ($start, $end) {
        $timestamp = $entry['timestamp'] ?? null;
        if (!is_string($timestamp) || $timestamp === '') {
            return false;
        }

        try {
            $time = new DateTimeImmutable($timestamp);
        } catch (\Exception $exception) {
            return false;
        }

        return $time >= $start && $time < $end;
    }));

    header('Content-Disposition: attachment; filename="logs-' . $monthParam . '.json"');
}

usort($logs, static function (array $a, array $b) {
    $aTime = strtotime($a['timestamp'] ?? '') ?: 0;
    $bTime = strtotime($b['timestamp'] ?? '') ?: 0;
    return $aTime <=> $bTime;
});

respondJson($logs);
