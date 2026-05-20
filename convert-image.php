<?php
$imagePath = 'images/darling-wet-kiss.jpg';
if (file_exists($imagePath)) {
    $imageData = base64_encode(file_get_contents($imagePath));
    echo 'data:image/jpeg;base64,' . $imageData;
} else {
    echo 'Файл не найден!';
}
?>