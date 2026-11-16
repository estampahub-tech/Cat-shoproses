// ==========================================================
// SHOP ROSES · Catálogo (Checkout en Modal)
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
  setTimeout(() => { $('#loader')?.classList.add('hidden'); }, 1500);
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
  } catch (err) { 
    console.error('Error cargando:', err); 
    $('#loader')?.classList.add('hidden');
  }
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
  if (!productoFiltrado.length) {
    catalogEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim)"><p>No hay prendas.</p></div>`;
    return;
  }
  
  catalogEl.innerHTML = productoFiltrado.map((p, i) => {
    const tieneDesc = p.Precio_Antes > p.Precio_Actual;
    const pct = tieneDesc ? Math.round((1 - p.Precio_Actual / p.Precio_Antes) * 100) : 0;
    const soldOut = p.Stock <= 0;
    const enCarrito = carrito.find(c => String(c.id) === String(p.ID));
    
    return `
      <article class="product-card" data-id="${p.ID}" style="animation-delay:${i * 0.06}s">
        <div class="card-image">
          ${tieneDesc ? `<span class="discount-badge">-${pct}%</span>` : ''}
          <img src="${p.ImagenURL}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x500/17141f/e68caf?text=Shop+Roses'">
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

  let tallasOpciones = '';
  if (p.Tallas) {
    tallasOpciones = String(p.Tallas).split(',').map(t => `<option value="${t.trim()}">${t.trim()}</option>`).join('');
  }

  let complementosHTML = '';
  if (p.ComplementoID) {
    let itemsCrossSell = '';
    String(p.ComplementoID).split(',').forEach(compId => {
      const complemento = productos.find(x => String(x.ID) === String(compId.trim()));
      if (complemento && complemento.Stock > 0) {
        const enCarritoComp = carrito.find(c => String(c.id) === String(complemento.ID));
        itemsCrossSell += `
          <div class="cross-sell-item" style="margin-bottom: 10px; display:flex; gap:10px; background:#1f1b2b; padding:10px; border-radius:8px;">
            <img src="${complemento.ImagenURL}" style="width:40px; height:40px; object-fit:cover; border-radius:5px;">
            <div style="flex:1;">
              <h4 style="font-size:0.8rem; margin:0;">${complemento.Nombre}</h4>
              <p style="font-size:0.8rem; color:#e68caf; margin:0;">+ $${complemento.Precio_Actual}</p>
            </div>
            <button onclick="abrirModal('${complemento.ID}')" style="background:#e68caf; border:none; width:25px; border-radius:50%; cursor:pointer;">${enCarritoComp ? '✓' : '+'}</button>
          </div>`;
      }
    });
    if (itemsCrossSell) complementosHTML = `<div style="margin-top:15px; border-top:1px dashed #444; padding-top:10px;"><p style="font-size:0.8rem; color:#e68caf;">Combínalo:</p>${itemsCrossSell}</div>`;
  }

  const enCarritoPrincipal = carrito.find(c => String(c.id) === String(p.ID));
  
  $('#modalContent').innerHTML = `
    <div class="modal-grid">
      <div class="modal-img"><img src="${p.ImagenURL}"></div>
      <div class="modal-info">
        <p class="modal-cat">${p.Categoria}</p>
        <h2 class="modal-title">${p.Nombre}</h2>
        <div class="modal-prices">
          ${p.Precio_Antes > p.Precio_Actual ? `<span class="price-old">$${p.Precio_Antes}</span>` : ''}
          <span class="price-new">$${p.Precio_Actual}</span>
        </div>
        ${p.Tallas ? `
          <div style="margin:15px 0;">
            <label style="display:block; font-size:0.8rem; color:#b0a5b3;">Talla:</label>
            <select id="selectTalla" style="width:100%; padding:10px; background:#17141f; color:white; border:1px solid #e68caf; border-radius:8px;">${tallasOpciones}</select>
          </div>` : ''}
        <button class="modal-cta" ${p.Stock <= 0 && !enCarritoPrincipal ? 'disabled' : ''} onclick="agregarAlCarrito('${p.ID}')">
          ${enCarritoPrincipal ? 'Agregar otra unidad' : 'Agregar a mi selección'}
        </button>
        ${complementosHTML}
      </div>
    </div>
  `;
  $('#modalOverlay').classList.add('open');
}

window.agregarAlCarrito = function(id) {
  const p = productos.find(x => String(x.ID) === String(id));
  const tallaSelect = document.getElementById('selectTalla');
  const tallaElegida = tallaSelect ? tallaSelect.value : 'Única';

  const existente = carrito.find(x => String(x.id) === String(id) && x.talla === tallaElegida);
  if (existente) { existente.cantidad++; } 
  else { carrito.push({ id: p.ID, nombre: p.Nombre, precio: p.Precio_Actual, talla: tallaElegida, proveedor: p.Proveedor, cantidad: 1 }); }
  
  cerrarModal();
  actualizarCarrito();
  mostrarToast(`Agregado: ${p.Nombre}`, 'success');
}

function cerrarModal() { $('#modalOverlay').classList.remove('open'); }

function actualizarCarrito() {
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);
  cartCount.textContent = totalItems;
  cartCount.classList.toggle('show', totalItems > 0);
  drawerSub.textContent = `${totalItems} prenda${totalItems !== 1 ? 's' : ''}`;
  
  if (!carrito.length) {
    cartItemsEl.innerHTML = `<div style="text-align:center; padding:20px; color:#aaa;">Vacío</div>`;
  } else {
    cartItemsEl.innerHTML = carrito.map((i, index) => `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${i.nombre}</h4>
          <p style="font-size:0.75rem;color:#b0a5b3">Talla: ${i.talla}</p>
          <span class="cart-item-price">$${i.precio * i.cantidad}</span>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="cambiarCantidad(${index}, -1)">−</button>
            <span>${i.cantidad}</span>
            <button class="qty-btn" onclick="cambiarCantidad(${index}, 1)">+</button>
          </div>
        </div>
        <button class="remove-btn" onclick="eliminarDelCarrito(${index})">✕</button>
      </div>
    `).join('');
  }

  const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  let descuento = cuponAplicado ? (cuponAplicado.Tipo === '%' ? Math.round(subtotal * (cuponAplicado.Valor/100)) : cuponAplicado.Valor) : 0;
  const total = Math.max(0, subtotal - descuento);

  cartSubtotal.textContent = `$${subtotal}`;
  if (descuento > 0) { cartDiscountRow.style.display = 'flex'; cartDiscount.textContent = `-$${descuento}`; comboHint.innerHTML = `✓ Cupón ${cuponAplicado.Codigo} aplicado.`; comboHint.style.display='block'; } 
  else { cartDiscountRow.style.display = 'none'; comboHint.style.display='none'; }
  cartTotal.textContent = `$${total}`;
}

window.cambiarCantidad = function(index, delta) {
  carrito[index].cantidad += delta;
  if (carrito[index].cantidad <= 0) carrito.splice(index, 1);
  actualizarCarrito();
}
window.eliminarDelCarrito = function(index) { carrito.splice(index, 1); actualizarCarrito(); }

// ABRIR EL MODAL DE CHECKOUT EN VEZ DE PROMPTS
function finalizarCompra() {
  if (!carrito.length) return mostrarToast('Tu selección está vacía', 'error');
  document.getElementById('checkoutOverlay').classList.add('open');
}

// PROCESAR EL PAGO DESDE EL MODAL
async function procesarPago() {
  const nombre = document.getElementById('cli_nombre').value.trim();
  const cedula = document.getElementById('cli_cedula').value.trim();
  const celular = document.getElementById('cli_celular').value.trim();
  const email = document.getElementById('cli_email').value.trim();

  if (!nombre || !cedula || !celular) return alert('Por favor completa los campos obligatorios (Nombre, Cédula y Celular).');

  const btn = document.getElementById('btnProcesarPago');
  btn.disabled = true;
  btn.textContent = 'Procesando...';

  const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  let descuento = cuponAplicado ? (cuponAplicado.Tipo === '%' ? Math.round(subtotal * (cuponAplicado.Valor/100)) : cuponAplicado.Valor) : 0;
  const total = Math.max(0, subtotal - descuento);

  const payload = {
    action: 'placeOrder', items: carrito, subtotal: subtotal, descuento: descuento, total: total,
    cliente_nombre: nombre, cliente_id: cedula, cliente_cel: celular, cliente_email: email
  };

  try {
    const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    const textoRespuesta = await res.text();
    let data;
    
    try { data = JSON.parse(textoRespuesta); } 
    catch(e) { if(res.ok) data = { status: 'success', orderId: 'Confirmado' }; else throw new Error('Error en el servidor'); }

    if (data.status === 'success') {
      document.getElementById('checkoutOverlay').classList.remove('open');
      $('#successOrder').textContent = `Pedido ${data.orderId || 'Confirmado'}`;
      $('#successOverlay').classList.add('open');
      
      carrito = []; cuponAplicado = null; 
      if($('#couponInput')) $('#couponInput').value = ''; 
      actualizarCarrito(); cerrarCarrito();
      
      document.getElementById('cli_nombre').value = ''; document.getElementById('cli_cedula').value = '';
      document.getElementById('cli_celular').value = ''; document.getElementById('cli_email').value = '';
      
      cargarProductos(); 
    } else { alert('Error: ' + data.message); }
  } catch (e) { 
    alert('Error de conexión. Avisa al vendedor.'); 
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar Pedido';
  }
}

function mostrarToast(msg, tipo) {
  const t = document.createElement('div'); t.className = `toast ${tipo}`; t.textContent = msg;
  toastContainer.appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2400);
}

function bindEvents() {
  $('#cartBtn')?.addEventListener('click', () => { $('#cartDrawer').classList.add('open'); $('#drawerOverlay').classList.add('open'); });
  $('#closeDrawer')?.addEventListener('click', () => { $('#cartDrawer').classList.remove('open'); $('#drawerOverlay').classList.remove('open'); });
  $('#drawerOverlay')?.addEventListener('click', () => { $('#cartDrawer').classList.remove('open'); $('#drawerOverlay').classList.remove('open'); });
  $('#checkoutBtn')?.addEventListener('click', finalizarCompra);
  
  $('#btnCancelCheckout')?.addEventListener('click', () => { document.getElementById('checkoutOverlay').classList.remove('open'); });
  $('#btnProcesarPago')?.addEventListener('click', procesarPago);

  $('#closeModal')?.addEventListener('click', cerrarModal);
  $('#modalOverlay')?.addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') cerrarModal(); });
  $('#successClose')?.addEventListener('click', () => $('#successOverlay').classList.remove('open'));
  searchInput?.addEventListener('input', (e) => { busquedaActual = e.target.value; aplicarFiltros(); });

  $('#btnCoupon')?.addEventListener('click', async () => {
    const code = $('#couponInput').value.trim().toUpperCase(); if(!code) return;
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=validarCupon&code=${code}&t=${Date.now()}`);
      const data = await res.json();
      if(data.status === 'success') { cuponAplicado = { Codigo: code, Tipo: data.tipo, Valor: data.valor }; mostrarToast(`Aplicado`, 'success'); actualizarCarrito(); }
      else { mostrarToast('Inválido', 'error'); }
    } catch(e) { mostrarToast('Error', 'error'); }
  });
}
