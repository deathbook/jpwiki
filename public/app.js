const list = document.querySelector("#entry-list");
const categories = document.querySelector("#categories");
const count = document.querySelector("#result-count");
const form = document.querySelector("#search-form");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let activeCategory = "";
let currentQuery = "";
function render(entries) {
  count.textContent = `${entries.length} 个条目`;
  list.innerHTML = entries.length ? entries.map((e) => `<article class="entry"><div class="meta"><span>${escapeHtml(e.category)}</span><span>${escapeHtml(e.status)}</span></div><h3><a href="/entry/${encodeURIComponent(e.slug)}" data-slug="${escapeHtml(e.slug)}">${escapeHtml(e.title)}</a></h3><p>${escapeHtml(e.summary)}</p><div class="tags">${(e.tags || []).map((tag) => `<span class="tag"># ${escapeHtml(tag)}</span>`).join("")}</div></article>`).join("") : '<div class="empty">没有找到匹配条目，试试更短的关键词。</div>';
}
function renderDetail(entry) {
  document.title = `${entry.title} · JPWiki`;
  categories.innerHTML = "";
  count.textContent = "";
  list.innerHTML = `<article class="entry detail-entry"><a class="back-link" href="/">← 返回全部条目</a><div class="meta"><span>${escapeHtml(entry.category)}</span><span>${escapeHtml(entry.status)}</span></div><h2>${escapeHtml(entry.title)}</h2><p class="detail-summary">${escapeHtml(entry.summary)}</p><div class="detail-content">${escapeHtml(entry.content).split(/\n+/).filter(Boolean).map((paragraph) => `<p>${paragraph}</p>`).join("")}</div><div class="tags">${(entry.tags || []).map((tag) => `<span class="tag"># ${escapeHtml(tag)}</span>`).join("")}</div><p class="detail-meta">更新于 ${escapeHtml(entry.updatedAt)} · ${escapeHtml(entry.author)}</p></article>`;
}
async function load() {
  const params = new URLSearchParams(); if (currentQuery) params.set("q", currentQuery); if (activeCategory) params.set("category", activeCategory);
  list.innerHTML = '<div class="empty">正在加载条目…</div>';
  try { const response = await fetch(`/api/entries?${params}`); if (!response.ok) throw new Error(); const data = await response.json(); render(data.entries); }
  catch { list.innerHTML = '<div class="empty">条目暂时无法加载，请稍后重试。</div>'; count.textContent = ""; }
}
async function loadDetail(slug) {
  try {
    const response = await fetch(`/api/entries/${encodeURIComponent(slug)}`);
    if (!response.ok) throw new Error();
    renderDetail(await response.json());
  } catch {
    list.innerHTML = '<div class="empty">条目不存在或暂时无法加载。<br><a href="/">返回首页</a></div>';
  }
}
async function init() {
  const detailSlug = location.pathname.match(/^\/entry\/([^/]+)$/)?.[1];
  if (detailSlug) return loadDetail(decodeURIComponent(detailSlug));
  const response = await fetch("/api/entries"); const data = await response.json(); const names = [...new Set(data.entries.map((e) => e.category))]; categories.innerHTML = ["全部", ...names].map((name) => `<button class="filter${name === "全部" ? " active" : ""}" data-category="${name === "全部" ? "" : escapeHtml(name)}">${escapeHtml(name)}</button>`).join(""); categories.addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; activeCategory = button.dataset.category; categories.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button)); load(); }); render(data.entries);
}
form.addEventListener("submit", (event) => { event.preventDefault(); currentQuery = new FormData(form).get("q").trim(); document.querySelector("#entries").scrollIntoView({ behavior: "smooth" }); load(); });
init().catch(() => { list.innerHTML = '<div class="empty">服务暂时不可用，请稍后重试。</div>'; });
