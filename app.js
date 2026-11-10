// ==========================================================
// SHOP ROSES · Catálogo interactivo para tablet en tienda
// ==========================================================
// ⚠️ IMPORTANTE: Reemplaza esta URL con la de tu Apps Script
// publicada en el paso de configuración (Implementar > Aplicación web)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7gnp6dx6DywtMtapzZttYTWaq1pG43XTNvpExw2IVkARrsHIiXUCSf7MhiizMJpJ9GA/exec';

// Datos de demostración (se reemplazan automáticamente si la API responde)
const DEMO_PRODUCTS = [
  {
    ID: 'CAM001', Nombre: 'Camiseta Noir Silk', Categoria: 'Camisetas',
    Precio_Actual: 250, Precio_Antes: 500, Costo: 120, Stock: 8,
    ImagenURL: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
    ComplementoID: 'JEAN001'
  },
  {
    ID: 'JEAN001', Nombre: 'Jean Slim Roses', Categoria: 'Jeans',
    Precio_Actual: 420, Precio_Antes: 620, Costo: 220, Stock: 5,
    ImagenURL: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600',
    ComplementoID: 'CAM001'
  },
  {
    ID: 'CAM002', Nombre: 'Camiseta Rosa Atelier', Categoria: 'Camisetas',
    Precio_Actual: 280, Precio_Antes: 450, Costo: 130, Stock: 12,
    ImagenURL: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600',
    ComplementoID: 'JEAN002'
  },
  {
    ID: 'JEAN002', Nombre: 'Jean Wide Leg', Categoria: 'Jeans',
    Precio_Actual: 480, Precio_Antes: 650, Costo: 250, Stock: 3,
    ImagenURL: 'https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=600',
    ComplementoID: 'CAM002'
  },
  {
    ID: 'VES001', Nombre: 'Vestido Elegance', Categoria: 'Vestidos',
    Precio_Actual: 550, Precio_Antes: 900, Costo: 280, Stock: 4,
    ImagenURL: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600',
    ComplementoID: ''
  },
  {
    ID: 'BLU001', Nombre: 'Blusa Satin Rose', Categoria: 'Blusas',
    Precio_Actual: 320, Precio_Antes: 480, Costo: 150, Stock: 7,
    ImagenURL: 'https://images.unsplash.com/photo-1564257577400-1e8f88b0f1a0?w=600',
    ComplementoID: 'JEAN001'
  },
  {
    ID: 'CHA001', Nombre: 'Chaqueta Oversize', Categoria: 'Chaquetas',
    Precio_Actual: 650, Precio_Antes: 1100, Costo: 350, Stock: 2,
    ImagenURL: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600',
    ComplementoID: 'CAM001'
  },
  {
    ID: 'ACC001', Nombre: 'Cinturón Gold', Categoria: 'Accesorios',
    Precio_Actual: 150, Precio_Antes: 250, Costo: 60, Stock: 15,
    ImagenURL: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600',
    ComplementoID: ''
  }
];

// Configuración del descuento combo
const COMBO_DISCOUNT_PCT = 0.20; // 20% si lleva camiseta + jean

// ============ ESTADO GLOBAL ============
let cuponAplicado = null;
let productos = [];
let productoFiltrado = [];
let carrito = [];
let categoriaActiva = 'Todos';
let busquedaActual = '';

// ============ DOM REFS ============
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

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  cargarProductos();
  bindEvents();
});

function initLoader() {
  setTimeout(() => {
    $('#loader').classList.add('hidden');
  }, 1800);
}

async function cargarProductos() {
  renderSkeletons();

  // Si no hay URL configurada, usamos datos demo
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('TU_URL')) {
    setTimeout(() => {
      productos = DEMO_PRODUCTS;
      postCarga();
    }, 800);
    return;
  }

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getProducts`);
    const data = await res.json();
    productos = (data.products || []).map(p => ({
      ...p,
      Precio_Actual: Number(p.Precio_Actual) || 0,
      Precio_Antes: Number(p.Precio_Antes) || 0,
      Stock: Number(p.Stock) || 0,
      Costo: Number(p.Costo) || 0
    }));
    if (!productos.length) productos = DEMO_PRODUCTS;
    postCarga();
  } catch (err) {
    console.error('Error cargando productos, usando demo:', err);
    productos = DEMO_PRODUCTS;
    postCarga();
  }
}

function postCarga() {
  productoFiltrado = [...productos];
  renderCategorias();
  renderCatalogo();
  actualizarStat();
}

function renderSkeletons() {
  catalogEl.innerHTML = Array(8).fill('<div class="skeleton"></div>').join('');
}

function actualizarStat() {
  $('#statProducts').textContent = productos.length;
}

// ============ RENDER CATEGORÍAS ============
function renderCategorias() {
  const cats = ['Todos', ...new Set(productos.map(p => p.Categoria).filter(Boolean))];
  categoriesEl.innerHTML = cats.map(cat => `
    <button class="cat-chip ${cat === categoriaActiva ? 'active' : ''}" data-cat="${cat}">
      ${cat}
    </button>
  `).join('');

  categoriesEl.querySelectorAll('.cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      categoriaActiva = btn.dataset.cat;
      categoriesEl.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      aplicarFiltros();
    });
  });
}

// ============ FILTROS ============
function aplicarFiltros() {
  productoFiltrado = productos.filter(p => {
    const coincideCat = categoriaActiva === 'Todos' || p.Categoria === categoriaActiva;
    const texto = busquedaActual.toLowerCase().trim();
    const coincideBusqueda = !texto ||
      (p.Nombre || '').toLowerCase().includes(texto) ||
      (p.Categoria || '').toLowerCase().includes(texto);
    return coincideCat && coincideBusqueda;
  });
  renderCatalogo();
}

// ============ RENDER CATÁLOGO ============
function renderCatalogo() {
  if (!productoFiltrado.length) {
    catalogEl.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim)">
        <p style="font-size:2rem;margin-bottom:12px">🔍</p>
        <p>No encontramos prendas con esos filtros.</p>
      </div>`;
    return;
  }

  catalogEl.innerHTML = productoFiltrado.map((p, i) => {
    const tieneDesc = p.Precio_Antes > p.Precio_Actual;
    const pct = tieneDesc ? Math.round((1 - p.Precio_Actual / p.Precio_Antes) * 100) : 0;
    const soldOut = p.Stock <= 0;
    const stockClass = soldOut ? 'soldout' : (p.Stock <= 3 ? 'low' : '');
    const stockLabel = soldOut
      ? '<span class="dot"></span> Agotado'
      : `<span class="dot"></span> ${p.Stock <= 3 ? `¡Solo ${p.Stock}!` : `${p.Stock} disponibles`}`;

    return `
      <article class="product-card" data-id="${p.ID}" style="animation-delay:${i * 0.06}s">
        <div class="card-image">
          ${tieneDesc ? `<span class="discount-badge">-${pct}%</span>` : ''}
          <img src="${p.ImagenURL}" alt="${p.Nombre}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x500/17141f/e68caf?text=Shop+Roses'">
          <span class="stock-tag ${stockClass}">${stockLabel}</span>
        </div>
        <div class="card-body">
          <p class="card-cat">${p.Categoria || 'Prenda'}</p>
          <h3 class="card-title">${p.Nombre}</h3>
          <div class="card-prices">
            ${tieneDesc ? `<span class="price-old">$${p.Precio_Antes}</span>` : ''}
            <span class="price-new">$${p.Precio_Actual}</span>
          </div>
          <button class="card-cta" ${soldOut ? 'disabled' : ''} data-add="${p.ID}">
            ${soldOut ? 'Agotado' : 'Ver y agregar'}
          </button>
        </div>
      </article>
    `;
  }).join('');

  // Bind de las tarjetas
  catalogEl.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-add]')) return;
      abrirModal(card.dataset.id);
    });
  });
  catalogEl.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirModal(btn.dataset.add);
    });
  });
}

// ============ MODAL PRODUCTO ============
function abrirModal(id) {
  const p = productos.find(x => String(x.ID) === String(id));
  if (!p) return;
  const complemento = productos.find(x => String(x.ID) === String(p.ComplementoID));
  const tieneDesc = p.Precio_Antes > p.Precio_Actual;
  const soldOut = p.Stock <= 0;

  $('#modalContent').innerHTML = `
    <div class="modal-grid">
      <div class="modal-img">
        <img src="${p.ImagenURL}" alt="${p.Nombre}" onerror="this.src='https://via.placeholder.com/500x500/17141f/e68caf?text=Shop+Roses'">
      </div>
      <div class="modal-info">
        <p class="modal-cat">${p.Categoria || 'Prenda'}</p>
        <h2 class="modal-title">${p.Nombre}</h2>
        <div class="modal-prices">
          ${tieneDesc ? `<span class="price-old">$${p.Precio_Antes}</span>` : ''}
          <span class="price-new">$${p.Precio_Actual}</span>
        </div>
        <div class="modal-stock">
          ${soldOut ? '⚠️ Producto agotado por el momento' : `Disponibilidad en tienda: <strong>${p.Stock} unidades</strong>`}
        </div>
        <button class="modal-cta" ${soldOut ? 'disabled' : ''} data-modal-add="${p.ID}">
          ${soldOut ? 'Agotado' : 'Agregar a mi selección'}
        </button>

        ${complemento && complemento.Stock > 0 ? `
          <div class="cross-sell-box">
            <p class="cross-sell-title">🌹 Combínalo y ahorra 20%</p>
            <div class="cross-sell-item">
              <img src="${complemento.ImagenURL}" alt="${complemento.Nombre}" onerror="this.src='https://via.placeholder.com/100/17141f/e68caf?text=+'"">
              <div class="cross-sell-info">
                <h4>${complemento.Nombre}</h4>
                <p>+ $${complemento.Precio_Actual}</p>
              </div>
              <button class="cross-sell-add" data-modal-add="${complemento.ID}" title="Agregar complemento">+</button>
            </div>
            <p style="font-size:0.75rem;color:var(--text-mid);margin-top:12px">
              Al llevar ambos, aplicamos automáticamente el 20% en tu total.
            </p>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  $('#modalContent').querySelectorAll('[data-modal-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      agregarAlCarrito(btn.dataset.modalAdd);
      actualizarModalBoton(btn.dataset.modalAdd);
    });
  });

  $('#modalOverlay').classList.add('open');
}

function actualizarModalBoton(id) {
  const btns = $('#modalContent').querySelectorAll(`[data-modal-add="${id}"]`);
  btns.forEach(b => {
    if (b.classList.contains('modal-cta')) {
      b.textContent = '✓ Agregado — seguir viendo';
    } else {
      b.textContent = '✓';
    }
  });
}

function cerrarModal() {
  $('#modalOverlay').classList.remove('open');
}

// ============ CARRITO ============
function agregarAlCarrito(id) {
  const p = productos.find(x => String(x.ID) === String(id));
  if (!p || p.Stock <= 0) {
    mostrarToast('Producto sin stock', 'error');
    return;
  }
  const existente = carrito.find(x => String(x.id) === String(id));
  if (existente) {
    if (existente.cantidad + 1 > p.Stock) {
      mostrarToast('No hay más unidades disponibles', 'error');
      return;
    }
    existente.cantidad++;
  } else {
    carrito.push({
      id: p.ID,
      nombre: p.Nombre,
      precio: p.Precio_Actual,
      imagen: p.ImagenURL,
      categoria: p.Categoria,
      cantidad: 1
    });
  }
  actualizarCarrito();
  mostrarToast(`${p.Nombre} agregado 🌹`, 'success');
}

function cambiarCantidad(id, delta) {
  const item = carrito.find(x => String(x.id) === String(id));
  if (!item) return;
  const prod = productos.find(x => String(x.ID) === String(id));
  const nueva = item.cantidad + delta;

  if (nueva <= 0) {
    carrito = carrito.filter(x => String(x.id) !== String(id));
  } else if (prod && nueva > prod.Stock) {
    mostrarToast('Stock máximo alcanzado', 'error');
    return;
  } else {
    item.cantidad = nueva;
  }
  actualizarCarrito();
}

function eliminarDelCarrito(id) {
  carrito = carrito.filter(x => String(x.id) !== String(id));
  actualizarCarrito();
}

// ============ CÁLCULO DE COMBO ============
function calcularCombo() {
  const tieneCamiseta = carrito.some(i => (i.categoria || '').toLowerCase().includes('camiseta'));
  const tieneJean = carrito.some(i => (i.categoria || '').toLowerCase().includes('jean'));
  return tieneCamiseta && tieneJean;
}

function calcularTotales() {
  const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const aplicaCombo = calcularCombo();
  
  let descuentoCombo = aplicaCombo ? Math.round(subtotal * COMBO_DISCOUNT_PCT) : 0;
  let descuentoCupon = 0;

  // Si hay cupón, calculamos su descuento sobre lo que queda
  if (cuponAplicado) {
    if (cuponAplicado.Tipo === '%') {
      descuentoCupon = Math.round((subtotal - descuentoCombo) * (cuponAplicado.Valor / 100));
    } else {
      descuentoCupon = cuponAplicado.Valor;
    }
  }

  const descuentoTotal = descuentoCombo + descuentoCupon;
  const total = Math.max(0, subtotal - descuentoTotal);
  
  return { subtotal, descuento: descuentoTotal, total, aplicaCombo };
}

function actualizarCarrito() {
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);

  // Badge del header
  cartCount.textContent = totalItems;
  cartCount.classList.toggle('show', totalItems > 0);

  // Encabezado del drawer
  drawerSub.textContent = `${totalItems} prenda${totalItems !== 1 ? 's' : ''}`;

  // Items
  if (!carrito.length) {
    cartItemsEl.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-icon">🌹</div>
        <p>Tu selección está vacía</p>
        <p style="margin-top:8px;font-size:0.8rem">Toca una prenda para agregarla</p>
      </div>
    `;
  } else {
    cartItemsEl.innerHTML = carrito.map(i => `
      <div class="cart-item" data-cid="${i.id}">
        <img src="${i.imagen}" alt="${i.nombre}" onerror="this.src='https://via.placeholder.com/70/17141f/e68caf?text=+'"">
        <div class="cart-item-info">
          <h4>${i.nombre}</h4>
          <span class="cart-item-price">$${i.precio * i.cantidad}</span>
          <div class="cart-item-qty">
            <button class="qty-btn" data-dec="${i.id}">−</button>
            <span class="qty-num">${i.cantidad}</span>
            <button class="qty-btn" data-inc="${i.id}">+</button>
          </div>
        </div>
        <button class="remove-btn" data-del="${i.id}" title="Eliminar">✕</button>
      </div>
    `).join('');

    cartItemsEl.querySelectorAll('[data-inc]').forEach(b => b.addEventListener('click', () => cambiarCantidad(b.dataset.inc, 1)));
    cartItemsEl.querySelectorAll('[data-dec]').forEach(b => b.addEventListener('click', () => cambiarCantidad(b.dataset.dec, -1)));
    cartItemsEl.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => eliminarDelCarrito(b.dataset.del)));
  }

  // Totales
  const { subtotal, descuento, total, aplicaCombo } = calcularTotales();
  cartSubtotal.textContent = `$${subtotal}`;
  if (descuento > 0) {
    cartDiscountRow.style.display = 'flex';
    cartDiscount.textContent = `-$${descuento}`;
  } else {
    cartDiscountRow.style.display = 'none';
  }
  cartTotal.textContent = `$${total}`;

  // Hint combo
  if (carrito.length > 0 && !aplicaCombo) {
    comboHint.classList.add('show');
    comboHint.innerHTML = '🌹 <strong>Tip:</strong> Agrega una camiseta + un jean y obtén <strong>20% OFF</strong> automático.';
  } else if (aplicaCombo) {
    comboHint.classList.add('show');
    comboHint.innerHTML = '✓ ¡Combo aplicado! Estás ahorrando <strong>20%</strong> en tu compra.';
  } else {
    comboHint.classList.remove('show');
  }

  // Guardar carrito localmente
  try { localStorage.setItem('shoproses_cart', JSON.stringify(carrito)); } catch(e) {}
}

// ============ DRAWER ============
function abrirCarrito() {
  cartDrawer.classList.add('open');
  drawerOverlay.classList.add('open');
}
function cerrarCarrito() {
  cartDrawer.classList.remove('open');
  drawerOverlay.classList.remove('open');
}

// ============ CHECKOUT ============
async function finalizarCompra() {
  if (!carrito.length) {
    mostrarToast('Tu selección está vacía', 'error');
    return;
  }

  const { subtotal, descuento, total } = calcularTotales();
  const btn = $('#checkoutBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>Enviando pedido...</span>';

  const payload = {
    action: 'placeOrder',
    items: carrito.map(i => ({
      id: i.id,
      nombre: i.nombre,
      cantidad: i.cantidad,
      precio: i.precio
    })),
    subtotal,
    descuento,
    total,
    vendedor: 'Tablet Shop Roses',
    canal: 'Tienda física'
  };

  try {
    let orderId = 'ORD-' + Date.now();
    if (APPS_SCRIPT_URL && !APPS_SCRIPT_URL.includes('TU_URL')) {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      const data = await res.json();
      if (data.status === 'success' && data.orderId) orderId = data.orderId;
    } else {
      // Modo demo: simulamos
      await new Promise(r => setTimeout(r, 900));
    }

    // Éxito
    mostrarExito(orderId);
    carrito = [];
    actualizarCarrito();
    cerrarCarrito();
    try { localStorage.removeItem('shoproses_cart'); } catch(e) {}
    cargarProductos(); // recargar stock
  } catch (err) {
    console.error(err);
    mostrarToast('Error al enviar. Avisa al vendedor.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Confirmar pedido</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  }
}

function mostrarExito(orderId) {
  $('#successOrder').textContent = `Pedido ${orderId}`;
  $('#successOverlay').classList.add('open');
}

// ============ TOASTS ============
function mostrarToast(msg, tipo = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, 2400);
}

// ============ EVENTOS GLOBALES ============
function bindEvents() {
  // Header
  $('#cartBtn').addEventListener('click', abrirCarrito);
  $('#helpBtn').addEventListener('click', () => {
    mostrarToast('Pide ayuda a nuestro vendedor en mostrador 🌹', 'success');
  });

  // Search
  searchInput.addEventListener('input', (e) => {
    busquedaActual = e.target.value;
    aplicarFiltros();
  });

  // Drawer
  $('#closeDrawer').addEventListener('click', cerrarCarrito);
  drawerOverlay.addEventListener('click', cerrarCarrito);

  // Modal producto
  $('#closeModal').addEventListener('click', cerrarModal);
  $('#modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') cerrarModal();
  });

  // Success modal
  $('#successClose').addEventListener('click', () => {
    $('#successOverlay').classList.remove('open');
  });
  $('#successOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'successOverlay') $('#successOverlay').classList.remove('open');
  });

  // Checkout
  $('#checkoutBtn').addEventListener('click', finalizarCompra);

  // Header scroll
  window.addEventListener('scroll', () => {
    $('#header').classList.toggle('scrolled', window.scrollY > 30);
  });

  // Cargar carrito persistido
  try {
    const saved = localStorage.getItem('shoproses_cart');
    if (saved) {
      carrito = JSON.parse(saved);
      actualizarCarrito();
    }
  } catch(e) {}
}

document.getElementById('btnCoupon')?.addEventListener('click', async () => {
  const code = document.getElementById('couponInput').value.trim().toUpperCase();
  if(!code) return;

  // Buscar cupón en el Sheet (Nueva función en Apps Script)
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=validarCupon&code=${code}`);
    const data = await res.json();
    
    if(data.status === 'success') {
      cuponAplicado = { Codigo: code, Tipo: data.tipo, Valor: data.valor };
      mostrarToast(`Cupón ${code} aplicado`, 'success');
      actualizarCarrito();
    } else {
      mostrarToast('Cupón inválido o expirado', 'error');
    }
  } catch(e) {
    mostrarToast('Error validando cupón', 'error');
  }
});
