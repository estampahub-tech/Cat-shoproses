// ==========================================================
// SHOP ROSES · Catálogo (Con Tallas y Datos del Cliente)
// ==========================================================

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7gnp6dx6DywtMtapzZttYTWaq1pG43XTNvpExw2IVkARrsHIiXUCSf7MhiizMJpJ9GA/exec';

let productos = [];
let productoFiltrado = [];
let carrito = [];
let categoriaActiva = 'Todos';
let busquedaActual = '';
let cuponAplicado = null;

const $ = (sel) => document.querySelector(sel);
const catalogEl = $('#catalog');
const categoriesEl = $('#categories');
const searchInput = $('#searchInput');
const cartCount = $('#cartCount');
const cartDrawer = $('#cartDrawer');
const drawerOverlay = $('#drawerOverlay');
const cartItemsEl = $('#cartItems');
const drawerSub = $('#drawerSub');
const cartSubtotal = $('#cartSubtotal');
const cartDiscount = $('#cartDiscount');
const cartDiscountRow = $('#cartDiscountRow');
const cartTotal = $('#cartTotal');
const comboHint = $('#comboHint');
const toastContainer = $('#toastContainer');

document.addEventListener('DOMContentLoaded', () => {
  cargarProductos();
  bindEvents();
});

async function cargarProductos() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getProducts&t=${Date.now()}`);
    const data = await res.json();
    productos = (data.products || []).map(p => ({
      ...p, Precio_Actual: Number(p.Precio_Actual) || 0, Precio_Antes: Number(p.Precio_Antes) || 0, Stock: Number(p.Stock) || 0
    }));
    postCarga();
  } catch (err) { console.error(err); }
}

function postCarga() {
  productoFiltrado = [...productos];
  renderCategorias();
  renderCatalogo();
  if ($('#statProducts')) $('#statProducts').textContent = productos.length;
}

function renderCategorias() {
  const cats = ['Todos', ...new Set(productos.map(p => p.Categoria).filter(Boolean))];
  categoriesEl.innerHTML = cats.map(cat => `<button class="cat-chip ${cat === categoriaActiva ? 'active' : ''}" data-cat="${cat}">${cat}</button>`).join('');
  categoriesEl.querySelectorAll('.cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      categoriaActiva = btn.dataset.cat;
      categoriesEl.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      aplicarFiltros();
    });
  });
}

function aplicarFiltros() {
  productoFiltrado = productos.filter(p => {
    const coincideCat = categoriaActiva === 'Todos' || p.Categoria === categoriaActiva;
    const texto = busquedaActual.toLowerCase().trim();
    const coincideBusqueda = !texto || (p.Nombre || '').toLowerCase().includes(texto);
    return coincideCat && coincideBusqueda;
  });
  renderCatalogo();
}

function renderCatalogo() {
  if (!productoFiltrado.length) return;
  catalogEl.innerHTML = productoFiltrado.map((p, i) => {
    const tieneDesc = p.Precio_Antes > p.Precio_Actual;
    const pct = tieneDesc ? Math.round((1 - p.Precio_Actual / p.Precio_Antes) * 100) : 0;
    const soldOut = p.Stock <= 0;
    const enCarrito = carrito.find(c => String(c.id) === String(p.ID));
    
    return `
      <article class="product-card" data-id="${p.ID}" style="animation-delay:${i * 0.06}s">
        <div class="card-image">
          ${tieneDesc ? `<span class="discount-badge">-${pct}%</span>` : ''}
          <img src="${p.ImagenURL}" alt="${p.Nombre}" loading="lazy">
          <span class="stock-tag ${soldOut ? 'soldout' : ''}">${soldOut ? 'Agotado' : p.Stock + ' disponibles'}</span>
        </div>
        <div class="card-body">
          <p class="card-cat">${p.Categoria}</p>
          <h3 class="card-title">${p.Nombre}</h3>
          <div class="card-prices">
            ${tieneDesc ? `<span class="price-old">$${p.Precio_Antes}</span>` : ''}
            <span class="price-new">$${p.Precio_Actual}</span>
          </div>
          <button class="card-cta" ${soldOut && !enCarrito ? 'disabled' : ''} data-add="${p.ID}">
            ${enCarrito ? `En carrito (${enCarrito.cantidad})` : (soldOut ? 'Agotado' : 'Ver y agregar')}
          </button>
        </div>
      </article>
    `;
  }).join('');

  catalogEl.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => { if (!e.target.closest('[data-add]')) abrirModal(card.dataset.id); });
  });
  catalogEl.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); abrirModal(btn.dataset.add); });
  });
}

function abrirModal(id) {
  const p = productos.find(x => String(x.ID) === String(id));
  if (!p) return;

  // Lógica de Tallas
  let tallasOpciones = '';
  if (p.Tallas) {
    const arrayTallas = String(p.Tallas).split(',').map(t => t.trim());
    tallasOpciones = arrayTallas.map(t => `<option value="${t}">${t}</option>`).join('');
  }

  const enCarritoPrincipal = carrito.find(c => String(c.id) === String(p.ID));
  
  $('#modalContent').innerHTML = `
    <div class="modal-grid">
      <div class="modal-img"><img src="${p.ImagenURL}" alt="${p.Nombre}"></div>
      <div class="modal-info">
        <p class="modal-cat">${p.Categoria}</p>
        <h2 class="modal-title">${p.Nombre}</h2>
        <div class="modal-prices">
          ${p.Precio_Antes > p.Precio_Actual ? `<span class="price-old">$${p.Precio_Antes}</span>` : ''}
          <span class="price-new">$${p.Precio_Actual}</span>
        </div>
        
        ${p.Tallas ? `
          <div style="margin:15px 0;">
            <label style="display:block; font-size:0.8rem; color:#b0a5b3; margin-bottom:5px;">Selecciona tu talla:</label>
            <select id="selectTalla" style="width:100%; padding:12px; background:#17141f; border:1px solid #e68caf; color:white; border-radius:8px; outline:none;">
              ${tallasOpciones}
            </select>
          </div>
        ` : ''}

        <button class="modal-cta" ${p.Stock <= 0 && !enCarritoPrincipal ? 'disabled' : ''} onclick="agregarAlCarrito('${p.ID}')">
          ${enCarritoPrincipal ? `En carrito (${enCarritoPrincipal.cantidad})` : 'Agregar a mi selección'}
        </button>
      </div>
    </div>
  `;
  $('#modalOverlay').classList.add('open');
}

function agregarAlCarrito(id) {
  const p = productos.find(x => String(x.ID) === String(id));
  const tallaSelect = document.getElementById('selectTalla');
  const tallaElegida = tallaSelect ? tallaSelect.value : 'Única';

  const existente = carrito.find(x => String(x.id) === String(id) && x.talla === tallaElegida);
  if (existente) {
    existente.cantidad++;
  } else {
    carrito.push({ id: p.ID, nombre: p.Nombre, precio: p.Precio_Actual, talla: tallaElegida, cantidad: 1 });
  }
  
  cerrarModal();
  actualizarCarrito();
}

function cerrarModal() { $('#modalOverlay').classList.remove('open'); }

function actualizarCarrito() {
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);
  cartCount.textContent = totalItems;
  cartCount.classList.toggle('show', totalItems > 0);
  
  if (!carrito.length) {
    cartItemsEl.innerHTML = `<div style="text-align:center; padding:20px;">Vacío</div>`;
  } else {
    cartItemsEl.innerHTML = carrito.map((i, index) => `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${i.nombre} (Talla: ${i.talla})</h4>
          <span class="cart-item-price">$${i.precio * i.cantidad}</span>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="cambiarCantidad(${index}, -1)">−</button>
            <span>${i.cantidad}</span>
            <button class="qty-btn" onclick="cambiarCantidad(${index}, 1)">+</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  let descuento = cuponAplicado ? (cuponAplicado.Tipo === '%' ? Math.round(subtotal * (cuponAplicado.Valor/100)) : cuponAplicado.Valor) : 0;
  const total = Math.max(0, subtotal - descuento);

  cartSubtotal.textContent = `$${subtotal}`;
  if (descuento > 0) { cartDiscountRow.style.display = 'flex'; cartDiscount.textContent = `-$${descuento}`; } else { cartDiscountRow.style.display = 'none'; }
  cartTotal.textContent = `$${total}`;
}

function cambiarCantidad(index, delta) {
  carrito[index].cantidad += delta;
  if (carrito[index].cantidad <= 0) carrito.splice(index, 1);
  actualizarCarrito();
}

async function finalizarCompra() {
  if (!carrito.length) return mostrarToast('Vacío', 'error');

  const nombre = prompt("Por favor, ingresa tu NOMBRE completo:");
  if (!nombre) return;
  const cedula = prompt("Ingresa tu CÉDULA o IDENTIFICACIÓN:");
  if (!cedula) return;
  const celular = prompt("Ingresa tu número de CELULAR:");
  if (!celular) return;
  const email = prompt("Ingresa tu CORREO ELECTRÓNICO (opcional, para enviarte la tirilla):") || '';

  const payload = {
    action: 'placeOrder',
    items: carrito,
    total: carrito.reduce((s, i) => s + i.precio * i.cantidad, 0),
    cliente_nombre: nombre,
    cliente_id: cedula,
    cliente_cel: celular,
    cliente_email: email
  };

  try {
    const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.status === 'success') {
      alert(`¡Pedido confirmado!\nTu número de ticket es: ${data.orderId}\nAcércate al mostrador para pagar.`);
      carrito = [];
      actualizarCarrito();
      cerrarCarrito();
    }
  } catch (e) { alert('Error de conexión'); }
}

function bindEvents() {
  $('#cartBtn')?.addEventListener('click', () => { $('#cartDrawer').classList.add('open'); $('#drawerOverlay').classList.add('open'); });
  $('#closeDrawer')?.addEventListener('click', () => { $('#cartDrawer').classList.remove('open'); $('#drawerOverlay').classList.remove('open'); });
  $('#checkoutBtn')?.addEventListener('click', finalizarCompra);
  $('#closeModal')?.addEventListener('click', cerrarModal);
}
