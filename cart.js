/* ═══════════════════════════════════════════════════
   KOSTRO PIZZA — Оновлений cart.js
   Авто-пакування (Коробки та Контейнери)
═══════════════════════════════════════════════════ */

const TELEGRAM_BOT_TOKEN = '8687219722:AAHbZlzLMlX79czLrq5Bcj8z4o8WwnyGyKU'; 
const TELEGRAM_CHAT_ID   = '-1003682772833'; 

/* ─── СТАН КОШИКА ─── */
let cart = JSON.parse(localStorage.getItem('pizza_cart')) || [];

function saveCartToStorage() {
    localStorage.setItem('pizza_cart', JSON.stringify(cart));
}

function updateFab() {
    const cnt = document.getElementById('cart-count');
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    if (cnt) {
        cnt.textContent = total;
        cnt.style.display = total > 0 ? 'flex' : 'none';
    }
}

/* ─── ЛОГІКА ДОДАВАННЯ ТОВАРІВ ─── */

function addItemToCart(name, price) {
    localStorage.removeItem('last_receipt_html');
    
    let existing = cart.find(item => item.name === name);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ 
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), 
            name: name, 
            price: price, 
            qty: 1 
        });
    }
    saveCartToStorage();
    updateFab();
}

// Функція для піци (авто-коробки)
function addToCart(btn) {
    if (window.event) window.event.stopPropagation();
    const card = btn.closest('[data-name]');
    const name = card.getAttribute('data-name');
    const size = btn.getAttribute('data-size'); 
    const price = parseInt(size === '30' ? card.getAttribute('data-price30') : card.getAttribute('data-price50'));
    const label = `${name} (${size} см)`;

    addItemToCart(label, price);

    if (size === '30') {
        addItemToCart('Коробка на піцу', 15);
    } else if (size === '50') {
        addItemToCart('Коробка на піцу XXL', 25);
    }

    showToast(`🍕 ${label} + коробка додані!`);
    if (document.getElementById('cart-drawer').classList.contains('open')) renderCartItems();
}

// Функція для інших страв (авто-контейнер)
function addSimple(el) {
    const name = el.getAttribute('data-name');
    const price = parseInt(el.getAttribute('data-price'));
    
    // Отримуємо заголовок секції, в якій знаходиться товар
    const section = el.closest('.menu-section');
    const sectionTitle = section ? section.querySelector('.section-title').innerText : '';

    addItemToCart(name, price);

    // ПЕРЕВІРКА: якщо секція називається "Другі страви", "Салати", "Перші страви" тощо.
    const categoriesWithContainer = ["Другі страви", "Салати", "Холодні закуски", "Перші страви"];
    
    if (categoriesWithContainer.includes(sectionTitle)) {
        addItemToCart('Контейнер', 10);
        showToast(`✅ ${name} + контейнер додано!`);
    } else {
        showToast(`✅ ${name} додано!`);
    }

    if (document.getElementById('cart-drawer').classList.contains('open')) renderCartItems();
}

/* ─── ВІДОБРАЖЕННЯ ТА ІНТЕРФЕЙС ─── */

function renderCartItems() {
    const container = document.getElementById('cart-items-list');
    const footer = document.getElementById('drawer-footer');
    const lastReceipt = localStorage.getItem('last_receipt_html');

    if (!container) return;

    if (lastReceipt && cart.length === 0) {
        container.innerHTML = lastReceipt;
        if (footer) footer.style.display = 'none';
        return;
    }

    if (footer) footer.style.display = cart.length > 0 ? 'flex' : 'none';
    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🍕</div><p>Кошик порожній</p></div>`;
        return;
    }

    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-left">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-unit">${item.price} ₴</div>
            </div>
            <div class="cart-item-right">
                <div class="cart-item-price">${item.price * item.qty} ₴</div>
                <div class="qty-row">
                    <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
                    <span class="qty-val">${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
                </div>
            </div>`;
        container.appendChild(div);
    });

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    document.getElementById('cart-total').textContent = total + ' ₴';
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
        saveCartToStorage();
        updateFab();
        renderCartItems();
    }
}

async function submitOrder() {
    const name = document.getElementById('f-name').value.trim();
    const phone = document.getElementById('f-phone').value.trim();
    const address = document.getElementById('f-address').value.trim();
    const time = document.getElementById('f-time').value;
    const comment = document.getElementById('f-comment').value.trim();

    if (!name || !phone || !address) {
        showToast("⚠️ Заповніть контакти");
        return;
    }

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const itemsText = cart.map(i => `• ${i.name} x${i.qty} — ${i.price * i.qty} ₴`).join('\n');
    
    const message = `🍕 НОВЕ ЗАМОВЛЕННЯ\n\n👤 Ім'я: ${name}\n📞 Тел: ${phone}\n📍 Адреса: ${address}\n⏰ Час: ${time}\n${comment ? '💬 Ком: ' + comment : ''}\n\n🛒 ТОВАРИ:\n${itemsText}\n\n💰 РАЗОМ: ${total} ₴`;

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Надсилаємо...';

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
        });

        if (response.ok) {
            const receiptHtml = `
                <div class="receipt-success" style="padding: 15px; background: #141210; border: 1px solid #e8762a; border-radius: 8px;">
                    <h3 style="color: #e8762a; margin-bottom: 10px; text-align: center;">Замовлення прийнято!</h3>
                    <p style="font-size: 0.85em; margin-bottom: 10px; border-bottom: 1px dashed #333; padding-bottom: 10px;">
                        <strong>Клієнт:</strong> ${name}<br>
                        <strong>Доставка:</strong> ${address}
                    </p>
                    <div style="font-size: 0.8em; line-height: 1.4;">
                        ${cart.map(i => `<div style="display:flex; justify-content:space-between;"><span>${i.name} x${i.qty}</span><span>${i.price * i.qty} ₴</span></div>`).join('')}
                    </div>
                    <div style="margin-top: 10px; border-top: 1px solid #e8762a; padding-top: 5px; text-align: right; font-weight: bold; color: #e8762a;">
                        СУМА: ${total} ₴
                    </div>
                    <button onclick="clearReceipt()" style="width:100%; margin-top: 15px; padding: 10px; background: #e8762a; color: white; border: none; border-radius: 4px; cursor: pointer;">Нове замовлення</button>
                </div>`;

            localStorage.setItem('last_receipt_html', receiptHtml);
            cart = [];
            saveCartToStorage();
            updateFab();
            closeOrderForm();
            openCart();
        }
    } catch (e) {
        showToast("❌ Помилка з’єднання");
    } finally {
        btn.disabled = false;
        btn.textContent = 'Надіслати замовлення ✈️';
    }
}

function clearReceipt() {
    localStorage.removeItem('last_receipt_html');
    renderCartItems();
}

function openCart() {
    renderCartItems();
    document.getElementById('cart-drawer').classList.add('open');
    document.getElementById('drawer-overlay').classList.add('visible');
}

function closeCart() {
    document.getElementById('cart-drawer').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('visible');
}

function openOrderForm() {
    if (cart.length === 0) return;
    closeCart();
    document.getElementById('order-modal').classList.add('open');
    document.getElementById('modal-overlay').classList.add('visible');
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    document.getElementById('modal-total').textContent = total + ' ₴';
}

function closeOrderForm() {
    document.getElementById('order-modal').classList.remove('open');
    document.getElementById('modal-overlay').classList.remove('visible');
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

document.addEventListener('DOMContentLoaded', () => {
    updateFab();
});