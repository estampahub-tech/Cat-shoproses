// ==========================================================
// SHOP ROSES · Panel Vendedor
// ==========================================================

// ⚠️ Misma URL de tu Apps Script (la del catálogo)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyMZXHusnZeH5EwZo0RkbbjSm-ngJJTuoV8gncEUzzM1G-I3yxD6R6L3HvegCfz_V3w/exec';

// ============ ESTADO ============
let pedidos = [];
let pedidosFiltrados = [];
let busqueda = '';
let pedidoPendienteConfirmar = null;
let autoRefreshInterval = null;

// ============ REFS ============
const $ = (sel) => document.querySelector(sel);
const pedidosList = $('#pedidosList');
const emptyState = $('#emptyState');
const countPendientes = $('#countPendientes');
const countEmpacados = $('#countEmpacados');
const countVentas = $('#countVentas');
const searchInput = $('#searchPedido');
const toastContainer = $('#toastContainer');
const confirmOverlay = $('#confirmOverlay');

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', () => {
  renderSkeletons();
  cargarPedidos();
  cargarStats();
  bindEvents();
  iniciarAutoRefresh();
});

function iniciarAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => {
    cargarPedidos(true);
    cargarStats(true);
  }, 30000); // cada 30 segundos
}

function bindEvents() {
  $('#btnRefresh').addEventListener('click', () => {
    cargarPedidos();
    cargarStats();
  });

  searchInput.addEventListener('input', (e) => {
    busqueda = e.target.value.toLowerCase().trim();
    aplicarFiltro();
  });

  $('#btnCancel').addEventListener('click', cerrarConfirm);
  confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) cerrarConfirm();
  });
  $('#btnConfirm').addEventListener('click', ejecutarEmpaque);
}

// ============ SKELETONS ============
function renderSkeletons() {
  pedidosList.innerHTML = Array(4).fill('<div class="skeleton-card"></div>').join('');
}

// ============ CARGAR PEDIDOS ============
async function cargarPedidos(silencioso = false) {
  if (!silencioso) $('#btnRefresh').classList.add('spinning');

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getPedidos&t=${Date.now()}`);
    const data = await res.json();

    if (data.status === 'success') {
      pedidos = data.pedidos || [];
      pedidosFiltrados = [...pedidos];
      aplicarFiltro();
    } else {
      throw new Error(data.message || 'Error desconocido');
    }
  } catch (err) {
    console.error('Error cargando pedidos:', err);
    if (!silencioso) {
      mostrarToast('Error al cargar. Revisa la conexión.', 'error');
      pedidosList.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim)">
          <p style="font-size:2rem;margin-bottom:12px">⚠️</p>
          <p>No se pudieron cargar los pedidos.</p>
          <p style="font-size:0.8rem;margin-top:8px">Toca el botón ↻ para reintentar.</p>
        </div>
      `;
    }
  } finally {
    $('#btnRefresh').classList.remove('spinning');
  }
}

// ============ CARGAR STATS ============
async function cargarStats(silencioso = false) {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getStats&t=${Date.now()}`);
    const data = await res.json();

    if (data.status === 'success' && data.stats) {
      countPendientes.textContent = data.stats.pendientes || 0;
      countEmpacados.textContent = data.stats.empacados || 0;
      countVentas.textContent = `$${data.stats.ventasHoy || 0}`;
    }
  } catch (err) {
    console.error('Error cargando stats:', err);
  }
}

// ============ RENDER PEDIDOS ============
function renderPedidos() {
  if (!pedidosFiltrados.length) {
    pedidosList.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  pedidosList.innerHTML = pedidosFiltrados.map((p, i) => `
    <div class="pedido-card" data-fila="${p.fila}" style="animation-delay:${i * 0.05}s">
      <div class="pedido-top">
        <span class="pedido-id">${p.id}</span>
        <span class="pedido-hora">${p.hora || ''}</span>
      </div>
      <div class="pedido-productos">
        ${formatearProductos(p.productos)}
      </div>
      <div class="pedido-totales">
        <span class="pedido-total-label">Total</span>
        <span class="pedido-total-amount">$${p.total}</span>
      </div>
      <button class="btn-empacar" data-empacar="${p.fila}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
        Marcar como empacado
      </button>
    </div>
  `).join('');

  pedidosList.querySelectorAll('[data-empacar]').forEach(btn => {
    btn.addEventListener('click', () => abrirConfirm(btn.dataset.empacar));
  });
}

function formatearProductos(texto) {
  if (!texto) return '—';
  return String(texto)
    .split('|')
    .map(item => `<div>• ${item.trim()}</div>`)
    .join('');
}

// ============ FILTRO ============
function aplicarFiltro() {
  if (!busqueda) {
    pedidosFiltrados = [...pedidos];
  } else {
    pedidosFiltrados = pedidos.filter(p =>
      String(p.id).toLowerCase().includes(busqueda) ||
      String(p.productos).toLowerCase().includes(busqueda)
    );
  }
  renderPedidos();
}

// ============ CONFIRMACIÓN ============
function abrirConfirm(fila) {
  pedidoPendienteConfirmar = fila;
  const pedido = pedidos.find(p => String(p.fila) === String(fila));
  $('#confirmText').textContent = pedido ? `Pedido ${pedido.id} · $${pedido.total}` : 'Pedido';
  confirmOverlay.classList.add('open');
}

function cerrarConfirm() {
  pedidoPendienteConfirmar = null;
  confirmOverlay.classList.remove('open');
  const btn = $('#btnConfirm');
  btn.disabled = false;
  btn.textContent = 'Sí, empacar';
}

// ============ EJECUTAR EMPAQUE ============
async function ejecutarEmpaque() {
  if (!pedidoPendienteConfirmar) return;

  const btn = $('#btnConfirm');
  btn.disabled = true;
  btn.textContent = 'Procesando...';

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'marcarEmpacado',
        fila: pedidoPendienteConfirmar
      })
    });

    const data = await res.json();

    if (data.status === 'success') {
      // Animación de salida de la tarjeta
      const card = pedidosList.querySelector(`[data-fila="${pedidoPendienteConfirmar}"]`);
      if (card) {
        card.classList.add('saliendo');
        setTimeout(() => {
          pedidos = pedidos.filter(p => String(p.fila) !== String(pedidoPendienteConfirmar));
          pedidosFiltrados = pedidosFiltrados.filter(p => String(p.fila) !== String(pedidoPendienteConfirmar));
          renderPedidos();
        }, 400);
      } else {
        pedidos = pedidos.filter(p => String(p.fila) !== String(pedidoPendienteConfirmar));
        pedidosFiltrados = pedidosFiltrados.filter(p => String(p.fila) !== String(pedidoPendienteConfirmar));
        renderPedidos();
      }

      mostrarToast('Pedido marcado como empacado 🌹', 'success');
      cerrarConfirm();

      // Refrescar stats
      setTimeout(() => cargarStats(true), 800);
    } else {
      throw new Error(data.message || 'No se pudo marcar');
    }
  } catch (err) {
    console.error('Error al empacar:', err);
    mostrarToast('Error al marcar. Intenta de nuevo.', 'error');
    btn.disabled = false;
    btn.textContent = 'Sí, empacar';
  }
}

// ============ TOAST ============
function mostrarToast(msg, tipo = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, 2600);
}
