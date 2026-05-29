const API = 'api/';
let currentUser = null;
let currentCategory = '';
let currentBrand = '';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProducts();
    setupNavigation();
    setupSearch();
    updateBadge('favCount');
    updateBadge('cartCount');
});

// === НАВИГАЦИЯ ===
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page + 'Page').classList.add('active');
    if (page === 'cart') loadCart();
    if (page === 'favorites') loadFavorites();
    if (page === 'home') loadProducts();
}

function setupNavigation() {
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.onclick = (e) => {
            if (btn.querySelector('.dropdown-menu')) return;
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.cat;
            currentBrand = '';
            document.getElementById('searchInput').value = '';
            navigateTo('home');
        };
    });

    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.cat-btn[data-cat=""]').classList.add('active');
            currentCategory = '';
            currentBrand = item.dataset.brand;
            navigateTo('home');
        };
    });
}

function setupSearch() {
    const input = document.getElementById('searchInput');
    const clear = document.getElementById('searchClear');
    if (!input) return;
    input.addEventListener('input', () => {
        clear.style.display = input.value ? 'block' : 'none';
        navigateTo('home');
    });
    if (clear) clear.onclick = () => { input.value = ''; clear.style.display = 'none'; navigateTo('home'); };
}

// === API ===
async function fetchApi(endpoint, data = null) {
    const opts = { credentials: 'include', headers: {} };
    if (data) {
        opts.method = 'POST';
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(data);
    }
    try {
        const res = await fetch(API + endpoint, opts);
        return await res.json();
    } catch (e) { return null; }
}

// === ТОВАРЫ ===
async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    let url = 'products.php?';
    if (currentCategory && currentCategory !== 'sale') url += `category=${currentCategory}&`;
    if (currentBrand) url += `brand=${encodeURIComponent(currentBrand)}&`;
    const search = document.getElementById('searchInput').value;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    
    const products = await fetchApi(url);
    if (!products || !products.length) {
        grid.innerHTML = '<p style="text-align:center; padding:40px; color:#888;">Товары не найдены</p>';
        return;
    }

    let list = products;
    if (currentCategory === 'sale') list = products.filter(p => p.price === 999 || (p.description && p.description.includes('АКЦИЯ')));

    let favoriteIds = [];
    if (currentUser) {
        const favs = await fetchApi('favorites.php');
        if (favs) favoriteIds = favs.map(f => f.product_id || f.id);
    }

    grid.innerHTML = list.map((p, i) => {
        const isSale = p.price === 999 && p.name.includes('Velvet');
        const isFav = favoriteIds.includes(p.id);
        return `
        <div class="product-card" style="animation-delay:${i*0.05}s" onclick="window.location.href='product.html?id=${p.id}'">
            <div class="product-image">
                ${isSale ? '<div class="sale-badge">АКЦИЯ</div>' : ''}
                <img src="${p.image_url}" alt="${p.name}">
                <button class="favorite-btn ${isFav ? 'liked' : ''}" onclick="event.stopPropagation(); toggleFavorite(${p.id}, this)">
                    ${isFav ? '♥' : '♡'}
                </button>
            </div>
            <div class="product-info">
                <div class="product-brand">${p.brand}</div>
                <div class="product-name">${p.name}</div>
                <div class="product-volume">${p.volume}</div>
                <div class="product-price">
                    ${isSale ? '<span class="old-price">1590 ₽</span>' : ''}
                    <span class="${isSale?'sale-price':''}">${p.price} ₽</span>
                </div>
                
                <div class="card-qty-wrapper">
                    <button class="qty-selector-btn" onclick="event.stopPropagation(); changeCardQty(this, -1)">−</button>
                    <span class="qty-display">1</span>
                    <button class="qty-selector-btn" onclick="event.stopPropagation(); changeCardQty(this, 1)">+</button>
                </div>

                <div class="product-actions">
                    <button class="btn btn-primary" onclick="event.stopPropagation(); addToCart(${p.id}, this)">В корзину</button>
                    <button class="btn btn-outline" onclick="event.stopPropagation(); window.location.href='product.html?id=${p.id}'">Подробнее</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// === КОРЗИНА С МГНОВЕННЫМ ОБНОВЛЕНИЕМ ===
function changeCardQty(btn, delta) {
    const wrapper = btn.parentElement;
    const display = wrapper.querySelector('.qty-display');
    let val = parseInt(display.textContent) + delta;
    if (val < 1) val = 1;
    if (val > 99) val = 99;
    display.textContent = val;
}

async function addToCart(id, btn) {
    if (!currentUser) { showNotification('Войдите в аккаунт'); openModal('loginModal'); return; }
    
    const card = btn.closest('.product-card');
    const qty = card ? parseInt(card.querySelector('.qty-display').textContent) : 1;
    
    const res = await fetchApi('cart.php?action=add', { product_id: id, qty });
    if (res && res.ok) {
        if (btn) { 
            btn.textContent = '✓'; 
            setTimeout(() => { 
                btn.textContent = 'В корзину'; 
                if(card) card.querySelector('.qty-display').textContent = '1'; 
            }, 1000); 
        }
        updateBadge('cartCount');
        showNotification('Добавлено в корзину');
    }
}

async function loadCart() {
    const box = document.getElementById('cartContent');
    if (!currentUser) { box.innerHTML = '<p style="text-align:center; padding:40px; color:#888;">Войдите для просмотра корзины</p>'; return; }
    const items = await fetchApi('cart.php');
    if (!items || !items.length) { box.innerHTML = '<p style="text-align:center; padding:40px; color:#888;">Корзина пуста</p>'; return; }
    
    let total = 0;
    box.innerHTML = items.map(it => {
        const cartId = it.cart_id || it.id;
        const itemTotal = it.price * it.qty;
        total += itemTotal;
        return `
        <div class="cart-item" data-cart-id="${cartId}" data-price="${it.price}">
            <div class="item-image"><img src="${it.image_url}"></div>
            <div class="item-info">
                <b>${it.name}</b><br><small style="color:#888;">${it.brand}</small>
                <div class="qty-control">
                    <button class="qty-btn" onclick="updateCartQtyImmediate(${cartId}, -1)">−</button>
                    <span class="cart-qty-display" style="font-weight:600; min-width:24px; text-align:center;">${it.qty}</span>
                    <button class="qty-btn" onclick="updateCartQtyImmediate(${cartId}, 1)">+</button>
                </div>
            </div>
            <div class="item-total">${itemTotal.toLocaleString()} ₽</div>
            <button class="item-remove" onclick="removeFromCart(${cartId})">×</button>
        </div>`;
    }).join('') + `
    <div style="text-align:right; margin-top:24px; padding-top:20px; border-top:2px solid var(--border);">
        <div style="font-size:20px; font-weight:700; margin-bottom:16px;">Итого: <span id="cartTotalDisplay">${total.toLocaleString()} ₽</span></div>
        <button class="btn btn-primary" style="padding:14px 32px; font-size:15px;" onclick="openCheckout(${total})">Оформить заказ</button>
    </div>`;
}

// НОВОЕ: Мгновенное обновление количества в корзине
function updateCartQtyImmediate(cartId, delta) {
    const itemEl = document.querySelector(`.cart-item[data-cart-id="${cartId}"]`);
    if (!itemEl) return;
    
    const qtySpan = itemEl.querySelector('.cart-qty-display');
    const totalEl = itemEl.querySelector('.item-total');
    const price = parseFloat(itemEl.dataset.price);
    
    let currentQty = parseInt(qtySpan.textContent);
    let newQty = currentQty + delta;
    
    if (newQty < 1) {
        removeFromCart(cartId);
        return;
    }
    if (newQty > 99) newQty = 99;
    
    // МГНОВЕННО обновляем UI
    qtySpan.textContent = newQty;
    const newItemTotal = price * newQty;
    totalEl.textContent = newItemTotal.toLocaleString() + ' ₽';
    
    // Обновляем общую сумму
    updateCartTotal();
    
    // Отправляем на сервер
    fetchApi('cart.php?action=update', { cart_id: cartId, qty: newQty }).then(res => {
        if (res && res.ok) {
            updateBadge('cartCount');
        }
    });
}

// Обновление общей суммы корзины
function updateCartTotal() {
    let total = 0;
    document.querySelectorAll('.cart-item').forEach(item => {
        const qty = parseInt(item.querySelector('.cart-qty-display').textContent);
        const price = parseFloat(item.dataset.price);
        total += qty * price;
    });
    
    const totalEl = document.getElementById('cartTotalDisplay');
    if (totalEl) {
        totalEl.textContent = total.toLocaleString() + ' ₽';
    }
}

async function removeFromCart(cartId) {
    // 1. Находим строку товара в DOM
    const itemEl = document.querySelector(`.cart-item[data-cart-id="${cartId}"]`);
    if (!itemEl) return;
    
    // 2. Визуально "гасим" элемент сразу (UX)
    itemEl.style.transition = 'all 0.3s';
    itemEl.style.opacity = '0';
    itemEl.style.transform = 'translateX(20px)';
    itemEl.style.pointerEvents = 'none';

    // 3. Отправляем запрос на удаление
    const res = await fetchApi('cart.php?action=remove', { cart_id: cartId });
    
    if (res && res.ok) {
        // 4. Полностью убираем из DOM
        itemEl.remove();
        
        // 5. Пересчитываем общую сумму
        updateCartTotal();
        updateBadge('cartCount');
        showNotification('Товар удалён из корзины');
        
        // 6. Если корзина опустела, показываем сообщение
        if (document.querySelectorAll('.cart-item').length === 0) {
            document.getElementById('cartContent').innerHTML = '<p style="text-align:center; padding:40px; color:#888;">Корзина пуста</p>';
        }
    } else {
        // Если сервер вернул ошибку, возвращаем товар на место
        itemEl.style.opacity = '1';
        itemEl.style.transform = 'translateX(0)';
        itemEl.style.pointerEvents = 'auto';
        showNotification('Ошибка удаления. Попробуйте снова.');
    }
}
function openCheckout(total) {
    document.getElementById('checkoutTotal').textContent = total.toLocaleString() + ' ₽';
    openModal('checkoutModal');
}

async function submitOrder() {
    const name = document.getElementById('orderName').value.trim();
    const phone = document.getElementById('orderPhone').value.trim();
    const address = document.getElementById('orderAddress').value.trim();
    if (!name || !phone || !address) return alert('Заполните ФИО, телефон и адрес');
    
    const btn = document.querySelector('#checkoutModal .btn-primary');
    btn.textContent = 'Оформляем...'; btn.disabled = true;
    
    setTimeout(async () => {
        await fetchApi('cart.php?action=clear');
        closeModal('checkoutModal');
        showNotification('Заказ успешно оформлен!');
        document.getElementById('orderName').value = '';
        document.getElementById('orderPhone').value = '';
        document.getElementById('orderAddress').value = '';
        document.getElementById('orderComment').value = '';
        btn.textContent = 'Подтвердить заказ'; btn.disabled = false;
        loadCart(); updateBadge('cartCount');
    }, 1200);
}

// === ИЗБРАННОЕ С МГНОВЕННЫМ ОБНОВЛЕНИЕМ ===
async function loadFavorites() {
    const box = document.getElementById('favoritesContent');
    if (!currentUser) { box.innerHTML = '<p style="text-align:center; padding:40px; color:#888;">Войдите для просмотра</p>'; return; }
    const items = await fetchApi('favorites.php');
    if (!items || !items.length) { box.innerHTML = '<p style="text-align:center; padding:40px; color:#888;">Нет избранных товаров</p>'; return; }
    
    box.innerHTML = items.map(it => `
        <div class="fav-item" data-product-id="${it.id}" data-price="${it.price}">
            <div class="item-image"><img src="${it.image_url}"></div>
            <div class="item-info">
                <b>${it.name}</b><br><small style="color:#888;">${it.brand}</small>
                <div class="qty-control" style="margin-top:8px;">
                    <button class="qty-btn" onclick="updateFavQtyImmediate(${it.id}, -1)">−</button>
                    <span class="fav-qty-display" style="font-weight:600; min-width:24px; text-align:center;">1</span>
                    <button class="qty-btn" onclick="updateFavQtyImmediate(${it.id}, 1)">+</button>
                </div>
            </div>
            <div class="fav-item-total" style="font-weight:700; font-size:16px; min-width:80px; text-align:right;">${it.price} ₽</div>
            <button class="btn btn-primary" style="padding:10px 18px;" onclick="addToCartFromFav(${it.id}, this)">В корзину</button>
            <button class="item-remove" onclick="toggleFavorite(${it.id}, this)">×</button>
        </div>
    `).join('');
}

// НОВОЕ: Мгновенное обновление количества в избранном
function updateFavQtyImmediate(productId, delta) {
    const itemEl = document.querySelector(`.fav-item[data-product-id="${productId}"]`);
    if (!itemEl) return;
    
    const qtySpan = itemEl.querySelector('.fav-qty-display');
    let currentQty = parseInt(qtySpan.textContent);
    let newQty = currentQty + delta;
    
    if (newQty < 1) newQty = 1;
    if (newQty > 99) newQty = 99;
    
    // МГНОВЕННО обновляем отображение
    qtySpan.textContent = newQty;
    
    // Обновляем сумму для этого товара
    const price = parseFloat(itemEl.dataset.price);
    const totalEl = itemEl.querySelector('.fav-item-total');
    if (totalEl) {
        totalEl.textContent = (price * newQty).toLocaleString() + ' ₽';
    }
}

async function addToCartFromFav(productId, btn) {
    if (!currentUser) return;
    const wrapper = btn.closest('.fav-item');
    const qty = parseInt(wrapper.querySelector('.fav-qty-display').textContent);
    const res = await fetchApi('cart.php?action=add', { product_id: productId, qty });
    if (res && res.ok) {
        btn.textContent = '✓'; btn.style.background = 'var(--lime)'; btn.style.color = '#000';
        setTimeout(() => { btn.textContent = 'В корзину'; btn.style.background = ''; btn.style.color = ''; }, 1500);
        updateBadge('cartCount'); showNotification('Добавлено в корзину');
    }
}

async function toggleFavorite(productId, btn) {
    if (!currentUser) { showNotification('Войдите в аккаунт'); openModal('loginModal'); return; }
    
    const isLiked = btn.classList.contains('liked') || btn.textContent === '♥';
    btn.textContent = isLiked ? '♡' : '♥';
    btn.classList.toggle('liked');

    const res = await fetchApi('favorites.php?action=toggle', { product_id: productId });
    if (res && res.ok) {
        updateBadge('favCount');
        showNotification(isLiked ? 'Удалено из избранного' : 'Добавлено в избранное');
        loadFavorites(); // Перезагружаем список
    } else {
        btn.textContent = isLiked ? '♥' : '♡';
        btn.classList.toggle('liked');
    }
}

// === АВТОРИЗАЦИЯ & UI ===
async function checkAuth() {
    const u = await fetchApi('auth.php?action=me');
    if (u) { currentUser = u; document.getElementById('authButtons').style.display = 'none'; document.getElementById('userButtons').style.display = 'flex'; document.getElementById('profileEmail').textContent = u.email || u.name; }
}
async function login() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    const res = await fetchApi('auth.php?action=login', { email, password: pass });
    if (res && res.ok) { currentUser = res; closeModal('loginModal'); location.reload(); } else { alert(res?.error || 'Ошибка входа'); }
}
async function register() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPassword').value;
    if (!name || !email || !pass) return alert('Заполните все поля');
    const res = await fetchApi('auth.php?action=register', { name, email, password: pass });
    if (res && res.ok) { currentUser = res; closeModal('registerModal'); location.reload(); } else { alert(res?.error || 'Ошибка регистрации'); }
}
function logout() { fetchApi('auth.php?action=logout'); location.reload(); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function openModal(id) { document.getElementById(id).classList.add('show'); }

function updateBadge(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const data = id === 'cartCount' ? 'cart.php' : 'favorites.php';
    fetchApi(data).then(arr => { el.textContent = (arr && Array.isArray(arr)) ? arr.length : 0; });
}

function showNotification(msg) {
    const el = document.getElementById('notification');
    if(!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2500);
}