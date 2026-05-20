<?php
require 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? '';

if ($action === 'register') {
    // Проверяем, есть ли такой email
    $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $check->execute([$data['email']]);
    if ($check->fetch()) {
        jsonResponse(['error' => 'Этот email уже зарегистрирован'], 400);
    }
    
    // Создаём пользователя
    $hash = password_hash($data['password'], PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
    $stmt->execute([$data['name'], $data['email'], $hash]);
    
    $_SESSION['user_id'] = $pdo->lastInsertId();
    jsonResponse(['ok' => true, 'name' => $data['name']]);
}

if ($action === 'login') {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$data['email']]);
    $user = $stmt->fetch();
    
    if (!$user || !password_verify($data['password'], $user['password'])) {
        jsonResponse(['error' => 'Неверный email или пароль'], 401);
    }
    
    $_SESSION['user_id'] = $user['id'];
    jsonResponse(['ok' => true, 'name' => $user['name'], 'email' => $user['email']]);
}

if ($action === 'me') {
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(null);
    }
    
    $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    jsonResponse($stmt->fetch());
}

if ($action === 'logout') {
    session_destroy();
    jsonResponse(['ok' => true]);
}

jsonResponse(['error' => 'Unknown action'], 400);
?>