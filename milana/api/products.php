<?php
require 'db.php';
header('Content-Type: application/json');

// Если запрашиваем конкретный товар по ID
if (isset($_GET['id']) && !empty($_GET['id'])) {
    $stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id");
    $stmt->execute(['id' => (int)$_GET['id']]);
    echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
    exit;
}

// Основной запрос с фильтрами
$sql = "SELECT * FROM products WHERE 1=1";
$params = [];

if (isset($_GET['category']) && $_GET['category'] !== '') {
    $sql .= " AND category = :category";
    $params[':category'] = $_GET['category'];
}

if (isset($_GET['brand']) && $_GET['brand'] !== '') {
    $sql .= " AND brand = :brand";
    $params[':brand'] = $_GET['brand'];
}

if (isset($_GET['search']) && $_GET['search'] !== '') {
    $sql .= " AND (name LIKE :search OR brand LIKE :search OR description LIKE :search)";
    $params[':search'] = '%' . $_GET['search'] . '%';
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>