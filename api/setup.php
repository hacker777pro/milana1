<?php
require 'db.php';

$pdo->exec("
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    volume TEXT,
    description TEXT,
    usage TEXT,
    ingredients TEXT,
    image_url TEXT
);

CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    qty INTEGER DEFAULT 1,
    UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    UNIQUE(user_id, product_id)
);
");

$count = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();

if ($count == 0) {
    $stmt = $pdo->prepare("INSERT INTO products (name, brand, category, price, volume, description, usage, ingredients, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    // Уходовая косметика
 $stmt->execute([
    'Гель очищающий Sensibio', 'Bioderma', 'care', 1290, '200 мл',
    'Мягкий очищающий гель для чувствительной кожи.',
    'Нанесите на влажную кожу лица, помассируйте, смойте водой.',
    'Aqua, Sodium Laureth Sulfate, Coco-Betaine',
    'images/bioderma-sensibio.jpg'
]);

$stmt->execute([
    'Сыворотка RETINOL SHOT TIGHTENING', 'Celimax', 'care', 1890, '30 мл',
    'Антивозрастная сыворотка с ретинолом.',
    'Наносите вечером на очищенную кожу.',
    'Water, Glycerin, Retinol, Niacinamide',
   'images/celimax-retinol.jpg'
]);

$stmt->execute([
    'Освежающий тоник AHA-acids', 'Гельтек', 'care', 1450, '150 мл',
    'Тоник с AHA-кислотами для мягкого пилинга.',
    'Протрите лицо ватным диском после очищения.',
    'Aqua, Glycolic Acid, Lactic Acid',
    'images/geltek-aha.jpg'
]);

$stmt->execute([
    'Тушь Telescopic', 'L\'Oreal Paris', 'makeup', 890, '7.2 мл',
    'Тушь для удлинения ресниц.',
    'Наносите от корней к кончикам.',
    'Aqua, Paraffin, Potassium Cetyl Phosphate',
    'images/loreal-telescopic.jpg'
]);

$stmt->execute([
    'Тональный крем Velvet Cover', 'SHIKstudio', 'makeup', 1590, '30 мл',
    'Стойкий тональный крем с матовым финишем.',
    'Распределите кистью или спонжем.',
    'Water, Cyclopentasiloxane, Dimethicone',
    'images/shik-velvet.jpg'
]);

$stmt->execute([
    'Помама Wet Kiss', 'DARLING', 'makeup', 790, '3.5 г',
    'Помама с эффектом увеличения губ.',
    'Наносите непосредственно из стика.',
    'Octyldodecanol, Polyethylene',
    'images/darling-wet-kiss.jpg'
]);
    
    echo '✅ База создана! Добавлено 6 товаров с картинками.';
} else {
    echo 'ℹ️ База уже существует. Товаров: ' . $count;
}
?>