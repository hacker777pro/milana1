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
        SELECT f.id, p.* 
        FROM favorites f 
        JOIN products p ON f.product_id = p.id 
        WHERE f.user_id = ?
    ");
    $stmt->execute([$user_id]);
    jsonResponse($stmt->fetchAll());
}

if ($action === 'toggle') {
    // Проверяем, есть ли уже в избранном
    $check = $pdo->prepare("SELECT id FROM favorites WHERE user_id = ? AND product_id = ?");
    $check->execute([$user_id, $data['product_id']]);
    
    if ($check->fetch()) {
        // Удаляем
        $stmt = $pdo->prepare("DELETE FROM favorites WHERE user_id = ? AND product_id = ?");
        $stmt->execute([$user_id, $data['product_id']]);
        jsonResponse(['ok' => true, 'added' => false]);
    } else {
        // Добавляем
        $stmt = $pdo->prepare("INSERT INTO favorites (user_id, product_id) VALUES (?, ?)");
        $stmt->execute([$user_id, $data['product_id']]);
        jsonResponse(['ok' => true, 'added' => true]);
    }
}

jsonResponse(['error' => 'Invalid action'], 400);
?>