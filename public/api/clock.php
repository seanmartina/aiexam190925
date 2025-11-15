<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

requireAuthentication();

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respondError('Method not allowed.', 405);
}

$payload = json_decode(file_get_contents('php://input') ?: 'null', true);
if (!is_array($payload)) {
    respondError('Invalid request payload.');
}

$cleanerId = isset($payload['cleanerId']) ? trim((string) $payload['cleanerId']) : '';
$action = isset($payload['action']) ? trim((string) $payload['action']) : '';

if ($cleanerId === '') {
    respondError('Cleaner ID is required.');
}

$cleaners = readJson(CLEANERS_FILE);
$cleaner = null;
foreach ($cleaners as $item) {
    if (($item['id'] ?? '') === $cleanerId) {
        $cleaner = $item;
        break;
    }
}

if ($cleaner === null) {
    respondError('Cleaner not found.', 404);
}

$logs = pruneOldLogs(readJson(LOGS_FILE));
$state = getCleanerState($cleanerId, $logs);

$nextAction = $action !== '' ? $action : ($state['status'] === 'clocked-in' ? 'clock-out' : 'clock-in');
if (!in_array($nextAction, ['clock-in', 'clock-out'], true)) {
    respondError('Invalid action.');
}

$entry = buildLogEntry($cleanerId, (string) $cleaner['name'], $nextAction);
$logs[] = $entry;
$logs = pruneOldLogs($logs);
writeJson(LOGS_FILE, $logs);

$response = array_merge($entry, [
    'status' => $nextAction === 'clock-in' ? 'clocked-in' : 'clocked-out',
]);

respondJson($response);
