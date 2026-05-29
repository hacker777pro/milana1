<?php
require 'db.php';

if (!isset($_SESSION['user_id'])) {
    jsonResponse(['error' => 'Необходима авторизация'], 401);
}

$data = json_decode(file_get_contents('php://input'), true);
$user_id = $_SESSION['user_id'];
$action = $_GET['action'] ?? 'get';

if ($action === 'get') {
    $stmt = $pdo->prepare("
        SELECT c.id, c.qty, p.* 
        FROM cart c 
        JOIN products p ON c.product_id = p.id 
        WHERE c.user_id = ?
    ");
    $stmt->execute([$user_id]);
    jsonResponse($stmt->fetchAll());
}

if ($action === 'add') {
    $qty = isset($data['qty']) ? (int)$data['qty'] : 1;
    if ($qty < 1) $qty = 1;
    if ($qty > 99) $qty = 99;
    
    $stmt = $pdo->prepare("INSERT INTO cart (user_id, product_id, qty) VALUES (?, ?, ?) ON CONFLICT(user_id, product_id) DO UPDATE SET qty = qty + ?");
    $stmt->execute([$user_id, $data['product_id'], $qty, $qty]);
    jsonResponse(['ok' => true]);
}

if ($action === 'update') {
    $stmt = $pdo->prepare("UPDATE cart SET qty = ? WHERE id = ? AND user_id = ?");
    $stmt->execute([$data['qty'], $data['cart_id'], $user_id]);
    jsonResponse(['ok' => true]);
}

if ($action === 'remove') {
    $stmt = $pdo->prepare("DELETE FROM cart WHERE id = ? AND user_id = ?");
    $stmt->execute([$data['cart_id'], $user_id]);
    jsonResponse(['ok' => true]);
}

if ($action === 'clear') {
    $stmt = $pdo->prepare("DELETE FROM cart WHERE user_id = ?");
    $stmt->execute([$user_id]);
    jsonResponse(['ok' => true]);
}

jsonResponse(['error' => 'Invalid action'], 400);
?>