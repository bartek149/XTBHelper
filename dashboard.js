/**
 * XTBHelper - Main Module
 * 
 * Core helper functionality for XTB trading data analysis
 * Features:
 * - Excel file parsing and data processing
 * - Interactive capital growth charts
 * - Monthly transaction filtering
 * - Deposit tracking and ROI calculations
 * 
 * @author XTBHelper
 * @version 1.0.0
 */

window.addEventListener("DOMContentLoaded", () => {
  fetch("raport.xlsx")
    .then((res) => {
      if (!res.ok) throw new Error("Nie można znaleźć raport.xlsx");
      return res.arrayBuffer();
    })
    .then((data) => {
      const wb = XLSX.read(data, { type: "array" });

      // 1. Arkusz zamkniętych pozycji
      const closedSheetName = wb.SheetNames.find((name) => name.toLowerCase().includes("closed"));
      const wsClosed = wb.Sheets[closedSheetName];
      const jsonClosedRaw = XLSX.utils.sheet_to_json(wsClosed, { header: 1 });
      const headerIndex = jsonClosedRaw.findIndex((row) => row.includes("Symbol"));
      const headers = jsonClosedRaw[headerIndex];
      const rows = jsonClosedRaw.slice(headerIndex + 1);
      const closedEntries = rows.map((row) => {
        const obj = {};
        headers.forEach((h, i) => (obj[h] = row[i]));
        return obj;
      }).reverse();
      

      window.allEntries = closedEntries;
      window.currentMonthOffset = 0;

      renderTable(closedEntries, document.getElementById("all-table"));
      renderRecentTable(closedEntries);

      // 2. Arkusz wpłat (index 3)
      const depositsSheetName = wb.SheetNames[3];
      const wsDeposits = wb.Sheets[depositsSheetName];
      const deposits = extractDeposits(wsDeposits);

      renderCapitalChart(closedEntries, deposits);
     
    })
    .catch((err) => {
      console.error("❌ Błąd:", err);
      document.getElementById("all-table").textContent = "Błąd: " + err.message;
    });
});

function parseDateValue(val) {
  if (typeof val === "number") {
    const utcDays = val - 25569;
    const ms = utcDays * 86400 * 1000;
    return new Date(ms);
  }
  if (typeof val === "string") {
    const clean = val.replace(" ", "T").split(".")[0];
    const d = new Date(clean);
    return isNaN(d) ? null : d;
  }
  return null;
}

function renderCapitalChart(entries, deposits) {
  const ctx = document.getElementById("profitChart")?.getContext("2d");
  if (!ctx) return console.warn("Brak canvas o ID 'profitChart'");

  const profits = entries.map(e => {
    const date = parseDateValue(e['Close time']);
    const amount = parseFloat(e['Gross P/L']);
    return date && !isNaN(amount)
      ? { date, amount }
      : null;
  }).filter(e => e);

  const depositsOnly = deposits.map(d => ({ ...d, type: 'deposit' }));
  const profitsOnly = profits.map(p => ({ ...p, type: 'profit' }));
  const allEvents = [...depositsOnly, ...profitsOnly];
  allEvents.sort((a, b) => a.date - b.date);

  let capital = 0;
  let profitOnlyCapital = 0;
  let depositsOnlyCapital = 0;
  const labels = [];
  const capitalData = [];
  const profitOnlyData = [];
  const depositsOnlyData = [];

  allEvents.forEach(e => {
    capital += e.amount;
    if (e.type === 'profit') {
      profitOnlyCapital += e.amount;
    } else if (e.type === 'deposit') {
      depositsOnlyCapital += e.amount;
    }
    labels.push(e.date.toLocaleDateString("pl-PL"));
    capitalData.push(capital);
    profitOnlyData.push(profitOnlyCapital);
    depositsOnlyData.push(depositsOnlyCapital);
  });

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Kapitał (łącznie z wpłatami)",
          data: capitalData,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.1)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Zysk/Strata (zamknięte pozycje)",
          data: profitOnlyData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.1)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Wpłaty własne (skumulowane)",
          data: depositsOnlyData,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245,158,11,0.1)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const datasetLabel = context.dataset.label || '';
              const value = context.parsed.y;
              const index = context.dataIndex;

              if (datasetLabel.includes("Zysk")) {
                const capital = context.chart.data.datasets[0].data[index];
                const profit = value;
                const percent = capital ? ((profit / capital) * 100).toFixed(2) : "0.00";

                return [
                  `💰 ${datasetLabel}: ${profit.toFixed(2)} EUR`,
                  `📊 Udział w kapitale: ${percent}%`
                ];
              } else if (datasetLabel.includes("Wpłaty")) {
                const capital = context.chart.data.datasets[0].data[index];
                const deposits = value;
                const percent = capital ? ((deposits / capital) * 100).toFixed(2) : "0.00";

                return [
                  `💳 ${datasetLabel}: ${deposits.toFixed(2)} EUR`,
                  `📊 Udział w kapitale: ${percent}%`
                ];
              } else {
                const deposits = context.chart.data.datasets[2].data[index] || 0;
                const profit = context.chart.data.datasets[1].data[index] || 0;
                const totalReturn = value > 0 ? ((profit / deposits) * 100).toFixed(2) : "0.00";

                return [
                  `🏦 ${datasetLabel}: ${value.toFixed(2)} EUR`,
                  `📈 Zwrot z inwestycji: ${totalReturn}%`
                ];
              }
            }
          }
        }
      }
    },
  });
}


function renderTable(data, container) {
  if (!data || !data.length) {
    container.innerHTML = "<p>Brak danych do wyświetlenia.</p>";
    return;
  }

  const table = document.createElement("table");
  const thead = table.createTHead();
  const tbody = table.createTBody();

  const headerRow = thead.insertRow();
  Object.keys(data[0]).forEach((key) => {
    const th = document.createElement("th");
    th.textContent = key;
    headerRow.appendChild(th);
  });

  data.forEach((row) => {
    const tr = tbody.insertRow();
    Object.values(row).forEach((val) => {
      const td = tr.insertCell();
      td.textContent = val;
    });
  });

  container.innerHTML = "";
  container.appendChild(table);
}

function renderRecentTable(entries) {
  const recent = filterByMonth(entries, window.currentMonthOffset);
  renderTable(recent, document.getElementById("recent-table"));
  updateMonthLabel(window.currentMonthOffset);
}

function renderRawTable(sheet) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const container = document.getElementById("raw-table");

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Brak danych w arkuszu 4.</p>";
    return;
  }

  const table = document.createElement("table");
  const tbody = table.createTBody();

  data.forEach((row) => {
    const tr = tbody.insertRow();
    row.forEach((cell) => {
      const td = tr.insertCell();
      td.textContent = cell ?? "";
    });
  });

  container.innerHTML = "";
  container.appendChild(table);
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

function updateMonthLabel(offset) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const label = target.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' });

  const monthEntries = filterByMonth(window.allEntries, offset);
  const saldo = monthEntries.reduce((sum, e) => sum + (parseFloat(e['Gross P/L']) || 0), 0);

  // 🟢 znajdź wszystkie depozyty do końca tego miesiąca
  const depositsUntilMonth = window.deposits
    .filter(d => d.date <= new Date(target.getFullYear(), target.getMonth() + 1, 0))
    .reduce((sum, d) => sum + d.amount, 0);

  // 🟢 procent za miesiąc = saldo / kapitał początkowy miesiąca
  const monthStartDeposits = window.deposits
    .filter(d => d.date < target)
    .reduce((sum, d) => sum + d.amount, 0);

  const baseCapital = monthStartDeposits || 1; // unikamy dzielenia przez 0
  const avgPercent = (saldo / baseCapital * 100).toFixed(2);

  const saldoFormatted = saldo.toFixed(2);

  document.getElementById("current-month").textContent =
    `📅 ${label} | Saldo: ${saldoFormatted} EUR | 📊 ${avgPercent}%`;
}


function extractDeposits(sheet) {
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headerRowIndex = raw.findIndex(row =>
    row.includes("Type") && row.includes("Time") && row.includes("Amount")
  );

  if (headerRowIndex === -1) return [];

  const headers = raw[headerRowIndex];
  const rows = raw.slice(headerRowIndex + 1);

  const typeIndex = headers.indexOf("Type");
  const timeIndex = headers.indexOf("Time");
  const amountIndex = headers.indexOf("Amount");

  return rows
    .filter(row => row[typeIndex] === "deposit")
    .map(row => ({
      date: parseDateValue(row[timeIndex]),
      amount: parseFloat(row[amountIndex])
    }))
    .filter(entry => entry.date && !isNaN(entry.amount));
}