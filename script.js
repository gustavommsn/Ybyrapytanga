/* =========================================================
   CONFIGURAÇÃO DA EMPRESA E ARMAZENAMENTO SEGURO
   ========================================================= */
function storageGet(key, fallback = "") {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) { return fallback; }
}
function storageSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch (error) {}
}

const CONFIG = { whatsapp: storageGet("+5521975593311"), nomeEmpresa: "Ybyrapytanga" };
const PRODUCTS = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];

function loadSavedCart() {
  let saved;
  try { saved = JSON.parse(storageGet("yby_cart", "{}")); } catch (error) { return {}; }
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
  const validIds = new Set(PRODUCTS.map(product => product.id));
  const cleanCart = {};
  for (const [id, item] of Object.entries(saved)) {
    const qty = Number(item && item.qty);
    if (validIds.has(id) && Number.isFinite(qty) && qty > 0) { cleanCart[id] = { id, qty: Math.floor(qty) }; }
  }
  return cleanCart;
}

/* ========= HELPERS ========= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

/* ========= ESTADO ========= */
const state = {
  category:new Set(), type:new Set(), material:new Set(),
  code:"", compat:"", search:"", nameSearch:"", view:"grid",
  page: 1, pageSize: 8,
  cart: loadSavedCart(),
  activeProduct: null
};

const CATEGORY_OPTIONS = ["Remo","Náutica","Asas Double Skiff - 2","Fincapé de madeira","Outros"];
const OTHER_CATEGORIES = ["Asas Double Skiff - 2", "Fincapé de madeira"];
const TYPE_OPTIONS = ["Pás e remos","Assentos e trilhos","Fincapés","Fixadores","Acessórios","Ferramentas"];
const MATERIAL_OPTIONS = ["Alumínio","Madeira","Fibra/compósito","Inox","Plástico / nylon","Consultar especificação"];

/* ========= WHATSAPP ========= */
function ensureWhatsApp(){
  if(CONFIG.whatsapp) return CONFIG.whatsapp;
  const typed = prompt("Digite o WhatsApp comercial da Ybyrapytanga com DDI e DDD (somente números). Ex.: 5521999999999");
  if(!typed) return "";
  const n = typed.replace(/\D/g,"");
  if(n.length<12||n.length>15){ toast("Número inválido. Use DDI + DDD + número."); return ""; }
  CONFIG.whatsapp = n;
  storageSet("yby_whatsapp", n);
  return n;
}

/* ========= TOAST ========= */
function toast(message){
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(()=>el.classList.remove("show"), 2600);
}

/* ========= ROUTER ========= */
function getRoute(){
  const hash = location.hash.replace(/^#\/?/, "").replace(/^#/, "");
  return ["inicio","produtos","sobre","ajuda"].includes(hash) ? hash : "inicio";
}
function setRoute(route){
  $$(".page").forEach(p => {
    p.hidden = p.dataset.page !== route;
    if (!p.hidden) {
      p.style.animation = "none";
      void p.offsetWidth;
      p.style.animation = "";
    }
  });
  $$(".navlinks a").forEach(a => { a.classList.toggle("active", a.dataset.route === route); });
  document.body.dataset.pageActive = route;
  $("#navlinks").classList.remove("open");
  window.scrollTo(0, 0);
  document.title = route === "inicio" ? "Ybyrapytanga | Peças e acessórios" : route === "produtos" ? "Catálogo de peças | Ybyrapytanga" : route === "sobre" ? "Sobre nós | Ybyrapytanga" : "Ajuda | Ybyrapytanga";
  if(route !== "produtos"){ state.page = 1; }
}
function handleRouteChange(){ setRoute(getRoute()); }
window.addEventListener("hashchange", handleRouteChange);

/* ========= PRODUCT CARD ========= */
function productById(id){ return PRODUCTS.find(p => p.id === id); }
function productCard(p){
  const qty = state.cart[p.id] ? state.cart[p.id].qty : 0;
  const actionHtml = qty > 0
    ? `<div class="qty-inline" data-qty-box="${esc(p.id)}"><button data-qty="-1" data-id="${esc(p.id)}" aria-label="Diminuir">−</button><span class="qty-value">${qty}</span><button data-qty="1" data-id="${esc(p.id)}" aria-label="Aumentar">+</button></div>`
    : `<button class="btn btn-primary" data-add="${esc(p.id)}"><span>＋</span> Adicionar</button>`;

  return `<article class="product-card" data-product="${esc(p.id)}">
    <div class="product-image">
      <img loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src='YBYRAPYTANGA_IMAGENS_CATALOGO/IMAGEM_NAO_DISPONIVEL.svg'">
      <span class="product-tag">${esc(p.type)}</span>
    </div>
    <div class="product-info">
      <h3>${esc(p.name)}</h3>
      <p class="product-meta">Material: ${esc(p.material||"Consultar")}</p>
      ${p.size ? `<p class="product-meta">Tamanho: ${esc(p.size)}</p>` : ""}
      <div class="product-actions">
        <button class="btn btn-outline" data-details="${esc(p.id)}">Ver detalhes</button>
        ${actionHtml}
      </div>
    </div>
  </article>`;
}

/* ========= FILTROS ========= */
function buildChecks(id, options, stateKey){
  const root = $("#"+id);
  root.innerHTML = options.map((o,i) =>
    `<label class="check-row"><input type="checkbox" data-filter="${stateKey}" value="${esc(o)}" id="${id}-${i}"><span>${esc(o)}</span></label>`
  ).join("");
  root.querySelectorAll("input").forEach(input => input.addEventListener("change", () => {
    input.checked ? state[stateKey].add(input.value) : state[stateKey].delete(input.value);
    state.page = 1;
    renderCatalog();
  }));
}
function getFiltered(){
  let list = PRODUCTS.filter(p => {
    const searchable = norm([p.name,p.code,p.category,p.type,p.material,p.size].join(" "));
    if(state.search && !searchable.includes(norm(state.search))) return false;
    if(state.nameSearch && !norm(p.name).includes(norm(state.nameSearch))) return false;
    if(state.code && !norm(p.code).includes(norm(state.code))) return false;
    if (state.category.size) {
      const matchesCategory = [...state.category].some(selected =>
        selected === "Outros" ? OTHER_CATEGORIES.includes(p.category) : selected === p.category
      );
      if (!matchesCategory) return false;
    }
    if(state.type.size && !state.type.has(p.type)) return false;
    if(state.material.size && !state.material.has(p.material)) return false;
    if(state.compat && !p.compat.includes(state.compat)) return false;
    return true;
  });
  list.sort((a,b)=>a.code.localeCompare(b.code,"pt-BR",{numeric:true}));
  return list;
}
function renderCatalog(){
  const list = getFiltered();
  $("#resultsCount").textContent = `${list.length} ${list.length===1?"produto":"produtos"}`;

  const grid = $("#catalogGrid");
  const loadMoreBtn = $("#loadMoreBtn");
  grid.classList.toggle("list-view", state.view==="list");

  if(!list.length){
    grid.innerHTML = `<div class="empty-state"><h3>Nenhuma peça encontrada</h3><p>Tente alterar os filtros ou buscar por outro código.</p><button class="btn btn-outline" id="emptyClear">Limpar filtros</button></div>`;
    $("#emptyClear").onclick = clearFilters;
    loadMoreBtn.hidden = true;
    return;
  }

  const visible = list.slice(0, state.page * state.pageSize);
  grid.innerHTML = visible.map(productCard).join("");

  const hasMore = visible.length < list.length;
  loadMoreBtn.hidden = !hasMore;
  loadMoreBtn.classList.remove("loading");
  loadMoreBtn.textContent = hasMore ? "Ver mais produtos" : "";
}
function loadMore(){
  const btn = $("#loadMoreBtn");
  btn.classList.add("loading");
  btn.textContent = "Carregando...";
  requestAnimationFrame(() => {
    state.page += 1;
    renderCatalog();
    if(!$("#loadMoreBtn").hidden){ $("#loadMoreBtn").scrollIntoView({behavior:"smooth", block:"nearest"}); }
  });
}
function clearFilters(){
  state.category.clear(); state.type.clear(); state.material.clear();
  state.code = ""; state.compat = ""; state.search = ""; state.nameSearch = "";
  state.page = 1;
  $("#nameSearch").value = "";
  $("#codeSearch").value = "";
  $("#compatFilter").value = "";
  $$('input[data-filter]').forEach(i => i.checked = false);
  renderCatalog();
  toast("Filtros limpos");
}

/* ========= ATUALIZAÇÃO IN-PLACE DO CARD ========= */
function updateCardActions(productId){
  const card = document.querySelector(`[data-product="${productId}"]`);
  if(!card) return;
  const p = productById(productId); if(!p) return;
  const actionsEl = card.querySelector(".product-actions");
  if(!actionsEl) return;
  const qty = state.cart[productId] ? state.cart[productId].qty : 0;
  const actionHtml = qty > 0
    ? `<div class="qty-inline" data-qty-box="${esc(p.id)}"><button data-qty="-1" data-id="${esc(p.id)}" aria-label="Diminuir">−</button><span class="qty-value">${qty}</span><button data-qty="1" data-id="${esc(p.id)}" aria-label="Aumentar">+</button></div>`
    : `<button class="btn btn-primary" data-add="${esc(p.id)}"><span>＋</span> Adicionar</button>`;
  [...actionsEl.children].forEach(child => { if(!child.matches("[data-details]")) child.remove(); });
  actionsEl.insertAdjacentHTML("beforeend", actionHtml);
}

/* ========= CART ========= */
const cartTotal = () => Object.values(state.cart).reduce((n,item)=>n+item.qty, 0);
function addToCart(id, qty=1){
  const p = productById(id); if(!p) return;
  if(state.cart[id]) state.cart[id].qty += qty;
  else state.cart[id] = {id, qty};
  renderCart();
  updateCardActions(id);
  const count = $("#cartCount");
  count.classList.remove("pop"); void count.offsetWidth; count.classList.add("pop");
  toast(`${p.name} adicionado à sua seleção`);
}
function renderCart(){
  storageSet("yby_cart", JSON.stringify(state.cart));
  $("#cartCount").textContent = cartTotal();
  $("#drawerCount").textContent = `(${cartTotal()} ${cartTotal()===1?"item":"itens"})`;
  const root = $("#cartItems");
  const items = Object.values(state.cart);
  if(!items.length){
    root.innerHTML = `<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6"/><circle cx="10" cy="21" r="1"/><circle cx="19" cy="21" r="1"/></svg><h3>Sua seleção está vazia</h3><p>Adicione as peças desejadas para solicitar uma cotação.</p><button class="btn btn-primary" id="goCatalog">Ver produtos</button></div>`;
    $("#goCatalog").onclick = () => { closeCart(); location.hash = "#/produtos"; };
    return;
  }
  root.innerHTML = items.map(item => {
    const p = productById(item.id); if(!p) return "";
    return `<div class="cart-item">
      <img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src='YBYRAPYTANGA_IMAGENS_CATALOGO/IMAGEM_NAO_DISPONIVEL.svg'">
      <div>
        <h3>${esc(p.name)}</h3>
        <div class="code">Cód. ${esc(p.code)}</div>
        <div class="qty-controls">
          <button data-qty="-1" data-id="${esc(p.id)}" aria-label="Diminuir quantidade">−</button>
          <span>${item.qty}</span>
          <button data-qty="1" data-id="${esc(p.id)}" aria-label="Aumentar quantidade">+</button>
        </div>
      </div>
      <button class="remove-item" data-remove="${esc(p.id)}" aria-label="Remover" title="Remover">⌫</button>
    </div>`;
  }).join("");
}
function openCart(){
  $("#overlay").classList.add("open");
  $("#cartDrawer").classList.add("open");
  $("#cartDrawer").setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}
function closeCart(){
  $("#overlay").classList.remove("open");
  $("#cartDrawer").classList.remove("open");
  $("#cartDrawer").setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

/* ========= MODAL ========= */
function openDetails(id){
  const p = productById(id); if(!p) return;
  state.activeProduct = id;
  $("#modalImg").onerror = function () { this.onerror = null; this.src = "YBYRAPYTANGA_IMAGENS_CATALOGO/IMAGEM_NAO_DISPONIVEL.svg"; };
  $("#modalImg").src = p.image;
  $("#modalImg").alt = p.name;
  $("#modalTag").textContent = p.type;
  $("#modalTitle").textContent = p.name;
  $("#modalDescription").textContent = p.description || "Consulte a equipe para mais informações.";
  $("#modalSpecs").innerHTML = `
    <div class="spec-row"><span>Código</span><strong>${esc(p.code)}</strong></div>
    <div class="spec-row"><span>Categoria</span><strong>${esc(p.category)}</strong></div>
    <div class="spec-row"><span>Material</span><strong>${esc(p.material||"Consultar")}</strong></div>
    <div class="spec-row"><span>Dimensões</span><strong>${esc(p.size||"Consultar")}</strong></div>
    <div class="spec-row"><span>Compatibilidade</span><strong>${esc(p.compat.join(", ")||"Consultar")}</strong></div>`;
  $("#modalQty").value = 1;
  $("#productModal").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeDetails(){
  $("#productModal").classList.remove("open");
  document.body.style.overflow = "";
}

/* ========= WHATSAPP SEND ========= */
function sendQuote(){
  const items = Object.values(state.cart);
  if(!items.length){ toast("Adicione pelo menos uma peça à sua seleção."); return; }
  const configuredNumber = ensureWhatsApp();
  if(!configuredNumber){ toast("Informe um WhatsApp comercial válido para continuar."); return; }
  const lines = items.map((item,i) => {
    const p = productById(item.id);
    return `${i+1}. ${p.name}\nCódigo: ${p.code}\nQuantidade: ${item.qty} unidade(s)`;
  });
  const message = `Olá! Gostaria de solicitar uma cotação das seguintes peças:\n\n${lines.join("\n\n")}\n\nPoderiam informar os preços, a disponibilidade e o prazo de entrega?\n\nObrigado!`;
  const number = configuredNumber.replace(/\D/g,"");
  if(number.length<12||number.length>15){ toast("Confira o número comercial."); return; }
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
}
function whatsappDirect(){
  const configuredNumber = ensureWhatsApp();
  if(!configuredNumber){ toast("Informe um WhatsApp comercial válido."); return; }
  const n = configuredNumber.replace(/\D/g,"");
  if(n.length<12||n.length>15){ toast("Confira o número comercial."); return; }
  window.open(`https://wa.me/${n}?text=${encodeURIComponent("Olá! Gostaria de informações sobre os produtos da Ybyrapytanga.")}`,"_blank","noopener,noreferrer");
}

/* ========= FILTROS MOBILE ========= */
const filtersEl = document.getElementById("filters");
const filterToggle = document.getElementById("filterToggle");

function toggleFilters(){
  if(!filtersEl) return;
  filtersEl.classList.toggle("open");
}

filterToggle?.addEventListener("click", toggleFilters);

/* ========= CLICK GLOBAL ========= */
function handleClick(e){
  const add = e.target.closest("[data-add]");
  if(add){ addToCart(add.dataset.add); return; }

  const details = e.target.closest("[data-details]");
  if(details){ openDetails(details.dataset.details); return; }

  const qty = e.target.closest("[data-qty]");
  if(qty){
    const id = qty.dataset.id;
    if(state.cart[id]){
      state.cart[id].qty += Number(qty.dataset.qty);
      if(state.cart[id].qty <= 0) delete state.cart[id];
    }
    renderCart();
    updateCardActions(id);
    return;
  }

  const remove = e.target.closest("[data-remove]");
  if(remove){
    const id = remove.dataset.remove;
    delete state.cart[id];
    renderCart();
    updateCardActions(id);
    toast("Peça removida da seleção");
    return;
  }

  const cat = e.target.closest("[data-category]");
  if(cat){
    const c = cat.dataset.category;
    state.category.clear();
    state.type.clear();
    state.page = 1;
    if (["Fixadores", "Acessórios", "Assentos e trilhos"].includes(c)) { state.type.add(c); } else { state.category.add(c); }
    $$('input[data-filter="category"]').forEach(i => i.checked = state.category.has(i.value));
    $$('input[data-filter="type"]').forEach(i => i.checked = state.type.has(i.value));
    renderCatalog();
  }
}
document.addEventListener("click", handleClick);

/* ========= LISTENERS ========= */
$("#cartOpen").addEventListener("click", openCart);
$("#cartClose").addEventListener("click", closeCart);
$("#overlay").addEventListener("click", closeCart);
$("#sendWhatsApp").addEventListener("click", sendQuote);
$("#clearCart").addEventListener("click", () => {
  const ids = Object.keys(state.cart);
  state.cart = {};
  renderCart();
  ids.forEach(updateCardActions);
  toast("Seleção limpa");
});
$("#modalClose").addEventListener("click", closeDetails);
$("#productModal").addEventListener("click", e => { if(e.target === $("#productModal")) closeDetails(); });
$("#modalAdd").addEventListener("click", () => {
  const qty = Math.max(1, parseInt($("#modalQty").value,10) || 1);
  addToCart(state.activeProduct, qty);
  closeDetails();
});
$("#nameSearch").addEventListener("input", e => { state.nameSearch = e.target.value; state.page = 1; renderCatalog(); });
$("#codeSearch").addEventListener("input", e => { state.code = e.target.value; state.page = 1; renderCatalog(); });
$("#compatFilter").addEventListener("change", e => { state.compat = e.target.value; state.page = 1; renderCatalog(); });
$("#clearFilters").addEventListener("click", clearFilters);
$("#gridView").addEventListener("click", () => {
  state.view = "grid"; $("#gridView").classList.add("active"); $("#listView").classList.remove("active"); renderCatalog();
});
$("#listView").addEventListener("click", () => {
  state.view = "list"; $("#listView").classList.add("active"); $("#gridView").classList.remove("active"); renderCatalog();
});
$("#menuToggle").addEventListener("click", () => $("#navlinks").classList.toggle("open"));
$("#headerWhatsApp").addEventListener("click", e => { e.preventDefault(); whatsappDirect(); });
$("#contactWhatsApp").addEventListener("click", whatsappDirect);
$("#loadMoreBtn").addEventListener("click", loadMore);
document.addEventListener("keydown", e => {
  if(e.key === "Escape"){
    closeCart();
    closeDetails();
    $("#navlinks").classList.remove("open");
  }
});

/* ========= INIT ========= */
buildChecks("categoryFilters", CATEGORY_OPTIONS, "category");
buildChecks("typeFilters", TYPE_OPTIONS, "type");
buildChecks("materialFilters", MATERIAL_OPTIONS, "material");
renderCatalog();
renderCart();
$("#year").textContent = new Date().getFullYear();
handleRouteChange();
