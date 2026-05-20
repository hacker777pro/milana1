<?php
require 'db.php';

$id = $_GET['id'] ?? null;
$category = $_GET['category'] ?? '';
$subcategory = $_GET['subcategory'] ?? '';
$search = $_GET['search'] ?? '';

// Если запрошен один товар
if ($id) {
    $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse($stmt->fetch());
}

// Список товаров с фильтрами
$sql = "SELECT * FROM products WHERE 1=1";
$params = [];

if ($category) {
    $sql .= " AND category = ?";
    $params[] = $category;
}

if ($subcategory) {
    $sql .= " AND subcategory = ?";
    $params[] = $subcategory;
}

if ($search) {
    $sql .= " AND (name LIKE ? OR brand LIKE ? OR description LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
jsonResponse($stmt->fetchAll());
?>