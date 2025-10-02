// top-movers.js — XETRA top movers via Finnhub
(() => {
  const FINNHUB_KEY = "d2b6o19r01qrj4ikl36gd2b6o19r01qrj4ikl370"; // <---- wstaw swój klucz
  const EXCHANGE = "XETRA";               // XETRA tylko
  const TOP_N = 50;
  const CACHE_TTL_MS = 3 * 60 * 1000;
  const CACHE_VERSION = "fx_v1";

  const IDS = { gainers: "top-gainers-table", losers: "top-losers-table" };
  const BASE = "https://finnhub.io/api/v1";

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function cacheGet(key){
    try{ const raw=localStorage.getItem(key); if(!raw) return null;
      const {ts,data}=JSON.parse(raw); if(Date.now()-ts> CACHE_TTL_MS) return null; return data;
    }catch{return null}
  }
  function cacheSet(key,data){ try{ localStorage.setItem(key, JSON.stringify({ts:Date.now(), data})) }catch{} }

  async function fetchJson(url){
    const u = url + (url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(FINNHUB_KEY);
    const res = await fetch(u, { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP "+res.status);
    return res.json();
  }

  async function loadXetraSymbols(){
    // Lista spółek z XETRA (1x dziennie można cache’ować dłużej, tu trzymamy krótko dla prostoty)
    const key = "fx_symbols_"+EXCHANGE;
    const cached = cacheGet(key);
    if (cached?.length) return cached;

    const list = await fetchJson(`${BASE}/stock/symbol?exchange=${encodeURIComponent(EXCHANGE)}`);
    // Finnhub zwraca m.in. {symbol:"BMW", displaySymbol:"BMW.DE"} lub "BMW.DE" w polu symbol — zależnie od giełdy.
    // Bierzemy symbole z sufiksem .DE lub displaySymbol kończący się na .DE
    const syms = (list||[])
      .map(x => (x.displaySymbol || x.symbol || "").toUpperCase())
      .filter(s => s.endsWith(".DE"));

    const uniq = Array.from(new Set(syms));
    cacheSet(key, uniq);
    return uniq;
  }

  async function fetchQuote(sym){
    // /quote => { c, d, dp, h, l, o, pc }
    const j = await fetchJson(`${BASE}/quote?symbol=${encodeURIComponent(sym)}`);
    const dp = Number(j?.dp);
    if (!Number.isFinite(dp)) return null;
    return { symbol: sym, name: sym, change_percent: dp };
  }

  async function fetchAllQuotes(symbols){
    // Limituj równoległość, żeby nie wpaść w limity darmowego planu
    const CONC = 8;
    const out = [];
    let i = 0;

    async function worker(){
      while(i < symbols.length){
        const sym = symbols[i++];
        try{
          const q = await fetchQuote(sym);
          if (q) out.push(q);
        }catch(e){
          // zjedzemy pojedyncze błędy
        }
        await sleep(120);
      }
    }
    await Promise.all(Array.from({length:CONC}, worker));
    return out;
  }

  function renderMoversTable(elId, items){
    const el = document.getElementById(elId);
    if (!el) return;
    const wrap = document.createElement("div");
    wrap.className = "scrollable-table";
    const table = document.createElement("table");
    table.innerHTML = `
      <thead><tr><th>Symbol</th><th>Change (%)</th></tr></thead>
      <tbody></tbody>`;
    const tbody = table.querySelector("tbody");
    (items||[]).forEach(it=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${it.symbol}</td>
        <td style="font-weight:700; color:${it.change_percent>=0?'#22c55e':'#ef4444'}">
          ${it.change_percent.toFixed(2)}%
        </td>`;
      tbody.appendChild(tr);
    });
    wrap.appendChild(table);
    el.innerHTML = "";
    el.appendChild(wrap);
    if (!items?.length){
      const note = document.createElement("div");
      note.style.margin="8px 0"; note.style.fontSize="0.9rem";
      note.textContent="Brak danych (limit/poza godzinami?).";
      el.prepend(note);
    }
  }

  async function buildMovers(){
    const gEl = document.getElementById(IDS.gainers);
    const lEl = document.getElementById(IDS.losers);
    if (!gEl && !lEl) return;

    const CKEY = `de_movers_${CACHE_VERSION}`;
    const cached = cacheGet(CKEY);
    if (cached){
      const {gainers, losers} = cached;
      if (gEl) renderMoversTable(IDS.gainers, gainers.slice(0, TOP_N));
      if (lEl) renderMoversTable(IDS.losers,  losers.slice(0, TOP_N));
      return;
    }

    try{
      console.log("[movers] Finnhub: loading XETRA symbols…");
      const syms = await loadXetraSymbols();
      console.log("[movers] XETRA symbols:", syms.length);

      console.log("[movers] fetching quotes…");
      const quotes = await fetchAllQuotes(syms);
      console.log("[movers] quotes fetched:", quotes.length);

      const gainers = [...quotes].sort((a,b)=> b.change_percent - a.change_percent);
      const losers  = [...quotes].sort((a,b)=> a.change_percent - b.change_percent);

      cacheSet(CKEY, {gainers, losers});

      if (gEl) renderMoversTable(IDS.gainers, gainers.slice(0, TOP_N));
      if (lEl) renderMoversTable(IDS.losers,  losers.slice(0, TOP_N));
    }catch(err){
      console.error("[movers] error:", err);
      [IDS.gainers, IDS.losers].forEach(id=>{
        const el=document.getElementById(id);
        if (el) el.textContent="Brak danych (limit/klucz/CORS).";
      });
    }
  }

  document.readyState === "loading"
    ? window.addEventListener("DOMContentLoaded", buildMovers)
    : buildMovers();
})();
