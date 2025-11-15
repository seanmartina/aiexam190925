<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respondError('Method not allowed.', 405);
}

$payload = json_decode(file_get_contents('php://input') ?: 'null', true);
if (!is_array($payload)) {
    respondError('Invalid request payload.');
}

$passcode = isset($payload['passcode']) ? trim((string) $payload['passcode']) : '';
if ($passcode === '') {
    respondError('Passcode is required.', 422);
}

if (!verifyPasscode($passcode)) {
    respondError('Incorrect passcode.', 401);
}

$_SESSION['authenticated'] = true;
session_regenerate_id(true);

respondJson([
    'authenticated' => true,
]);
