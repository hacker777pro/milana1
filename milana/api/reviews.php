<?php
require 'db.php';

// Создаём таблицу отзывов
$pdo->exec("
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
");

$action = $_GET['action'] ?? '';

if ($action === 'add') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("INSERT INTO reviews (product_id, name, rating, text) VALUES (?, ?, ?, ?)");
    $stmt->execute([$data['product_id'], $data['name'], $data['rating'], $data['text']]);
    jsonResponse(['ok' => true]);
}

// Получение отзывов
$productId = $_GET['product_id'] ?? 0;
$stmt = $pdo->prepare("SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC");
$stmt->execute([$productId]);
jsonResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
?>