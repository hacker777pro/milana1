const API = 'api/';
let currentUser = null;
let currentCategory = '';
let currentSubcategory = '';

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadProducts();
    setupEventListeners();
});

async function checkAuth() {
    const user = await api('auth.php?action=me');
    if (user) {
        currentUser = user;
        updateAuthUI();
    }
}

async function api(endpoint, data = null) {
    const options = { credentials: 'include', headers: {} };
    if (data) {
        options.method = 'POST';
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
    }
    try {
        const response = await fetch(API + endpoint, options);
        const result = await response.json();
        if (result.error) showNotification(result.error, 'error');
        return result;
    } catch (error) {
        showNotification('Ошибка соединения', 'error');
        return null;
    }
}

// ===== ТОВАРЫ =====
async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    let url = 'products.php?';
    if (currentCategory) url += `category=${currentCategory}&`;
    if (currentSubcategory) url += `subcategory=${currentSubcategory}&`;
    const search = document.getElementById('searchInput').value;
    if (search) url += `search=${encodeURIComponent(search)}`;

    const products = await api(url);
    if (!products || products.length === 0) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p class="empty-text">Товары не найдены</p></div>';
        return;
    }

    let favoriteIds = [];
    if (currentUser) {
        const favs = await api('favorites.php');
        if (favs) favoriteIds = favs.map(f => f.product_id || f.id);
    }

    grid.innerHTML = products.map((product, index) => {
        const isFav = favoriteIds.includes(product.id);
        return `
        <div class="product-card" style="animation-delay: ${index * 0.1}s" onclick="showProductDetails(${product.id})">
            <div class="product-image">
                ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" loading="lazy">` : '<div style="font-size:80px;opacity:0.2">📦</div>'}
                <button class="favorite-btn ${isFav ? 'liked' : ''}" onclick="event.stopPropagation(); toggleFavorite(${product.id}, this)">
                    ${isFav ? '♥' : '♡'}
                </button>
            </div>
            <div class="product-info">
                <div class="product-brand">${product.brand}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-volume">${product.volume}</div>
                <div class="product-price">${product.price} ₽</div>
                
                <div class="card-qty-wrapper">
                    <button class="qty-selector-btn" onclick="event.stopPropagation(); changeCardQty(this, -1)">−</button>
                    <span class="qty-display">1</span>
                    <button class="qty-selector-btn" onclick="event.stopPropagation(); changeCardQty(this, 1)">+</button>
                </div>

                <div class="product-actions">
                    <button class="btn btn-primary" onclick="event.stopPropagation(); addToCart(${product.id}, this)">🛒 В корзину</button>
                    <button class="btn btn-outline" onclick="event.stopPropagation(); showProductDetails(${product.id})">ℹ️</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ===== КОРЗИНА =====
async function addToCart(productId, btn) {
    if (!currentUser) { openModal('loginModal'); return; }
    
    const card = btn.closest('.product-card');
    const qty = parseInt(card.querySelector('.qty-display').textContent) || 1;
    
    const result = await api('cart.php?action=add', { product_id: productId, qty: qty });
    if (result.ok) {
        card.querySelector('.qty-display').textContent = '1'; // сброс
        
        btn.innerHTML = '✓ Добавлено';
        btn.style.background = 'linear-gradient(135deg, #D9FB5F, #c8e63a)';
        btn.style.color = '#1a1a1a';
        
        setTimeout(() => {
            btn.innerHTML = '🛒 В корзину';
            btn.style.background = ''; btn.style.color = '';
        }, 1500);
        
        showNotification(`Добавлено ${qty} шт.`, 'success');
        updateCartCount();
    }
}
async function updateCartCount() {
    if (!currentUser) {
        document.getElementById('cartCount').textContent = '0';
        return;
    }
    const cart = await api('cart.php');
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cartCount').textContent = count;
}

async function loadCart() {
    const content = document.getElementById('cartContent');
    if (!currentUser) {
        content.innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><p class="empty-text">Войдите, чтобы видеть корзину</p><button class="btn btn-primary" onclick="openModal(\'loginModal\')" style="width:auto;margin-top:16px;padding:14px 32px;">Войти</button></div>';
        return;
    }

    const cart = await api('cart.php');
    if (!cart || cart.length === 0) {
        content.innerHTML = '<div class="empty-state"><div class="empty-icon">🛒</div><p class="empty-text">Корзина пуста</p><button class="btn btn-primary" onclick="showPage(\'home\')" style="width:auto;margin-top:16px;padding:14px 32px;">Перейти к покупкам</button></div>';
        return;
    }

    let total = 0;
    let html = cart.map(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        return `
        <div class="cart-item">
            <div class="item-image">
                ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}">` : '<div style="font-size:40px;">📦</div>'}
            </div>
            <div class="item-info">
                <div class="item-title">${item.name}</div>
                <div class="item-brand">${item.brand}</div>
                <div class="qty-control">
                    <button class="qty-btn" onclick="updateQty(${item.id}, ${item.qty - 1})">−</button>
                    <span class="qty-value">${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty(${item.id}, ${item.qty + 1})">+</button>
                </div>
            </div>
            <div class="item-total">${itemTotal} ₽</div>
            <button class="item-remove" onclick="removeFromCart(${item.id})"></button>
        </div>`;
    }).join('');

    html += `
    <div class="cart-summary">
        <div>
            <div class="total-label">Итого:</div>
            <div class="total-price">${total} ₽</div>
        </div>
        <button class="btn-checkout" onclick="checkout()">Оформить заказ →</button>
    </div>`;

    content.innerHTML = html;
}

async function updateQty(cartId, newQty) {
    if (newQty < 1) { removeFromCart(cartId); return; }
    await api('cart.php?action=update', { cart_id: cartId, qty: newQty });
    loadCart();
    updateCartCount();
}

async function removeFromCart(cartId) {
    await api('cart.php?action=remove', { cart_id: cartId });
    loadCart();
    updateCartCount();
    showNotification('Товар удалён', 'success');
}

function checkout() {
    showNotification('Заказ оформлен! Спасибо 🎉', 'success');
    api('cart.php?action=clear');
    setTimeout(() => { showPage('home'); loadCart(); updateCartCount(); }, 1500);
}

// ===== ИЗБРАННОЕ =====
async function toggleFavorite(productId, btn) {
    if (!currentUser) { openModal('loginModal'); return; }
    const result = await api('favorites.php?action=toggle', { product_id: productId });
    if (result.ok) {
        btn.classList.toggle('liked');
        btn.textContent = result.added ? '♥' : '♡';
        showNotification(result.added ? 'Добавлено в избранное ♥' : 'Удалено из избранного', 'success');
        loadFavorites();
    }
}

async function updateFavCount() {
    if (!currentUser) { document.getElementById('favCount').textContent = '0'; return; }
    const favs = await api('favorites.php');
    document.getElementById('favCount').textContent = favs.length;
}

async function loadFavorites() {
    const content = document.getElementById('favoritesContent');
    if (!currentUser) {
        content.innerHTML = '<div class="empty-state"><div class="empty-icon">♡</div><p class="empty-text">Войдите, чтобы видеть избранное</p></div>';
        return;
    }
    const favs = await api('favorites.php');
    if (!favs || favs.length === 0) {
        content.innerHTML = '<div class="empty-state"><div class="empty-icon">♡</div><p class="empty-text">Нет избранных товаров</p></div>';
        return;
    }
    content.innerHTML = favs.map(item => `
        <div class="cart-item">
            <div class="item-image">
                ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}">` : '<div style="font-size:40px;"></div>'}
            </div>
            <div class="item-info">
                <div class="item-title">${item.name}</div>
                <div class="item-brand">${item.brand}</div>
            </div>
            <div class="item-total">${item.price} ₽</div>
            <button class="btn btn-primary" style="width:auto;padding:12px 24px;" onclick="addToCart(${item.id})">В корзину</button>
            <button class="item-remove" onclick="toggleFavorite(${item.id}, null); loadFavorites();">✕</button>
        </div>
    `).join('');
    updateFavCount();
}

// ===== ДЕТАЛИ ТОВАРА =====
async function showProductDetails(productId) {
    const product = await api(`products.php?id=${productId}`);
    if (!product) return;

    const details = document.getElementById('productDetails');
    details.innerHTML = `
        <div class="detail-layout">
            <div class="detail-image">
                ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}">` : '<div style="font-size:120px;opacity:0.2"></div>'}
            </div>
            <div class="detail-info">
                <div class="detail-brand">${product.brand}</div>
                <h2 class="detail-name">${product.name}</h2>
                <div class="detail-price">${product.price} ₽</div>
                
                <div class="detail-section">
                    <div class="detail-section-title">Объём</div>
                    <div class="detail-section-text">${product.volume}</div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-section-title">Описание</div>
                    <div class="detail-section-text">${product.description}</div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-section-title">Применение</div>
                    <div class="detail-section-text">${product.usage}</div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-section-title">Состав</div>
                    <div class="detail-section-text">${product.ingredients}</div>
                </div>
                
                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="addToCart(${product.id}, this); closeModal('productModal');">🛒 В корзину</button>
                    <button class="btn btn-outline" onclick="toggleFavorite(${product.id}, this)">♡ В избранное</button>
                </div>
            </div>
        </div>`;
    openModal('productModal');
}

// ===== АВТОРИЗАЦИЯ =====
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) { showNotification('Заполните все поля', 'error'); return; }
    const result = await api('auth.php?action=login', { email, password });
    if (result.ok) {
        currentUser = { name: result.name, email: result.email };
        closeModal('loginModal');
        updateAuthUI();
        showNotification('Добро пожаловать! 👋', 'success');
        loadProducts(); loadCart(); loadFavorites();
    }
}

async function register() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const password2 = document.getElementById('regPassword2').value;
    
    if (!name || !email || !password) { showNotification('Заполните все поля', 'error'); return; }
    if (password !== password2) { showNotification('Пароли не совпадают', 'error'); return; }
    if (password.length < 6) { showNotification('Минимум 6 символов', 'error'); return; }
    
    const result = await api('auth.php?action=register', { name, email, password });
    if (result.ok) {
        currentUser = { name, email };
        closeModal('registerModal');
        updateAuthUI();
        showNotification('Аккаунт создан! ', 'success');
        loadProducts(); loadCart(); loadFavorites();
    }
}

async function logout() {
    await api('auth.php?action=logout');
    currentUser = null;
    updateAuthUI();
    closeModal('profileModal');
    showPage('home');
    loadCart(); loadFavorites();
    showNotification('Вы вышли', 'success');
}

function updateAuthUI() {
    if (currentUser) {
        document.getElementById('authButtons').style.display = 'none';
        document.getElementById('userButtons').style.display = 'flex';
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileEmail').textContent = currentUser.email;
    } else {
        document.getElementById('authButtons').style.display = 'flex';
        document.getElementById('userButtons').style.display = 'none';
    }
}

// ===== НАВИГАЦИЯ =====
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    if (page === 'home') { document.getElementById('homePage').classList.add('active'); loadProducts(); }
    if (page === 'cart') { document.getElementById('cartPage').classList.add('active'); loadCart(); }
    if (page === 'favorites') { document.getElementById('favoritesPage').classList.add('active'); loadFavorites(); }
}

function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function showNotification(message, type = 'success') {
    const notif = document.getElementById('notification');
    notif.className = `notification ${type} show`;
    notif.innerHTML = `${type === 'success' ? '✅' : '⚠️'} ${message}`;
    setTimeout(() => notif.classList.remove('show'), 3000);
}
function changeCardQty(btn, delta) {
    const wrapper = btn.parentElement;
    const display = wrapper.querySelector('.qty-display');
    let val = parseInt(display.textContent) + delta;
    if (val < 1) val = 1;
    if (val > 99) val = 99;
    display.textContent = val;
}
function setupEventListeners() {
    // Категории
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.cat;
            currentSubcategory = btn.dataset.sub;
            // Всегда возвращаемся на главную и показываем товары
            showPage('home');
            loadProducts();
        };
    });
    
    // Поиск
    document.getElementById('searchInput').oninput = () => {
        // Если мы не на главной, переходим на главную
        if (!document.getElementById('homePage').classList.contains('active')) {
            showPage('home');
        }
        loadProducts();
    };
    
    // Закрытие модалок
    document.querySelectorAll('.modal').forEach(modal => {
        modal.onclick = e => { 
            if (e.target === modal) modal.classList.remove('show'); 
        };
    });
}