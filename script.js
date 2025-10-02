async function fetchYahooNames(symbols) {
  const results = {};
  console.log(`📦 Rozpoczynam pobieranie nazw z Yahoo przez proxy dla ${symbols.length} symboli...`);

  for (const symbol of symbols) {
    try {
      const proxyUrl = `https://corsproxy.io/?https://query2.finance.yahoo.com/v1/finance/search?q=${symbol}`;
      const res = await fetch(proxyUrl);
      const data = await res.json();

      const name = data.quotes?.[0]?.shortname;
      results[symbol] = name || symbol;

    } catch (err) {
      console.error(`❌ Błąd przy pobieraniu ${symbol}:`, err);
      results[symbol] = symbol;
    }
  }

  console.log('🏁 Zakończono pobieranie nazw.');
  return results;
}

window.addEventListener('DOMContentLoaded', () => {
  fetch('raport.xlsx')
    .then(res => {
      if (!res.ok) throw new Error('Nie można znaleźć raport.xlsx');
      return res.arrayBuffer();
    })
    .then(async data => {
      const wb = XLSX.read(data, { type: 'array' });
      const sheetName = wb.SheetNames.find(name => name.toLowerCase().includes("closed"));
      const ws = wb.Sheets[sheetName];

      const jsonRaw = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const headerIndex = jsonRaw.findIndex(row => row.includes("Symbol"));
      const headers = jsonRaw[headerIndex];
      const rows = jsonRaw.slice(headerIndex + 1);

      const entries = rows.map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      }).reverse();

      function mergeNearbyTransactions(entries) {
        const merged = [];
        for (let i = 0; i < entries.length; i++) {
          const current = entries[i];
          const currentCloseTime = parseDateValue(current['Close time'] ?? current['Close Time']);
          if (!currentCloseTime) continue;

          const prev = merged.length > 0 ? merged[merged.length - 1] : null;
          const prevCloseTime = prev ? parseDateValue(prev['Close time'] ?? prev['Close Time']) : null;

          if (
            prev &&
            current['Symbol'] === prev['Symbol'] &&
            prevCloseTime &&
            Math.abs(currentCloseTime - prevCloseTime) <= 60000
          ) {
            const vol1   = parseFloat(prev['Volume']) || 0;
            const vol2   = parseFloat(current['Volume']) || 0;
            const price1 = parseFloat(prev['Close price']) || 0;
            const price2 = parseFloat(current['Close price']) || 0;
            const open1  = parseFloat(prev['Open price']) || 0;
            const open2  = parseFloat(current['Open price']) || 0;

            const newVol = vol1 + vol2;
            prev['Volume']   = newVol;
            prev['Gross P/L'] = (parseFloat(prev['Gross P/L']) || 0) + (parseFloat(current['Gross P/L']) || 0);
            prev['Close price'] = newVol ? ((price1 * vol1 + price2 * vol2) / newVol) : price1;
            prev['Open price']  = newVol ? ((open1 * vol1 + open2 * vol2) / newVol) : open1;
          } else {
            merged.push({ ...current });
          }
        }
        return merged;
      }

      const mergedEntries = mergeNearbyTransactions(entries);

      const uniqueSymbols = [...new Set(mergedEntries.map(e => e.Symbol))];
      const nameMap = await fetchYahooNames(uniqueSymbols);

      const enrichedEntries = mergedEntries.map(e => ({
        ...e,
        Name: nameMap[e.Symbol] || e.Symbol
      }));

      window.allEntries = enrichedEntries;
      window.currentMonthOffset = 0;

      renderTable(enrichedEntries, document.getElementById('all-table'));
      renderRecentTable(enrichedEntries);
      renderPieCharts(enrichedEntries);
    })
    .catch(err => {
      console.error("❌ Błąd:", err);
      document.getElementById('all-table').textContent = "Błąd: " + err.message;
    });
});

function parseDateValue(val) {
  if (typeof val === 'number') {
    const utcDays = val - 25569;
    const ms = utcDays * 86400 * 1000;
    return new Date(ms);
  }
  if (typeof val === 'string') {
    const clean = val.replace(' ', 'T').split('.')[0];
    const d = new Date(clean);
    return isNaN(d) ? null : d;
  }
  return null;
}

function formatNumber(val) {
  const num = parseFloat(val);
  return isNaN(num) ? val : num.toFixed(2);
}

/* ==================== SORTOWANIE ==================== */
let currentSort = { key: null, asc: true };

function sortTableByKey(data, key, container) {
  if (currentSort.key === key) {
    currentSort.asc = !currentSort.asc;
  } else {
    currentSort = { key, asc: true };
  }

  const sorted = [...data].sort((a, b) => {
    let valA, valB;

    if (key === 'Profit %') {
      valA = calcEntryReturnPct(a);
      valB = calcEntryReturnPct(b);
    } else if (key === 'Sale value') {
      const volA = parseFloat(a['Volume']), priceA = parseFloat(a['Close price']);
      const volB = parseFloat(b['Volume']), priceB = parseFloat(b['Close price']);
      valA = (!isNaN(volA) && !isNaN(priceA)) ? volA * priceA : null;
      valB = (!isNaN(volB) && !isNaN(priceB)) ? volB * priceB : null;
    } else if (key === 'Close Time') {
      valA = parseDateValue(a['Close time'] ?? a['Close Time']);
      valB = parseDateValue(b['Close time'] ?? b['Close Time']);
    } else if (key === 'Duration (days)') {
      const dtA = parseDateValue(a['Close time'] ?? a['Close Time']);
      const dtOpenA = parseDateValue(a['Open time'] ?? a['Open Time']);
      const dtB = parseDateValue(b['Close time'] ?? b['Close Time']);
      const dtOpenB = parseDateValue(b['Open time'] ?? b['Open Time']);
      valA = (dtA && dtOpenA) ? Math.floor((dtA - dtOpenA) / (1000 * 60 * 60 * 24)) : null;
      valB = (dtB && dtOpenB) ? Math.floor((dtB - dtOpenB) / (1000 * 60 * 60 * 24)) : null;
    } else {
      valA = a[key];
      valB = b[key];
    }

    // liczby
    if (!isNaN(valA) && !isNaN(valB)) {
      return currentSort.asc ? valA - valB : valB - valA;
    }

    // daty
    if (valA instanceof Date && valB instanceof Date) {
      return currentSort.asc ? valA - valB : valB - valA;
    }

    // tekst
    return currentSort.asc
      ? String(valA ?? "").localeCompare(String(valB ?? ""))
      : String(valB ?? "").localeCompare(String(valA ?? ""));
  });

  renderTable(sorted, container);
}



/* ==================== RENDER TABELI ==================== */
function renderTable(data, container) {
  container.innerHTML = '';
  const table = document.createElement('table');
  
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const headersArr = ['Symbol', 'Name', 'Volume', 'Gross P/L', 'Close price', 'Sale value', 'Profit %', 'Close Time', 'Duration (days)'];
  headersArr.forEach((txt) => {
    const th = document.createElement('th');
    th.style.cursor = 'pointer';
    th.textContent = txt + (currentSort.key === txt ? (currentSort.asc ? " 🔼" : " 🔽") : "");
    th.onclick = () => sortTableByKey(data, txt, container);
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach((entry) => {
    if (!entry['Symbol'] || (!entry['Gross P/L'] && entry['Gross P/L'] !== 0)) return;

    const tr = document.createElement('tr');

    const tdSymbol = document.createElement('td');
    tdSymbol.textContent = entry['Symbol'];
    tr.appendChild(tdSymbol);

    const tdName = document.createElement('td');
    tdName.textContent = entry['Name'] || '-';
    tr.appendChild(tdName);

    ['Volume', 'Gross P/L', 'Close price'].forEach(key => {
      const td = document.createElement('td');
      td.textContent = formatNumber(entry[key]);
      if (key === 'Gross P/L') {
        const num = parseFloat(entry[key]);
        if (!isNaN(num)) {
          td.style.color = num >= 0 ? 'limegreen' : '#ff2f2fff';
          td.style.fontWeight = 'bold';
        }
      }
      tr.appendChild(td);
    });

    const vol = parseFloat(entry['Volume']);
    const price = parseFloat(entry['Close price']);
    const saleVal = (!isNaN(vol) && !isNaN(price)) ? vol * price : null;
    const tdSale = document.createElement('td');
    tdSale.textContent = saleVal !== null ? saleVal.toFixed(2) : '-';
    tr.appendChild(tdSale);

    const tdPct = document.createElement('td');
    const pct = calcEntryReturnPct(entry);
    if (pct !== null) {
      tdPct.textContent = pct.toFixed(2) + '%';
      tdPct.style.color = pct >= 0 ? 'limegreen' : 'red';
      tdPct.style.fontWeight = 'bold';
    } else {
      tdPct.textContent = '-';
    }
    tr.appendChild(tdPct);

    const rawClose = entry['Close time'] ?? entry['Close Time'];
    const dt = parseDateValue(rawClose);
    const tdClose = document.createElement('td');
    tdClose.textContent = dt
      ? dt.toLocaleString('pl-PL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-';
    tr.appendChild(tdClose);

    const rawOpen = entry['Open time'] ?? entry['Open Time'];
    const dtOpen = parseDateValue(rawOpen);
    const tdDays = document.createElement('td');
    if (dt && dtOpen) {
      const diffMs = dt - dtOpen;
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      tdDays.textContent = days;
    } else {
      tdDays.textContent = '-';
    }
    tr.appendChild(tdDays);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

/* ==================== RESZTA ==================== */
function renderRecentTable(entries) {
  const recent = filterByMonth(entries, window.currentMonthOffset);
  renderTable(recent, document.getElementById('recent-table'));
  updateMonthSummary(window.allEntries, window.currentMonthOffset);
}

function filterByMonth(entries, offset) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const next = new Date(target.getFullYear(), target.getMonth() + 1, 1);
  return entries.filter(entry => {
    const raw = entry['Close time'] ?? entry['Close Time'];
    const dt = parseDateValue(raw);
    return dt instanceof Date && !isNaN(dt) && dt >= target && dt < next;
  });
}

function changeMonth(offset) {
  window.currentMonthOffset += offset;
  renderRecentTable(window.allEntries);
}

function calculateTurnover(entries) {
  return entries.reduce((sum, e) => {
    const vol = parseFloat(e['Volume']);
    const price = parseFloat(e['Close price']);
    return sum + (isNaN(vol) || isNaN(price) ? 0 : vol * price);
  }, 0);
}

function updateMonthSummary(entries, offset) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const label = target.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' });

  const monthEntries = filterByMonth(entries, offset);

  const saldo = monthEntries.reduce((sum, e) => sum + (parseFloat(e['Gross P/L']) || 0), 0);
  const turnover = calculateTurnover(monthEntries);
  const avgPct = calculateMonthlyPercent(monthEntries);

  const saldoCls = saldo > 0 ? 'pos' : (saldo < 0 ? 'neg' : 'neu');
  const pctCls   = avgPct > 0 ? 'pos' : (avgPct < 0 ? 'neg' : 'neu');

  const header = document.getElementById('month-header');
  if (header) {
    header.innerHTML = `📆 ${label}`;
  }

  const el = document.getElementById('month-summary');
  if (el) {
    el.innerHTML = `
       <div class="item">💰 Obrót: <span class="value">${turnover.toFixed(0)}€</span></div>
       <div class="item">💵 Saldo: <span class="value ${saldoCls}">${saldo.toFixed(2)}€</span></div>
       <div class="item">📈 Avg.: <span class="value ${pctCls}">${avgPct.toFixed(2)}%</span></div>
    `;
  }
}

function calculateMonthlyPercent(entries) {
  let wSum = 0, wxSum = 0;
  for (const e of entries) {
    const vol  = parseFloat(e['Volume']);
    const open = parseFloat(e['Open price']);
    const pl   = parseFloat(e['Gross P/L']);
    if (isNaN(vol) || isNaN(open) || open === 0 || isNaN(pl)) continue;

    const cost = vol * open;
    const pct  = (pl / cost) * 100;
    wSum += cost;
    wxSum += cost * pct;
  }
  return wSum > 0 ? (wxSum / wSum) : 0;
}

function calcEntryReturnPct(entry) {
  const vol  = parseFloat(entry['Volume']);
  const open = parseFloat(entry['Open price']);
  const pl   = parseFloat(entry['Gross P/L']);
  if (isNaN(vol) || isNaN(open) || open === 0 || isNaN(pl)) return null;

  const cost = vol * open;
  return (pl / cost) * 100;
}
