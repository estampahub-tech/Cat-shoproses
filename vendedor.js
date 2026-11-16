const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7gnp6dx6DywtMtapzZttYTWaq1pG43XTNvpExw2IVkARrsHIiXUCSf7MhiizMJpJ9GA/exec';

let pedidos = [];
let pedidosFiltrados = [];
let pedidoAProcesar = null;

async function cargarPedidos() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getPedidos&t=${Date.now()}`);
    const data = await res.json();
    if (data.status === 'success') {
      pedidos = data.pedidos || [];
      pedidosFiltrados = [...pedidos];
      renderPedidos();
    }
  } catch(e) { console.error(e); }
}

function renderPedidos() {
  const list = document.getElementById('pedidosList');
  const empty = document.getElementById('emptyState');
  
  if (!pedidosFiltrados.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = pedidosFiltrados.map(p => `
    <div class="pedido-card">
      <div class="pedido-top">
        <span class="pedido-id">${p.id}</span>
        <span class="pedido-hora">${p.hora}</span>
      </div>
      <p style="color:#e68caf; font-size:0.85rem; margin-bottom:10px;"><strong>Cliente:</strong> ${p.cliente}</p>
      <div class="pedido-productos">${p.productos.split('|').join('<br>')}</div>
      <div class="pedido-totales">
        <span>Total</span>
        <span class="pedido-total-amount">$${p.total}</span>
      </div>
      <button class="btn-empacar" onclick="abrirTirilla(${p.fila}, '${p.id}', '${p.productos}', ${p.total}, '${p.cliente}', '${p.cel}', '${p.email}', '${p.hora}')">Ver Tirilla / Empacar</button>
    </div>
  `).join('');
}

function abrirTirilla(fila, id, productos, total, cliente, cel, email, hora) {
  pedidoAProcesar = fila;
  
  const hoy = new Date().toLocaleDateString();
  const prodsHTML = productos.split('|').map(p => `<div>${p.trim()}</div>`).join('');

  document.getElementById('ticketContent').innerHTML = `
    <div style="text-align:center;">
      <h2 style="margin:0;">🌹 SHOP ROSES</h2>
      <p style="margin:5px 0; font-size:12px;">Tienda Física</p>
      <hr style="border-top:1px dashed #000;">
    </div>
    <div style="font-size:12px; margin-bottom:10px;">
      <strong>Ticket:</strong> ${id}<br>
      <strong>Fecha:</strong> ${hoy} ${hora}<br>
      <strong>Cliente:</strong> ${cliente}<br>
      <strong>Cel:</strong> ${cel}
    </div>
    <hr style="border-top:1px dashed #000;">
    <div style="font-size:12px; margin:10px 0;">
      <strong>CANT / DETALLE</strong><br>
      ${prodsHTML}
    </div>
    <hr style="border-top:1px dashed #000;">
    <div style="text-align:right; font-size:16px; font-weight:bold; margin-top:10px;">
      TOTAL: $${total}
    </div>
    <div style="text-align:center; font-size:10px; margin-top:20px;">
      ¡Gracias por tu compra!<br>Vuelve pronto.
    </div>
  `;

  document.getElementById('ticketOverlay').style.display = 'flex';
}

// Escuchar el botón de cobrar asegurando que la página ya cargó
document.addEventListener('DOMContentLoaded', () => {
  const btnCobrar = document.getElementById('btnCobrar');
  if (btnCobrar) {
    btnCobrar.addEventListener('click', async () => {
      if (!pedidoAProcesar) return;
      
      btnCobrar.textContent = 'Procesando...';
      btnCobrar.disabled = true;

      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // <-- FIX DE CONEXIÓN
          body: JSON.stringify({ action: 'marcarEmpacado', fila: pedidoAProcesar, cobrado: true })
        });
        const data = await res.json();
        
        if (data.status === 'success') {
          alert('Pedido empacado y cobrado con éxito. Correo enviado al cliente.');
          document.getElementById('ticketOverlay').style.display = 'none';
          cargarPedidos(); 
        }
      } catch(e) {
        alert('Error de conexión al cobrar. Intenta de nuevo.');
      } finally {
        btnCobrar.textContent = '💵 Cobrar y Enviar';
        btnCobrar.disabled = false;
      }
    });
  }

  // Iniciar
  cargarPedidos();
  setInterval(cargarPedidos, 30000);
});
