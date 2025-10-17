<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

switch ($method) {
    case 'GET':
        handleGetCleaners();
        break;
    case 'POST':
        handleCreateCleaner();
        break;
    case 'DELETE':
        handleDeleteCleaner();
        break;
    default:
        respondError('Method not allowed.', 405);
}

function handleGetCleaners(): void
{
    $cleaners = readJson(CLEANERS_FILE);
    $allLogs = readJson(LOGS_FILE);
    $logs = pruneOldLogs($allLogs);

    if (count($logs) !== count($allLogs)) {
        writeJson(LOGS_FILE, $logs);
    }

    $result = [];
    foreach ($cleaners as $cleaner) {
        if (!isset($cleaner['id'], $cleaner['name'])) {
            continue;
        }
        $state = getCleanerState((string) $cleaner['id'], $logs);
        $result[] = array_merge($cleaner, $state);
    }

    respondJson($result);
}

function handleCreateCleaner(): void
{
    $payload = json_decode(file_get_contents('php://input') ?: 'null', true);
    if (!is_array($payload)) {
        respondError('Invalid request payload.');
    }

    $name = isset($payload['name']) ? trim((string) $payload['name']) : '';
    if ($name === '') {
        respondError('Cleaner name is required.');
    }

    $cleaners = readJson(CLEANERS_FILE);
    foreach ($cleaners as $cleaner) {
        if (strcasecmp((string) ($cleaner['name'] ?? ''), $name) === 0) {
            respondError('A cleaner with that name already exists.', 409);
        }
    }

    $id = generateCleanerId($name, array_column($cleaners, 'id'));
    $cleaner = [
        'id' => $id,
        'name' => $name,
    ];

    $cleaners[] = $cleaner;
    writeJson(CLEANERS_FILE, $cleaners);

    respondJson($cleaner, 201);
}

function handleDeleteCleaner(): void
{
    $payload = json_decode(file_get_contents('php://input') ?: 'null', true);
    $id = isset($_GET['id']) ? trim((string) $_GET['id']) : '';
    if ($id === '' && is_array($payload)) {
        $id = trim((string) ($payload['id'] ?? ''));
    }

    if ($id === '') {
        respondError('Cleaner ID is required.', 400);
    }

    $cleaners = readJson(CLEANERS_FILE);
    $remaining = [];
    $deleted = null;

    foreach ($cleaners as $cleaner) {
        if (($cleaner['id'] ?? null) === $id) {
            $deleted = $cleaner;
            continue;
        }
        $remaining[] = $cleaner;
    }

    if ($deleted === null) {
        respondError('Cleaner not found.', 404);
    }

    writeJson(CLEANERS_FILE, $remaining);
    respondJson(['id' => $id, 'message' => 'Cleaner removed.']);
}
