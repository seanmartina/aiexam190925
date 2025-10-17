<?php
declare(strict_types=1);

header('Content-Type: application/json');

define('DATA_DIR', resolveDataDirectory());
define('CLEANERS_FILE', DATA_DIR . '/cleaners.json');
define('LOGS_FILE', DATA_DIR . '/logs.json');

ensureDataFiles();

function resolveDataDirectory(): string
{
    $candidates = [
        dirname(__DIR__, 2) . '/data',
        __DIR__ . '/../data',
    ];

    foreach ($candidates as $candidate) {
        if (is_dir($candidate)) {
            return $candidate;
        }
        if (!file_exists($candidate) && @mkdir($candidate, 0775, true)) {
            return $candidate;
        }
    }

    throw new RuntimeException('Unable to locate or create data directory.');
}

function ensureDataFiles(): void
{
    foreach ([CLEANERS_FILE, LOGS_FILE] as $file) {
        $dir = dirname($file);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Failed to create data directory: ' . $dir);
        }
        if (!file_exists($file)) {
            file_put_contents($file, $file === LOGS_FILE ? '[]' : "[]\n", LOCK_EX);
        }
    }
}

function readJson(string $filePath): array
{
    if (!file_exists($filePath)) {
        return [];
    }
    $contents = file_get_contents($filePath);
    if ($contents === false || $contents === '') {
        return [];
    }
    $data = json_decode($contents, true);
    return is_array($data) ? $data : [];
}

function writeJson(string $filePath, array $data): void
{
    $encoded = json_encode($data, JSON_PRETTY_PRINT);
    if ($encoded === false) {
        throw new RuntimeException('Failed to encode data.');
    }

    $handle = fopen($filePath, 'c+');
    if ($handle === false) {
        throw new RuntimeException('Unable to open file for writing: ' . $filePath);
    }

    try {
        if (!flock($handle, LOCK_EX)) {
            throw new RuntimeException('Unable to obtain file lock for: ' . $filePath);
        }
        ftruncate($handle, 0);
        fwrite($handle, $encoded);
        fflush($handle);
        flock($handle, LOCK_UN);
    } finally {
        fclose($handle);
    }
}

function respondJson(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function respondError(string $message, int $status = 400): void
{
    respondJson(['message' => $message], $status);
}

function getCleanerState(string $cleanerId, array $logs): array
{
    $state = [
        'status' => 'clocked-out',
        'lastAction' => null,
        'lastTimestamp' => null,
    ];

    for ($i = count($logs) - 1; $i >= 0; $i--) {
        $entry = $logs[$i];
        if (($entry['cleanerId'] ?? null) === $cleanerId) {
            $state['lastAction'] = $entry['action'] ?? null;
            $state['lastTimestamp'] = $entry['timestamp'] ?? null;
            $state['status'] = ($entry['action'] ?? null) === 'clock-in' ? 'clocked-in' : 'clocked-out';
            break;
        }
    }

    return $state;
}

function buildLogEntry(string $cleanerId, string $cleanerName, string $action): array
{
    $timestamp = gmdate('c');
    return [
        'id' => uniqid((string) time(), true),
        'cleanerId' => $cleanerId,
        'cleanerName' => $cleanerName,
        'action' => $action,
        'timestamp' => $timestamp,
    ];
}

function pruneOldLogs(array $logs, int $monthsToKeep = 12): array
{
    if ($monthsToKeep <= 0) {
        return array_values($logs);
    }

    $cutoff = (new DateTimeImmutable('now'))->modify(sprintf('-%d months', $monthsToKeep));
    if ($cutoff === false) {
        return array_values($logs);
    }

    $cutoffTimestamp = $cutoff->getTimestamp();
    $filtered = [];

    foreach ($logs as $entry) {
        $timestamp = $entry['timestamp'] ?? null;
        if (!is_string($timestamp) || $timestamp === '') {
            continue;
        }

        try {
            $entryTime = new DateTimeImmutable($timestamp);
        } catch (\Exception $exception) {
            continue;
        }

        if ($entryTime->getTimestamp() >= $cutoffTimestamp) {
            $filtered[] = $entry;
        }
    }

    return array_values($filtered);
}

function generateCleanerId(string $name, array $existingIds): string
{
    $existing = array_map('strval', $existingIds);
    $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $name) ?? '', '-'));
    if ($slug === '') {
        $slug = 'cleaner';
    }

    $candidate = $slug;
    $suffix = 1;
    while (in_array($candidate, $existing, true)) {
        $candidate = $slug . '-' . $suffix;
        $suffix++;
    }

    return $candidate;
}
