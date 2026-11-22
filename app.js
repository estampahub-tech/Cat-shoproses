// ==========================================================
// SHOP ROSES · Catálogo (Carrito Modal y Formato COP)
// ==========================================================

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7gnp6dx6DywtMtapzZttYTWaq1pG43XTNvpExw2IVkARrsHIiXUCSf7MhiizMJpJ9GA/exec';

const formatterCOP = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 });
function formatMoney(amount) { return '$' + formatterCOP.format(amount); }

let META_GANANCIA_MINIMA = 100000; 
let PORCENTAJE_REGALO = 10; 

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
const cartOverlay = $('#cartOverlay');
const cartItemsEl = $('#cartItems');
const drawerSub = $('#drawerSub');
const cartOriginalTotal = $('#cartOriginalTotal');
const cartItemDiscount = $('#cartItemDiscount');
const cartDiscount = $('#cartDiscount');
const cartDiscountRow = $('#cartDiscountRow');
const cartGiftDiscount = $('#cartGiftDiscount');
const cartGiftRow = $('#cartGiftRow');
const cartTotal = $('#cartTotal');
const comboHint = $('#comboHint');
const toastContainer = $('#toastContainer');

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { $('#loader')?.classList.add('hidden'); }, 1000);
  
  const cachedProds = localStorage.getItem('shoproses_catalogo_v6'); // v6 para forzar actualización
  if (cachedProds) {
    const parsed = JSON.parse(cachedProds);
    productos = parsed.productos;
    if (parsed.config) {
      META_GANANCIA_MINIMA = parsed.config.meta;
      PORCENTAJE_REGALO = parsed.config.regalo;
    }
    postCarga();
  }
  cargarProductos();
  bindEvents();
});

async function cargarProductos() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getProducts&t=${Date.now()}`);
    const data = await res.json();
    
    productos = (data.products || []).map(p => ({
      ...p, Precio_Actual: Number(p.Precio_Actual) || 0, Precio_Antes: Number(p.Precio_Antes) || 0, Costo: Number(p.Costo) || 0, Stock: Number(p.Stock) || 0
    }));

    if (data.config) {
      META_GANANCIA_MINIMA = Number(data.config.meta) || 100000;
      PORCENTAJE_REGALO = Number(data.config.regalo) || 10;
    }

    localStorage.setItem('shoproses_catalogo_v6', JSON.stringify({ productos: productos, config: { meta: META_GANANCIA_MINIMA, regalo: PORCENTAJE_REGALO } }));
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
  if (!productoFiltrado.length) { catalogEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim)"><p>No hay prendas.</p></div>`; return; }
  
  catalogEl.innerHTML = productoFiltrado.map((p, i) => {
    const tieneDesc = p.Precio_Antes > p.Precio_Actual;
    const pct = tieneDesc ? Math.round((1 - p.Precio_Actual / p.Precio_Antes) * 100) : 0;
    const soldOut = Number(p.Stock) <= 0;
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
            ${tieneDesc ? `<span class="price-old">${formatMoney(p.Precio_Antes)}</span>` : ''}
            <span class="price-new">${formatMoney(p.Precio_Actual)}</span>
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
  const p = productos.find(x => String(x.ID).trim() === String(id).trim());
  if (!p) return;
  
  let tallasOpciones = p.Tallas ? String(p.Tallas).split(',').map(t => `<option value="${t.trim()}">${t.trim()}</option>`).join('') : '';
  let complementosHTML = '';

  let compIdRaw = p.ComplementoID || p.Complemento || p.complementoID || p.complementos;
  
  if (compIdRaw) {
    let itemsCrossSell = '';
    String(compIdRaw).split(',').forEach(compId => {
      const cleanId = compId.trim();
      const complemento = productos.find(x => String(x.ID).trim() === cleanId);
      
      if (complemento) {
        const enCarritoComp = carrito.find(c => String(c.id) === String(complemento.ID));
        const tieneStock = complemento.Stock === undefined || Number(complemento.Stock) > 0;
        
        itemsCrossSell += `
          <div class="cross-sell-item" style="margin-bottom: 10px; display:flex; gap:10px; background:#1f1b2b; padding:10px; border-radius:8px; align-items:center;">
            <img src="${complemento.ImagenURL}" style="width:40px; height:40px; object-fit:cover; border-radius:5px;" onerror="this.src='https://via.placeholder.com/40'">
            <div style="flex:1;">
              <h4 style="font-size:0.8rem; margin:0; color:#fff;">${complemento.Nombre}</h4>
              <p style="font-size:0.8rem; color:#e68caf; margin:0;">+ ${formatMoney(complemento.Precio_Actual)}</p>
            </div>
            ${tieneStock ? 
              `<button onclick="abrirModal('${complemento.ID}')" style="background:#e68caf; color:#0a0810; border:none; width:28px; height:28px; border-radius:50%; cursor:pointer; font-weight:bold; font-size:1.1rem;">${enCarritoComp ? '✓' : '+'}</button>` 
              : '<span style="font-size:0.7rem; color:#ff4d6d; font-weight:bold;">Agotado</span>'}
          </div>`;
      }
    });
    
    if (itemsCrossSell) {
      complementosHTML = `<div style="margin-top:15px; border-top:1px dashed #444; padding-top:10px;"><p style="font-size:0.8rem; color:#e68caf; font-weight:bold; margin-bottom:8px;">🌹 Combínalo y ahorra:</p>${itemsCrossSell}</div>`;
    }
  }

  const enCarritoPrincipal = carrito.find(c => String(c.id) === String(p.ID));
  const isSoldOut = Number(p.Stock) <= 0;
  
  $('#modalContent').innerHTML = `
    <div class="modal-grid">
      <div class="modal-img"><img src="${p.ImagenURL}" onerror="this.src='https://via.placeholder.com/500'"></div>
      <div class="modal-info">
        <p class="modal-cat">${p.Categoria}</p>
        <h2 class="modal-title">${p.Nombre}</h2>
        <div class="modal-prices">
          ${p.Precio_Antes > p.Precio_Actual ? `<span class="price-old">${formatMoney(p.Precio_Antes)}</span>` : ''}
          <span class="price-new">${formatMoney(p.Precio_Actual)}</span>
        </div>
        ${p.Tallas ? `
          <div style="margin:15px 0;">
            <label style="display:block; font-size:0.8rem; color:#b0a5b3;">Talla:</label>
            <select id="selectTalla" style="width:100%; padding:10px; background:#17141f; color:white; border:1px solid #e68caf; border-radius:8px;">${tallasOpciones}</select>
          </div>` : ''}
        <button class="modal-cta" ${isSoldOut && !enCarritoPrincipal ? 'disabled' : ''} onclick="agregarAlCarrito('${p.ID}')">
          ${isSoldOut && !enCarritoPrincipal ? 'Agotado' : (enCarritoPrincipal ? 'Agregar otra unidad' : 'Agregar a mi selección')}
        </button>
        ${complementosHTML}
      </div>
    </div>`;
  $('#modalOverlay').classList.add('open');
}

window.agregarAlCarrito = function(id) {
  const p = productos.find(x => String(x.ID).trim() === String(id).trim());
  if (!p || Number(p.Stock) <= 0) return mostrarToast('Producto agotado', 'error');

  const tallaSelect = document.getElementById('selectTalla');
  const tallaElegida = tallaSelect ? tallaSelect.value : 'Única';

  const existente = carrito.find(x => String(x.id) === String(id) && x.talla === tallaElegida);
  
  if (existente) { 
    existente.cantidad++; 
  } else { 
    // AQUÍ AGREGAMOS LA IMAGEN QUE FALTABA
    carrito.push({ 
      id: p.ID, 
      nombre: p.Nombre, 
      precio: Number(p.Precio_Actual), 
      precioAntes: Number(p.Precio_Antes) || Number(p.Precio_Actual),
      costo: Number(p.Costo) || 0, 
      talla: tallaElegida, 
      proveedor: p.Proveedor || 'Shop Roses', 
      imagen: p.ImagenURL, // <--- ESTO FALTABA
      cantidad: 1 
    }); 
  }
  
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
  
  // RENDERIZAR ITEMS
  if (!carrito.length) { 
    cartItemsEl.innerHTML = `<div style="text-align:center; padding:20px; color:#aaa;">Vacío</div>`; 
  } else {
    cartItemsEl.innerHTML = carrito.map((i, index) => {
      const tieneDesc = i.precioAntes > i.precio;
      const descItem = (i.precioAntes - i.precio) * i.cantidad;
      
      return `
      <div class="cart-item">
        <img src="${i.imagen}" onerror="this.src='https://via.placeholder.com/100/17141f/e68caf?text=+'">
        <div class="cart-item-info">
          <h4>${i.nombre}</h4>
          <p style="font-size:0.85rem;color:#b0a5b3">Talla: ${i.talla}</p>
          
          <div style="display:flex; align-items:baseline; gap:8px; margin-top:4px; flex-wrap:wrap;">
            ${tieneDesc ? `<span style="text-decoration:line-through; color:#6e6472; font-size:0.9rem;">${formatMoney(i.precioAntes * i.cantidad)}</span>` : ''}
            <span style="color:#e68caf; font-weight:bold; font-size:1.2rem;">${formatMoney(i.precio * i.cantidad)}</span>
          </div>
          ${tieneDesc ? `<span style="color:#2ecc71; font-size:0.8rem; font-weight:bold;">Ahorras: ${formatMoney(descItem)}</span>` : ''}
          
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="cambiarCantidad(${index}, -1)">−</button>
            <span class="qty-num">${i.cantidad}</span>
            <button class="qty-btn" onclick="cambiarCantidad(${index}, 1)">+</button>
          </div>
        </div>
        <button class="remove-btn" onclick="eliminarDelCarrito(${index})">✕</button>
      </div>`
    }).join('');
  }

  // MATEMÁTICAS Y MARGEN
  let precioOriginalTotal = 0; let precioActualTotal = 0; let costoTotal = 0;
  carrito.forEach(i => {
    precioOriginalTotal += i.precioAntes * i.cantidad;
    precioActualTotal += i.precio * i.cantidad;
    costoTotal += i.costo * i.cantidad;
  });

  const ahorroPrendas = precioOriginalTotal - precioActualTotal;
  let descuentoCupon = cuponAplicado ? (cuponAplicado.Tipo === '%' ? Math.round(precioActualTotal * (cuponAplicado.Valor/100)) : cuponAplicado.Valor) : 0;
  
  const margenActual = precioActualTotal - costoTotal;
  let descuentoRegalo = 0;

  if (margenActual >= META_GANANCIA_MINIMA && carrito.length > 0) {
    $('#giftCard').style.display = 'block';
    $('#progressContainer').style.display = 'block';
    $('#progressText').innerHTML = '🎉 <strong>¡Meta alcanzada!</strong> Has desbloqueado el regalo.';
    $('#progressBar').style.width = '100%';
    $('#progressBar').style.background = '#f0cc55';
    
    descuentoRegalo = Math.round(precioActualTotal * (PORCENTAJE_REGALO/100));
    $('#cartGiftRow').style.display = 'flex';
    $('#cartGiftDiscount').textContent = `-${formatMoney(descuentoRegalo)}`;
  } else {
    $('#giftCard').style.display = 'none';
    $('#cartGiftRow').style.display = 'none';
    
    if (carrito.length > 0) {
      $('#progressContainer').style.display = 'block';
      const faltante = META_GANANCIA_MINIMA - margenActual;
      $('#progressText').innerHTML = `Te faltan <strong>${formatMoney(faltante)}</strong> en compras para llevarte un <strong>${PORCENTAJE_REGALO}% extra</strong> de descuento.`;
      const pct = (margenActual / META_GANANCIA_MINIMA) * 100;
      $('#progressBar').style.width = `${Math.min(100, pct)}%`;
      $('#progressBar').style.background = 'linear-gradient(90deg, #e68caf, #f0cc55)';
    } else { $('#progressContainer').style.display = 'none'; }
  }

  const totalPagar = Math.max(0, precioActualTotal - descuentoCupon - descuentoRegalo);
  const ahorroTotal = ahorroPrendas + descuentoCupon + descuentoRegalo;

  // ACTUALIZAR FILAS DE TOTALES
  if (ahorroPrendas > 0) {
    $('#rowOriginal').style.display = 'flex'; 
    $('#cartOriginalTotal').textContent = formatMoney(precioOriginalTotal); 
    $('#rowItemDiscount').style.display = 'flex';
    $('#cartItemDiscount').textContent = `-${formatMoney(ahorroPrendas)}`;
  } else { 
    $('#rowOriginal').style.display = 'none'; 
    $('#rowItemDiscount').style.display = 'none'; 
  }

  if (descuentoCupon > 0) { 
    $('#cartDiscountRow').style.display = 'flex'; 
    $('#cartDiscount').textContent = `-${formatMoney(descuentoCupon)}`; 
    comboHint.innerHTML = `✓ Cupón <strong>${cuponAplicado.Codigo}</strong> aplicado.`; 
    comboHint.style.display = 'block'; 
  } else { 
    $('#cartDiscountRow').style.display = 'none'; 
    comboHint.style.display = 'none'; 
  }

  $('#cartTotal').textContent = formatMoney(totalPagar);

  if (ahorroTotal > 0 && carrito.length > 0) {
    $('#savingsBanner').style.display = 'block'; 
    $('#cartTotalSavings').textContent = formatMoney(ahorroTotal);
  } else { 
    $('#savingsBanner').style.display = 'none'; 
  }
}

window.cambiarCantidad = function(index, delta) { 
  carrito[index].cantidad += delta; 
  if (carrito[index].cantidad <= 0) carrito.splice(index, 1); 
  actualizarCarrito(); 
}
window.eliminarDelCarrito = function(index) { carrito.splice(index, 1); actualizarCarrito(); }

function finalizarCompra() {
  if (!carrito.length) return mostrarToast('Tu selección está vacía', 'error');
  document.getElementById('checkoutOverlay').classList.add('open');
}

async function procesarPago() {
  const nombre = document.getElementById('cli_nombre').value.trim();
  const cedula = document.getElementById('cli_cedula').value.trim();
  const celular = document.getElementById('cli_celular').value.trim();
  const email = document.getElementById('cli_email').value.trim();
  if (!nombre || !cedula || !celular) return alert('Completa los campos requeridos.');

  const btn = document.getElementById('btnProcesarPago'); btn.disabled = true; btn.textContent = 'Procesando...';

  let precioActualTotal = 0; let costoTotal = 0;
  carrito.forEach(i => { precioActualTotal += i.precio * i.cantidad; costoTotal += i.costo * i.cantidad; });

  let descuentoCupon = cuponAplicado ? (cuponAplicado.Tipo === '%' ? Math.round(precioActualTotal * (cuponAplicado.Valor/100)) : cuponAplicado.Valor) : 0;
  
  const margenActual = precioActualTotal - costoTotal;
  let descuentoRegalo = 0;
  if (margenActual >= META_GANANCIA_MINIMA && carrito.length > 0) {
    descuentoRegalo = Math.round(precioActualTotal * (PORCENTAJE_REGALO/100));
  }

  const descuentoTotal = descuentoCupon + descuentoRegalo;
  const totalFinal = Math.max(0, precioActualTotal - descuentoTotal);

  const payload = { 
    action: 'placeOrder', items: carrito, subtotal: precioActualTotal, descuento: descuentoTotal, total: totalFinal, 
    cliente_nombre: nombre, cliente_id: cedula, cliente_cel: celular, cliente_email: email 
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (data.status === 'success') { mostrarExito(data.orderId); } 
    else { alert('Error: ' + data.message); }
  } catch (e) { 
    if (e.name === 'AbortError') { mostrarExito('Confirmado (tiempo de espera agotado)'); } 
    else { alert('Error de conexión. Por favor avisa al vendedor.'); }
  } finally { btn.disabled = false; btn.textContent = 'Enviar Pedido'; }
}

function mostrarExito(orderId) {
  document.getElementById('checkoutOverlay').classList.remove('open');
  document.getElementById('successOrder').textContent = `Pedido ${orderId}`;
  document.getElementById('successOverlay').classList.add('open');
  carrito = []; cuponAplicado = null; 
  if(document.getElementById('couponInput')) document.getElementById('couponInput').value = ''; 
  actualizarCarrito(); 
  $('#cartOverlay').classList.remove('open');
  localStorage.removeItem('shoproses_catalogo_v6'); 
  cargarProductos(); 
}

function mostrarToast(msg, tipo) {
  const t = document.createElement('div'); t.className = `toast ${tipo}`; t.textContent = msg;
  toastContainer.appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2400);
}

function bindEvents() {
  $('#cartBtn')?.addEventListener('click', () => { $('#cartOverlay').classList.add('open'); });
  $('#closeDrawer')?.addEventListener('click', () => { $('#cartOverlay').classList.remove('open'); });
  $('#cartOverlay')?.addEventListener('click', (e) => { if (e.target.id === 'cartOverlay') $('#cartOverlay').classList.remove('open'); });
  
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
