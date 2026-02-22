/**
 * XTBHelper - Summary Tab
 *
 * Generates KPI + charts for closed transactions using window.allEntries.
 */

let summaryCharts = {
  equity: null,
  monthly: null,
  yearly: null,
  turnover: null,
  profitLoss: null,
  winLoss: null,
};

function parseDateValueSummary(val) {
  if (typeof val === 'number' && !isNaN(val)) {
    const utcDays = val - 25569;
    return new Date(utcDays * 86400 * 1000);
  }
  if (typeof val === 'string') {
    const clean = val.replace(' ', 'T').split('.')[0];
    const d = new Date(clean);
    return isNaN(d) ? null : d;
  }
  if (val instanceof Date) return isNaN(val) ? null : val;
  return null;
}

function toNumber(x) {
  const n = typeof x === 'string' ? parseFloat(x.replace(',', '.')) : parseFloat(x);
  return isNaN(n) ? null : n;
}

function formatMoneyEUR(val) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)} EUR`;
}

function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

function safeDiv(a, b) {
  if (!b || isNaN(a) || isNaN(b)) return null;
  return a / b;
}

function computeTradeMetrics(rawEntries) {
  const entries = (rawEntries || []).map(e => {
    const symbol = (e['Symbol'] ?? e.Symbol ?? '').toString().trim();
    const name = (e['Name'] ?? e.Name ?? '').toString().trim();
    const pl = toNumber(e['Gross P/L'] ?? e['Gross P/L '] ?? e['Gross P/L(EUR)'] ?? e['Profit'] ?? e['P/L']);
    const vol = toNumber(e['Volume'] ?? e.Volume);
    const openPrice = toNumber(e['Open price'] ?? e['Open Price'] ?? e['Open']);
    const closePrice = toNumber(e['Close price'] ?? e['Close Price'] ?? e['Close'] ?? e['Price']);
    const closeTime = parseDateValueSummary(e['Close time'] ?? e['Close Time'] ?? e['Close'] ?? e['Time']);
    const openTime = parseDateValueSummary(e['Open time'] ?? e['Open Time'] ?? e['Open']);

    const saleValue = (vol !== null && closePrice !== null) ? Math.abs(vol * closePrice) : null;
    const investmentValue = (vol !== null && openPrice !== null) ? Math.abs(vol * openPrice) : null;
    const baseForReturn = (investmentValue !== null && investmentValue > 0)
      ? investmentValue
      : ((saleValue !== null && saleValue > 0) ? saleValue : null);
    const retPct = (pl !== null && baseForReturn !== null && baseForReturn > 0) ? (pl / baseForReturn) * 100 : null;

    let durationDays = null;
    if (closeTime && openTime) {
      durationDays = Math.floor((closeTime - openTime) / (1000 * 60 * 60 * 24));
    }

    return {
      raw: e,
      symbol,
      name,
      pl,
      vol,
      openPrice,
      closePrice,
      saleValue,
      investmentValue,
      retPct,
      closeTime,
      openTime,
      durationDays,
    };
  }).filter(e => e.symbol && e.pl !== null);

  const tradeCount = entries.length;
  const totalPL = entries.reduce((s, e) => s + (e.pl ?? 0), 0);
  const wins = entries.filter(e => (e.pl ?? 0) > 0);
  const losses = entries.filter(e => (e.pl ?? 0) < 0);
  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : null;

  const sumWins = wins.reduce((s, e) => s + e.pl, 0);
  const sumLossesAbs = Math.abs(losses.reduce((s, e) => s + e.pl, 0));
  const profitFactor = sumLossesAbs > 0 ? (sumWins / sumLossesAbs) : null;

  const avgPL = tradeCount > 0 ? totalPL / tradeCount : null;
  const avgWin = winCount > 0 ? sumWins / winCount : null;
  const avgLoss = lossCount > 0 ? (losses.reduce((s, e) => s + e.pl, 0) / lossCount) : null;

  const expectancy = (avgWin !== null && avgLoss !== null && winRate !== null)
    ? (avgWin * (winRate / 100) + avgLoss * (1 - winRate / 100))
    : null;

  const saleValues = entries.map(e => e.saleValue).filter(v => v !== null && v > 0);
  const avgInvestment = saleValues.length ? saleValues.reduce((s, v) => s + v, 0) / saleValues.length : null;

  const returns = entries.map(e => e.retPct).filter(v => v !== null && isFinite(v));
  const avgReturnPct = returns.length ? returns.reduce((s, v) => s + v, 0) / returns.length : null;

  const durations = entries.map(e => e.durationDays).filter(v => v !== null && isFinite(v));
  const avgDuration = durations.length ? durations.reduce((s, v) => s + v, 0) / durations.length : null;

  // Biggest win/loss
  const biggestWin = wins.reduce((best, e) => (best === null || e.pl > best.pl) ? e : best, null);
  const biggestLoss = losses.reduce((best, e) => (best === null || e.pl < best.pl) ? e : best, null);

  // Equity curve + max drawdown
  const sortedByTime = [...entries].filter(e => e.closeTime).sort((a, b) => a.closeTime - b.closeTime);
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const equityPoints = sortedByTime.map(e => {
    equity += e.pl;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDrawdown) maxDrawdown = dd;
    return { t: e.closeTime, v: equity };
  });

  // Monthly grouping
  const monthlyMap = new Map();
  for (const e of sortedByTime) {
    const d = e.closeTime;
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cur = monthlyMap.get(key) ?? { key, pl: 0, trades: 0, turnover: 0 };
    cur.pl += e.pl;
    cur.trades += 1;
    cur.turnover += (e.investmentValue ?? e.saleValue ?? 0);
    monthlyMap.set(key, cur);
  }
  const monthly = Array.from(monthlyMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  // Yearly grouping
  const yearlyMap = new Map();
  for (const e of sortedByTime) {
    const d = e.closeTime;
    if (!d) continue;
    const year = d.getFullYear();
    const cur = yearlyMap.get(year) ?? { year, pl: 0, trades: 0, turnover: 0 };
    cur.pl += e.pl;
    cur.trades += 1;
    cur.turnover += (e.investmentValue ?? e.saleValue ?? 0);
    yearlyMap.set(year, cur);
  }
  const yearly = Array.from(yearlyMap.values()).sort((a, b) => a.year - b.year);

  // Symbol aggregation
  const symMap = new Map();
  for (const e of entries) {
    const s = e.symbol;
    const cur = symMap.get(s) ?? {
      symbol: s,
      pl: 0,
      trades: 0,
      wins: 0,
      losses: 0,
      turnover: 0,
      investmentSum: 0,
      investmentCount: 0,
      returnPctSum: 0,
      returnPctCount: 0,
    };
    cur.pl += e.pl;
    cur.trades += 1;
    cur.turnover += (e.investmentValue ?? e.saleValue ?? 0);
    if (e.pl > 0) cur.wins += 1;
    if (e.pl < 0) cur.losses += 1;

    const inv = (e.investmentValue ?? e.saleValue);
    if (inv !== null && isFinite(inv) && inv > 0) {
      cur.investmentSum += inv;
      cur.investmentCount += 1;
    }

    if (e.retPct !== null && isFinite(e.retPct)) {
      cur.returnPctSum += e.retPct;
      cur.returnPctCount += 1;
    }

    symMap.set(s, cur);
  }
  const symbols = Array.from(symMap.values())
    .map(x => ({
      ...x,
      winRate: x.trades ? (x.wins / x.trades) * 100 : 0,
      avgPL: x.trades ? x.pl / x.trades : 0,
      avgInvestment: x.investmentCount ? (x.investmentSum / x.investmentCount) : null,
      sumReturnPct: x.returnPctSum,
    }));

  const topSymbols = [...symbols].sort((a, b) => b.pl - a.pl).slice(0, 8);
  const worstSymbols = [...symbols].sort((a, b) => a.pl - b.pl).slice(0, 8);

  // Streaks
  let maxWinStreak = 0, maxLossStreak = 0;
  let curWin = 0, curLoss = 0;
  for (const e of sortedByTime) {
    if (e.pl > 0) {
      curWin += 1;
      curLoss = 0;
    } else if (e.pl < 0) {
      curLoss += 1;
      curWin = 0;
    } else {
      curWin = 0;
      curLoss = 0;
    }
    maxWinStreak = Math.max(maxWinStreak, curWin);
    maxLossStreak = Math.max(maxLossStreak, curLoss);
  }

  return {
    entries,
    tradeCount,
    totalPL,
    sumWins,
    sumLossesAbs,
    winCount,
    lossCount,
    winRate,
    profitFactor,
    avgPL,
    avgWin,
    avgLoss,
    expectancy,
    avgInvestment,
    avgReturnPct,
    avgDuration,
    biggestWin,
    biggestLoss,
    equityPoints,
    maxDrawdown,
    monthly,
    yearly,
    topSymbols,
    worstSymbols,
    symbols,
    maxWinStreak,
    maxLossStreak,
  };
}

function destroyChart(chart) {
  try {
    if (chart && typeof chart.destroy === 'function') chart.destroy();
  } catch {
    // ignore
  }
}

function ensureChartJs() {
  return typeof Chart !== 'undefined';
}

function renderSummaryHTML(metrics) {
  const container = document.getElementById('summary-content');
  if (!container) return;

  if (!metrics || metrics.tradeCount === 0) {
    container.innerHTML = `
      <div class="table-box">
        <b>Brak danych</b>
        <div style="color:#94a3b8;">Wczytaj raport, aby zobaczyć podsumowanie.</div>
      </div>
    `;
    return;
  }

  const totalCls = metrics.totalPL >= 0 ? 'pos' : 'neg';
  const avgCls = (metrics.avgPL ?? 0) >= 0 ? 'pos' : 'neg';

  container.innerHTML = `
    <div class="kpi-grid">
      <div class="table-box kpi-card">
        <div class="kpi-title">Łącznie transakcji</div>
        <div class="kpi-value">${metrics.tradeCount}</div>
        <div class="kpi-sub">Winy: ${metrics.winCount} | Lossy: ${metrics.lossCount}</div>
      </div>
      <div class="table-box kpi-card">
        <div class="kpi-title">Suma P/L</div>
        <div class="kpi-value ${totalCls}">${formatMoneyEUR(metrics.totalPL)}</div>
        <div class="kpi-sub">Max DD: ${metrics.maxDrawdown ? metrics.maxDrawdown.toFixed(2) : '0.00'} EUR</div>
      </div>
      <div class="table-box kpi-card">
        <div class="kpi-title">Win rate</div>
        <div class="kpi-value">${metrics.winRate !== null ? metrics.winRate.toFixed(2) + '%' : '-'}</div>
        <div class="kpi-sub">Profit factor: ${metrics.profitFactor !== null ? metrics.profitFactor.toFixed(2) : '-'}</div>
      </div>
      <div class="table-box kpi-card">
        <div class="kpi-title">Średni P/L / transakcję</div>
        <div class="kpi-value ${avgCls}">${formatMoneyEUR(metrics.avgPL)}</div>
        <div class="kpi-sub">Expectancy: ${metrics.expectancy !== null ? metrics.expectancy.toFixed(2) : '-'} EUR</div>
      </div>
    </div>

    <div class="summary-grid-2">
      <div class="table-box chart-box">
        <div class="table-box-title">
          <b>📈 Krzywa kapitału (P/L skumulowany)</b>
          <span class="table-box-count">${metrics.equityPoints.length} pkt</span>
        </div>
        <canvas id="summaryEquityChart"></canvas>
      </div>

      <div class="table-box chart-box">
        <div class="table-box-title">
          <b>✅ Win vs ❌ Loss</b>
          <span class="table-box-count">${metrics.tradeCount}</span>
        </div>
        <canvas id="summaryWinLossChart"></canvas>
      </div>
    </div>

    <div class="summary-grid-2">
      <div class="table-box chart-box">
        <div class="table-box-title">
          <b>🗓️ Wynik miesięczny</b>
          <span class="table-box-count">${metrics.monthly.length} mies.</span>
        </div>
        <canvas id="summaryMonthlyChart"></canvas>
      </div>

      <div class="table-box chart-box">
        <div class="table-box-title">
          <b>📅 Wynik roczny</b>
          <span class="table-box-count">${metrics.yearly.length} lat</span>
        </div>
        <canvas id="summaryYearlyChart"></canvas>
      </div>
    </div>

    <details id="summary-details" class="summary-details">
      <summary class="summary-details-title">🔎 Szczegóły (tabele i statystyki)</summary>
      <div class="summary-details-body">
        <div class="summary-grid-2">
          <div class="table-box chart-box summary-full turnover-chart-box">
            <div class="table-box-title">
              <b>💱 Obrót miesięczny (Turnover)</b>
              <span class="table-box-count">${metrics.monthly.length} mies.</span>
            </div>
            <div class="summary-controls" id="summaryTurnoverControls">
              <label><input type="checkbox" id="toggleTurnover" checked> Obrót</label>
              <label><input type="checkbox" id="togglePL" checked> P/L</label>
              <label><input type="checkbox" id="toggleTrades" checked> Zamknięte pozycje</label>
            </div>
            <canvas id="summaryTurnoverChart"></canvas>
          </div>

          <div class="table-box chart-box">
            <div class="table-box-title">
              <b>🥧 Zarobki vs Straty (EUR)</b>
              <span class="table-box-count"></span>
            </div>
            <canvas id="summaryProfitLossChart"></canvas>
          </div>

          <div class="table-box">
            <div class="table-box-title">
              <b>🔎 Szybkie statystyki</b>
              <span class="table-box-count"></span>
            </div>
            <table class="mini-table">
              <tbody>
                <tr><th>Średni zwrot (%)</th><td>${formatPct(metrics.avgReturnPct)}</td></tr>
                <tr><th>Śr. wartość transakcji</th><td>${metrics.avgInvestment !== null ? metrics.avgInvestment.toFixed(2) + ' EUR' : '-'}</td></tr>
                <tr><th>Śr. czas trzymania</th><td>${metrics.avgDuration !== null ? metrics.avgDuration.toFixed(1) + ' dni' : '-'}</td></tr>
                <tr><th>Max streak win</th><td>${metrics.maxWinStreak}</td></tr>
                <tr><th>Max streak loss</th><td>${metrics.maxLossStreak}</td></tr>
                <tr><th>Największa wygrana</th><td>${metrics.biggestWin ? `${metrics.biggestWin.symbol}: ${formatMoneyEUR(metrics.biggestWin.pl)}` : '-'}</td></tr>
                <tr><th>Największa strata</th><td>${metrics.biggestLoss ? `${metrics.biggestLoss.symbol}: ${formatMoneyEUR(metrics.biggestLoss.pl)}` : '-'}</td></tr>
              </tbody>
            </table>
          </div>

          <div class="table-box summary-full">
            <div class="table-box-title">
              <b>📌 Podsumowanie roczne</b>
              <span class="table-box-count"></span>
            </div>
            ${renderYearTable(metrics.yearly)}
          </div>

          <div class="table-box summary-full">
            <div class="table-box-title">
              <b>📑 Spółki – skumulowany wynik z powtórek</b>
              <span class="table-box-count">${(metrics.symbols || []).length} spółek</span>
            </div>
            ${renderSymbolRepeatTable(metrics.symbols)}
          </div>
        </div>
      </div>
    </details>
  `;
}

function renderSymbolRepeatTable(symbolRows) {
  if (!symbolRows || symbolRows.length === 0) {
    return '<div style="color:#94a3b8;">Brak danych</div>';
  }

  // Sort by cumulative summed % (desc), then by total P/L
  const sorted = [...symbolRows].sort((a, b) => {
    const ar = a.sumReturnPct ?? 0;
    const br = b.sumReturnPct ?? 0;
    if (br !== ar) return br - ar;
    return (b.pl ?? 0) - (a.pl ?? 0);
  });

  const rowsHtml = sorted.map(r => {
    const plCls = r.pl > 0 ? 'positive' : r.pl < 0 ? 'negative' : 'neutral';
    const retCls = r.sumReturnPct > 0 ? 'positive' : r.sumReturnPct < 0 ? 'negative' : 'neutral';

    const avgInv = (r.avgInvestment !== null && isFinite(r.avgInvestment))
      ? `${r.avgInvestment.toFixed(2)} EUR`
      : '-';

    const sumPct = (r.sumReturnPct !== null && isFinite(r.sumReturnPct))
      ? `${r.sumReturnPct >= 0 ? '+' : ''}${r.sumReturnPct.toFixed(2)}%`
      : '-';

    const totalPL = (r.pl !== null && isFinite(r.pl))
      ? `${r.pl >= 0 ? '+' : ''}${r.pl.toFixed(2)} EUR`
      : '-';

    return `
      <tr class="summary-symbol-row" data-symbol="${String(r.symbol).replace(/"/g, '&quot;')}">
        <td style="font-weight:800;">${r.symbol}</td>
        <td>${r.trades}</td>
        <td>${avgInv}</td>
        <td class="${retCls}">${sumPct}</td>
        <td class="${plCls}">${totalPL}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="summary-table-scroll">
      <table class="mini-table summary-symbol-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Trades</th>
            <th>Śr. kwota inwestycji (Volume × Open price)</th>
            <th>Σ % (skumulowane)</th>
            <th>Σ P/L</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

function setupSymbolRepeatInteractivity(metrics) {
  const root = document.getElementById('summary-content');
  if (!root) return;

  const modal = document.getElementById('symbolTradesModal');
  const titleEl = document.getElementById('symbolTradesTitle');
  const container = document.getElementById('symbolTradesContainer');
  const closeBtn = document.getElementById('closeSymbolTradesBtn');

  if (!modal || !titleEl || !container || !closeBtn) return;

  const close = () => {
    modal.style.display = 'none';
  };

  // Bind close handlers once
  if (!modal.dataset.bound) {
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'block') close();
    });
    modal.dataset.bound = '1';
  }

  const fmtDate = (d) => (d instanceof Date && !isNaN(d))
    ? d.toLocaleString('pl-PL')
    : '-';

  const renderTradesForSymbol = (symbol) => {
    const trades = (metrics.entries || []).filter(e => e.symbol === symbol);
    const name = trades.find(t => t.name)?.name;
    titleEl.textContent = `📑 ${symbol}${name ? ' — ' + name : ''} (${trades.length})`;

    if (!trades.length) {
      container.innerHTML = '<div style="color:#94a3b8;">Brak danych</div>';
      return;
    }

    const rows = [...trades]
      .sort((a, b) => (a.closeTime?.getTime?.() ?? 0) - (b.closeTime?.getTime?.() ?? 0))
      .map(t => {
        const inv = t.investmentValue ?? t.saleValue;
        const invTxt = (inv !== null && isFinite(inv)) ? `${inv.toFixed(2)} EUR` : '-';
        const plTxt = (t.pl !== null && isFinite(t.pl)) ? formatMoneyEUR(t.pl) : '-';
        const retTxt = (t.retPct !== null && isFinite(t.retPct)) ? formatPct(t.retPct) : '-';
        const cls = (t.pl ?? 0) >= 0 ? 'positive' : 'negative';

        const volTxt = (t.vol !== null && isFinite(t.vol)) ? t.vol.toFixed(2) : '-';
        const openPxTxt = (t.openPrice !== null && isFinite(t.openPrice)) ? t.openPrice.toFixed(2) : '-';
        const closePxTxt = (t.closePrice !== null && isFinite(t.closePrice)) ? t.closePrice.toFixed(2) : '-';

        return `
          <tr>
            <td>${fmtDate(t.openTime)}</td>
            <td>${fmtDate(t.closeTime)}</td>
            <td>${volTxt}</td>
            <td>${openPxTxt}</td>
            <td>${closePxTxt}</td>
            <td>${invTxt}</td>
            <td class="${cls}">${plTxt}</td>
            <td class="${cls}">${retTxt}</td>
          </tr>
        `;
      }).join('');

    container.innerHTML = `
      <table class="monthly-table">
        <thead>
          <tr>
            <th>Open time</th>
            <th>Close time</th>
            <th>Volume</th>
            <th>Open price</th>
            <th>Close price</th>
            <th>Kwota inwestycji</th>
            <th>P/L</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  };

  // Delegate click from the aggregated table (bind once)
  if (!root.dataset.symbolRowBound) {
    root.addEventListener('click', (e) => {
      const row = e.target && e.target.closest ? e.target.closest('tr.summary-symbol-row') : null;
      if (!row) return;
      const symbol = row.getAttribute('data-symbol');
      if (!symbol) return;
      modal.style.display = 'block';
      container.innerHTML = '<div class="loading">Ładowanie danych...</div>';
      renderTradesForSymbol(symbol);
    });
    root.dataset.symbolRowBound = '1';
  }
}

function renderYearTable(yearRows) {
  if (!yearRows || yearRows.length === 0) {
    return '<div style="color:#94a3b8;">Brak danych</div>';
  }

  const rows = yearRows.map(y => {
    const cls = y.pl >= 0 ? 'pos' : 'neg';
    const avg = y.trades ? (y.pl / y.trades) : 0;
    return `
      <tr>
        <td style="font-weight:800;">${y.year}</td>
        <td class="${cls}">${y.pl.toFixed(2)}</td>
        <td>${y.trades}</td>
        <td>${avg.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
    <table class="mini-table">
      <thead>
        <tr>
          <th>Rok</th>
          <th>P/L</th>
          <th>Trades</th>
          <th>Śr. P/L</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderSummaryCharts(metrics) {
  if (!ensureChartJs()) return;

  // Destroy previous instances
  destroyChart(summaryCharts.equity);
  destroyChart(summaryCharts.monthly);
  destroyChart(summaryCharts.yearly);
  destroyChart(summaryCharts.winLoss);

  // Equity chart
  const eqCtx = document.getElementById('summaryEquityChart')?.getContext('2d');
  if (eqCtx) {
    summaryCharts.equity = new Chart(eqCtx, {
      type: 'line',
      data: {
        labels: metrics.equityPoints.map(p => p.t.toLocaleDateString('pl-PL')),
        datasets: [{
          label: 'P/L skumulowany (EUR)',
          data: metrics.equityPoints.map(p => p.v),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.12)',
          fill: true,
          tension: 0.25,
          pointRadius: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { ticks: { maxTicksLimit: 8 }, grid: { color: 'rgba(148,163,184,0.08)' } },
          y: { grid: { color: 'rgba(148,163,184,0.08)' } }
        }
      }
    });
  }

  // Monthly P/L
  const mCtx = document.getElementById('summaryMonthlyChart')?.getContext('2d');
  if (mCtx) {
    const labels = metrics.monthly.map(m => m.key);
    const data = metrics.monthly.map(m => m.pl);
    summaryCharts.monthly = new Chart(mCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'P/L miesięczny (EUR)',
          data,
          backgroundColor: data.map(v => v >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'),
          borderColor: data.map(v => v >= 0 ? '#10b981' : '#ef4444'),
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 10 }, grid: { color: 'rgba(148,163,184,0.08)' } },
          y: { grid: { color: 'rgba(148,163,184,0.08)' } }
        }
      }
    });
  }

  // Monthly Turnover
  const tCtx = document.getElementById('summaryTurnoverChart')?.getContext('2d');
  if (tCtx) {
    const labels = metrics.monthly.map(m => m.key);
    const turnoverData = metrics.monthly.map(m => m.turnover || 0);
    const tradesData = metrics.monthly.map(m => m.trades || 0);
    const plData = metrics.monthly.map(m => m.pl || 0);
    summaryCharts.turnover = new Chart(tCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Obrót (EUR)',
            data: turnoverData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,0.12)',
            fill: true,
            tension: 0.25,
            pointRadius: 0,
            yAxisID: 'y',
          },
          {
            label: 'Zysk/Strata (P/L EUR)',
            data: plData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.08)',
            fill: false,
            tension: 0.25,
            pointRadius: 2,
            yAxisID: 'y2',
          },
          {
            label: 'Zamknięte pozycje (liczba)',
            data: tradesData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.10)',
            fill: false,
            tension: 0.25,
            pointRadius: 2,
            yAxisID: 'y1',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const label = ctx.dataset?.label || '';
                const value = ctx.parsed?.y ?? 0;
                if (label.includes('Obrót')) return `${label}: ${value.toFixed(2)} EUR`;
                if (label.includes('P/L')) return `${label}: ${value.toFixed(2)} EUR`;
                return `${label}: ${value}`;
              },
            }
          }
        },
        scales: {
          x: { ticks: { maxTicksLimit: 10 }, grid: { color: 'rgba(148,163,184,0.08)' } },
          y: {
            position: 'left',
            grid: { color: 'rgba(148,163,184,0.08)' },
            ticks: {
              callback: (v) => `${v}`
            }
          },
          y1: {
            position: 'right',
            grid: { drawOnChartArea: false },
            beginAtZero: true,
            offset: false,
            ticks: {
              precision: 0
            }
          },
          y2: {
            position: 'right',
            grid: { drawOnChartArea: false },
            offset: true,
            ticks: {
              callback: (v) => `${v}`
            }
          }
        }
      }
    });
  }

  // Yearly P/L
  const yCtx = document.getElementById('summaryYearlyChart')?.getContext('2d');
  if (yCtx) {
    const labels = metrics.yearly.map(y => String(y.year));
    const data = metrics.yearly.map(y => y.pl);
    summaryCharts.yearly = new Chart(yCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'P/L roczny (EUR)',
          data,
          backgroundColor: data.map(v => v >= 0 ? 'rgba(245,158,11,0.75)' : 'rgba(239,68,68,0.75)'),
          borderColor: data.map(v => v >= 0 ? '#f59e0b' : '#ef4444'),
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(148,163,184,0.08)' } }
        }
      }
    });
  }

  // Win/Loss donut
  const wlCtx = document.getElementById('summaryWinLossChart')?.getContext('2d');
  if (wlCtx) {
    summaryCharts.winLoss = new Chart(wlCtx, {
      type: 'doughnut',
      data: {
        labels: ['Win', 'Loss'],
        datasets: [{
          data: [metrics.winCount, metrics.lossCount],
          backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(239,68,68,0.8)'],
          borderColor: ['#10b981', '#ef4444'],
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        cutout: '65%'
      }
    });
  }
}

function renderTurnoverChart(metrics) {
  if (!ensureChartJs()) return;

  const tCtx = document.getElementById('summaryTurnoverChart')?.getContext('2d');
  if (!tCtx) return;

  destroyChart(summaryCharts.turnover);

  const labels = metrics.monthly.map(m => m.key);
  const turnoverData = metrics.monthly.map(m => m.turnover || 0);
  const tradesData = metrics.monthly.map(m => m.trades || 0);
  const plData = metrics.monthly.map(m => m.pl || 0);

  summaryCharts.turnover = new Chart(tCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Obrót (EUR)',
          data: turnoverData,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.12)',
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Zysk/Strata (P/L EUR)',
          data: plData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.08)',
          fill: false,
          tension: 0.25,
          pointRadius: 2,
          yAxisID: 'y2',
        },
        {
          label: 'Zamknięte pozycje (liczba)',
          data: tradesData,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.10)',
          fill: false,
          tension: 0.25,
          pointRadius: 2,
          yAxisID: 'y1',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.dataset?.label || '';
              const value = ctx.parsed?.y ?? 0;
              if (label.includes('Obrót')) return `${label}: ${value.toFixed(2)} EUR`;
              if (label.includes('P/L')) return `${label}: ${value.toFixed(2)} EUR`;
              return `${label}: ${value}`;
            },
          }
        }
      },
      scales: {
        x: { ticks: { maxTicksLimit: 10 }, grid: { color: 'rgba(148,163,184,0.08)' } },
        y: {
          position: 'left',
          grid: { color: 'rgba(148,163,184,0.08)' },
        },
        y1: {
          position: 'right',
          grid: { drawOnChartArea: false },
          beginAtZero: true,
          offset: false,
          ticks: { precision: 0 }
        },
        y2: {
          position: 'right',
          grid: { drawOnChartArea: false },
          offset: true,
        }
      }
    }
  });
}

function renderProfitLossChart(metrics) {
  if (!ensureChartJs()) return;

  const ctx = document.getElementById('summaryProfitLossChart')?.getContext('2d');
  if (!ctx) return;

  destroyChart(summaryCharts.profitLoss);

  const profits = metrics.sumWins || 0;
  const losses = metrics.sumLossesAbs || 0;
  const net = (metrics.totalPL || 0);

  const labelProfits = `Zarobki: ${profits.toFixed(2)} EUR`;
  const labelLosses = `Straty: ${losses.toFixed(2)} EUR`;

  const centerTextPlugin = {
    id: 'profitLossCenterText',
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;

      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 12px Inter, Segoe UI, system-ui, sans-serif';
      ctx.fillText('Netto', cx, cy - 10);

      ctx.fillStyle = net >= 0 ? '#10b981' : '#ef4444';
      ctx.font = '800 14px Inter, Segoe UI, system-ui, sans-serif';
      const sign = net >= 0 ? '+' : '';
      ctx.fillText(`${sign}${net.toFixed(2)} EUR`, cx, cy + 10);

      ctx.restore();
    }
  };

  summaryCharts.profitLoss = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [labelProfits, labelLosses],
      datasets: [{
        data: [profits, losses],
        backgroundColor: ['rgba(16,185,129,0.82)', 'rgba(239,68,68,0.82)'],
        borderColor: ['#10b981', '#ef4444'],
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.label || '';
              const value = ctx.parsed || 0;
              const pct = (profits + losses) > 0 ? (value / (profits + losses) * 100) : 0;
              return `${label} (${pct.toFixed(1)}%)`;
            }
          }
        }
      },
      cutout: '65%'
    },
    plugins: [centerTextPlugin]
  });
}

function setDatasetVisible(chart, datasetIndex, isVisible) {
  if (!chart) return;
  if (!chart.data?.datasets?.[datasetIndex]) return;
  chart.data.datasets[datasetIndex].hidden = !isVisible;
  chart.update();
}

function setupTurnoverInteractivity(metrics) {
  const details = document.getElementById('summary-details');
  const toggleTurnover = document.getElementById('toggleTurnover');
  const togglePL = document.getElementById('togglePL');
  const toggleTrades = document.getElementById('toggleTrades');

  if (!details) return;

  const ensureRendered = () => {
    if (!summaryCharts.turnover) {
      renderTurnoverChart(metrics);
    }
    if (!summaryCharts.profitLoss) {
      renderProfitLossChart(metrics);
    }

    // Resize/update after becoming visible
    try {
      summaryCharts.turnover?.resize?.();
      summaryCharts.turnover?.update?.();
      summaryCharts.profitLoss?.resize?.();
      summaryCharts.profitLoss?.update?.();
    } catch {
      // ignore
    }
  };

  // Lazy render when details is opened (canvas may have 0 size when hidden)
  const onToggle = () => {
    if (details.open) {
      ensureRendered();
      if (toggleTurnover) setDatasetVisible(summaryCharts.turnover, 0, toggleTurnover.checked);
      if (togglePL) setDatasetVisible(summaryCharts.turnover, 1, togglePL.checked);
      if (toggleTrades) setDatasetVisible(summaryCharts.turnover, 2, toggleTrades.checked);
    } else {
      // free resources when hidden
      destroyChart(summaryCharts.turnover);
      summaryCharts.turnover = null;

      destroyChart(summaryCharts.profitLoss);
      summaryCharts.profitLoss = null;
    }
  };

  details.removeEventListener('toggle', onToggle);
  details.addEventListener('toggle', onToggle);

  const bind = (el, idx) => {
    if (!el) return;
    el.onchange = () => {
      if (!details.open) return;
      ensureRendered();
      setDatasetVisible(summaryCharts.turnover, idx, el.checked);
    };
  };
  bind(toggleTurnover, 0);
  bind(togglePL, 1);
  bind(toggleTrades, 2);

  // If user already has details open
  if (details.open) onToggle();
}

function loadSummaryContent() {
  const content = document.getElementById('summary-content');
  if (!content) return;

  const entries = window.allEntries;
  const metrics = computeTradeMetrics(entries);

  renderSummaryHTML(metrics);
  renderSummaryCharts(metrics);
  setupTurnoverInteractivity(metrics);
  setupSymbolRepeatInteractivity(metrics);
}

// Expose for tabs.js
window.loadSummaryContent = loadSummaryContent;

// Auto-render once data appears (first time)
document.addEventListener('DOMContentLoaded', () => {
  let tries = 0;
  const maxTries = 30; // ~6 seconds
  const timer = setInterval(() => {
    tries += 1;
    if (window.allEntries && Array.isArray(window.allEntries) && window.allEntries.length > 0) {
      // only precompute if user is already on summary
      const summaryView = document.getElementById('summary-view');
      if (summaryView && summaryView.classList.contains('active')) {
        loadSummaryContent();
      }
      clearInterval(timer);
    }
    if (tries >= maxTries) clearInterval(timer);
  }, 200);
});
