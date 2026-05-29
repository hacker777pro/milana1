<?php
session_start();
header('Content-Type: application/json');

$dbPath = __DIR__ . '/../data/milana.db';

try {
    $pdo = new PDO('sqlite:' . $dbPath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    $pdo->exec('PRAGMA journal_mode=WAL;');
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    exit;
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    exit(json_encode($data, JSON_UNESCAPED_UNICODE));
}
?>