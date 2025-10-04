/**
 * XTBHelper - Main Module
 * 
 * Core helper functionality for XTB trading data analysis
 * Features:
 * - Excel file parsing and data processing
 * - Interactive capital growth charts
 * - Monthly transaction filtering
 * - Deposit tracking and ROI calculations
 * - CSV export functionality
 * 
 * @author XTBHelper
 * @version 1.6.0
 */

console.log('🔄 XTBHelper Dashboard v1.6.0 - Added turnover return % and fixed column widths!');

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
      setupCsvExport(closedEntries, deposits);
     
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
      maintainAspectRatio: false,
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

/**
 * Setup CSV export functionality for Capital chart data
 * @param {Array} entries - Closed position entries
 * @param {Array} deposits - Deposit entries
 */
function setupCsvExport(entries, deposits) {
  const exportBtn = document.getElementById('exportCsvBtn');
  const showTableBtn = document.getElementById('showTableBtn');
  
  if (!exportBtn || !showTableBtn) return;

  exportBtn.addEventListener('click', () => {
    exportCapitalDataToCsv(entries, deposits);
  });

  showTableBtn.addEventListener('click', () => {
    showMonthlyTable(entries, deposits);
  });
}

/**
 * Export monthly capital summary to CSV
 * @param {Array} entries - Closed position entries
 * @param {Array} deposits - Deposit entries
 */
function exportCapitalDataToCsv(entries, deposits) {
  const exportBtn = document.getElementById('exportCsvBtn');
  
  try {
    // Process data and group by month
    const profits = entries.map(e => {
      const date = parseDateValue(e['Close time']);
      const amount = parseFloat(e['Gross P/L']);
      return date && !isNaN(amount)
        ? { date, amount, type: 'profit' }
        : null;
    }).filter(e => e);

    const depositsOnly = deposits.map(d => ({ 
      ...d, 
      type: 'deposit' 
    }));

    const allEvents = [...depositsOnly, ...profits];
    allEvents.sort((a, b) => a.date - b.date);

    // Group by month - create proper monthly summaries
    const monthlyData = {};
    
    // First, collect all unique months
    const monthKeys = new Set();
    allEvents.forEach(e => {
      const monthKey = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
      monthKeys.add(monthKey);
    });
    
    // Sort months chronologically
    const sortedMonthKeys = Array.from(monthKeys).sort();
    
    // Calculate start capital for each month
    let runningCapital = 0;
    
    sortedMonthKeys.forEach(monthKey => {
      // Clean month name without year
      const monthName = new Date(monthKey + '-01').toLocaleDateString('pl-PL', { month: 'long' });
      
      // Get all events for this month
      const monthEvents = allEvents.filter(e => {
        const eventMonthKey = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
        return eventMonthKey === monthKey;
      });
      
      // Calculate totals for this month
      const monthlyEarnings = monthEvents
        .filter(e => e.type === 'profit')
        .reduce((sum, e) => sum + e.amount, 0);
        
      const monthlyDeposits = monthEvents
        .filter(e => e.type === 'deposit')
        .reduce((sum, e) => sum + e.amount, 0);
      
      // Calculate turnover from closed positions - money used to buy shares
      const monthStart = new Date(monthKey + '-01');
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
      
      const monthClosedPositions = entries.filter(e => {
        const closeDate = parseDateValue(e['Close time']);
        return closeDate && closeDate >= monthStart && closeDate <= monthEnd;
      });
      
      // Calculate turnover as the absolute value of the original investment (Volume * Open Price)
      const monthlyTurnover = monthClosedPositions.reduce((sum, position) => {
        const volume = parseFloat(position['Volume']) || 0;
        const openPrice = parseFloat(position['Open price']) || 0;
        return sum + Math.abs(volume * openPrice);
      }, 0);
      
      // Store monthly data
      monthlyData[monthKey] = {
        monthName,
        earnings: monthlyEarnings,
        deposits: monthlyDeposits,
        turnover: monthlyTurnover,
        capitalStart: runningCapital,
        capitalEnd: runningCapital + monthlyEarnings + monthlyDeposits
      };
      
      // Update running capital for next month
      runningCapital += monthlyEarnings + monthlyDeposits;
    });

    // Create CSV data
    const csvData = [];
    csvData.push([
      'Miesiąc',
      'Kapitał na początku',
      'Zarobione w miesiącu',
      'Wpłaty w miesiącu',
      'Obrót miesięczny',
      'Zwrot z obrotu %',
      'Kapitał na końcu',
      'Zwrot w %'
    ]);

    sortedMonthKeys.forEach(monthKey => {
      const month = monthlyData[monthKey];
      
      // Calculate percentages with proper handling
      // Return % should be calculated from total capital (earnings / total capital * 100)
      const returnPercent = month.capitalEnd > 0 ? (month.earnings / month.capitalEnd * 100) : 0;
      // Turnover return % (earnings / turnover * 100)
      const turnoverReturnPercent = month.turnover > 0 ? (month.earnings / month.turnover * 100) : 0;

      csvData.push([
        month.monthName,
        month.capitalStart.toFixed(2),
        month.earnings.toFixed(2),
        month.deposits.toFixed(2),
        month.turnover.toFixed(2),
        turnoverReturnPercent.toFixed(2),
        month.capitalEnd.toFixed(2),
        returnPercent.toFixed(2)
      ]);
    });

    // Add summary row
    const totalEarnings = Object.values(monthlyData).reduce((sum, month) => sum + month.earnings, 0);
    const totalDeposits = Object.values(monthlyData).reduce((sum, month) => sum + month.deposits, 0);
    const overallReturn = totalDeposits > 0 ? (totalEarnings / totalDeposits * 100) : 0;
    const finalCapital = runningCapital; // This is the final capital after all months

    const totalTurnover = Object.values(monthlyData).reduce((sum, month) => sum + month.turnover, 0);
    const overallReturnPercent = finalCapital > 0 ? (totalEarnings / finalCapital * 100) : 0;
    const overallTurnoverReturnPercent = totalTurnover > 0 ? (totalEarnings / totalTurnover * 100) : 0;
    
    csvData.push(['']); // Empty row
    csvData.push([
      'PODSUMOWANIE',
      '',
      totalEarnings.toFixed(2),
      totalDeposits.toFixed(2),
      totalTurnover.toFixed(2),
      overallTurnoverReturnPercent.toFixed(2),
      finalCapital.toFixed(2),
      overallReturnPercent.toFixed(2)
    ]);

    // Convert to CSV string with proper formatting
    const csvContent = csvData.map(row => 
      row.map(cell => {
        // Handle empty cells
        if (cell === '' || cell === null || cell === undefined) {
          return '""';
        }
        // Escape quotes and wrap in quotes
        const cleanCell = String(cell).replace(/"/g, '""');
        return `"${cleanCell}"`;
      }).join(',')
    ).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `XTBHelper_Miesieczny_Przeglad_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('✅ Monthly CSV export completed successfully');
    console.log('📊 Monthly data summary:', Object.keys(monthlyData).map(key => ({
      month: monthlyData[key].monthName,
      earnings: monthlyData[key].earnings,
      deposits: monthlyData[key].deposits,
      capitalStart: monthlyData[key].capitalStart,
      capitalEnd: monthlyData[key].capitalEnd
    })));
    
    // Show success message
    const originalText = exportBtn.textContent;
    exportBtn.textContent = '✅ Gotowe!';
    exportBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    
    setTimeout(() => {
      exportBtn.textContent = originalText;
    }, 2000);

  } catch (error) {
    console.error('❌ Error exporting CSV:', error);
    
    // Show error message
    const originalText = exportBtn.textContent;
    exportBtn.textContent = '❌ Błąd';
    exportBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    
    setTimeout(() => {
      exportBtn.textContent = originalText;
      exportBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    }, 2000);
  }
}

/**
 * Show monthly table in modal
 * @param {Array} entries - Closed position entries
 * @param {Array} deposits - Deposit entries
 */
function showMonthlyTable(entries, deposits) {
  const modal = document.getElementById('monthlyTableModal');
  const container = document.getElementById('monthlyTableContainer');
  
  if (!modal || !container) return;

  // Show modal
  modal.style.display = 'block';
  container.innerHTML = '<div class="loading">Ładowanie danych...</div>';

  try {
    // Use the same logic as CSV export to generate monthly data
    const profits = entries.map(e => {
      const date = parseDateValue(e['Close time']);
      const amount = parseFloat(e['Gross P/L']);
      return date && !isNaN(amount)
        ? { date, amount, type: 'profit' }
        : null;
    }).filter(e => e);

    const depositsOnly = deposits.map(d => ({ 
      ...d, 
      type: 'deposit' 
    }));

    const allEvents = [...depositsOnly, ...profits];
    allEvents.sort((a, b) => a.date - b.date);

    // Group by month - same logic as CSV export
    const monthlyData = {};
    const monthKeys = new Set();
    allEvents.forEach(e => {
      const monthKey = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
      monthKeys.add(monthKey);
    });
    
    const sortedMonthKeys = Array.from(monthKeys).sort();
    let runningCapital = 0;
    
    sortedMonthKeys.forEach(monthKey => {
      const monthName = new Date(monthKey + '-01').toLocaleDateString('pl-PL', { month: 'long' });
      
      const monthEvents = allEvents.filter(e => {
        const eventMonthKey = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
        return eventMonthKey === monthKey;
      });
      
      const monthlyEarnings = monthEvents
        .filter(e => e.type === 'profit')
        .reduce((sum, e) => sum + e.amount, 0);
        
      const monthlyDeposits = monthEvents
        .filter(e => e.type === 'deposit')
        .reduce((sum, e) => sum + e.amount, 0);
      
      // Calculate turnover from closed positions - money used to buy shares
      const monthStart = new Date(monthKey + '-01');
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
      
      const monthClosedPositions = entries.filter(e => {
        const closeDate = parseDateValue(e['Close time']);
        return closeDate && closeDate >= monthStart && closeDate <= monthEnd;
      });
      
      // Calculate turnover as the absolute value of the original investment (Volume * Open Price)
      const monthlyTurnover = monthClosedPositions.reduce((sum, position) => {
        const volume = parseFloat(position['Volume']) || 0;
        const openPrice = parseFloat(position['Open price']) || 0;
        return sum + Math.abs(volume * openPrice);
      }, 0);
      
      monthlyData[monthKey] = {
        monthName,
        earnings: monthlyEarnings,
        deposits: monthlyDeposits,
        turnover: monthlyTurnover,
        capitalStart: runningCapital,
        capitalEnd: runningCapital + monthlyEarnings + monthlyDeposits
      };
      
      runningCapital += monthlyEarnings + monthlyDeposits;
    });

    // Generate table HTML
    let tableHTML = `
      <table class="monthly-table">
        <thead>
          <tr>
            <th>Miesiąc</th>
            <th>Kapitał na początku</th>
            <th>Zarobione w miesiącu</th>
            <th>Wpłaty w miesiącu</th>
            <th>Obrót miesięczny</th>
            <th>Zwrot z obrotu %</th>
            <th>Kapitał na końcu</th>
            <th>Zwrot w %</th>
          </tr>
        </thead>
        <tbody>
    `;

    sortedMonthKeys.forEach(monthKey => {
      const month = monthlyData[monthKey];
      // Return % should be calculated from total capital (earnings / total capital * 100)
      const returnPercent = month.capitalEnd > 0 ? (month.earnings / month.capitalEnd * 100) : 0;
      // Turnover return % (earnings / turnover * 100)
      const turnoverReturnPercent = month.turnover > 0 ? (month.earnings / month.turnover * 100) : 0;

      const earningsClass = month.earnings > 0 ? 'positive' : month.earnings < 0 ? 'negative' : 'neutral';
      const returnClass = returnPercent > 0 ? 'positive' : returnPercent < 0 ? 'negative' : 'neutral';
      const turnoverReturnClass = turnoverReturnPercent > 0 ? 'positive' : turnoverReturnPercent < 0 ? 'negative' : 'neutral';

      tableHTML += `
        <tr>
          <td><strong>${month.monthName}</strong></td>
          <td>${month.capitalStart.toFixed(2)} EUR</td>
          <td class="${earningsClass}">${month.earnings.toFixed(2)} EUR</td>
          <td>${month.deposits.toFixed(2)} EUR</td>
          <td><strong>${month.turnover.toFixed(2)} EUR</strong></td>
          <td class="${turnoverReturnClass}"><strong>${turnoverReturnPercent.toFixed(2)}%</strong></td>
          <td><strong>${month.capitalEnd.toFixed(2)} EUR</strong></td>
          <td class="${returnClass}">${returnPercent.toFixed(2)}%</td>
        </tr>
      `;
    });

    // Add summary row
    const totalEarnings = Object.values(monthlyData).reduce((sum, month) => sum + month.earnings, 0);
    const totalDeposits = Object.values(monthlyData).reduce((sum, month) => sum + month.deposits, 0);
    const totalTurnover = Object.values(monthlyData).reduce((sum, month) => sum + month.turnover, 0);
    const finalCapital = runningCapital;

    const summaryEarningsClass = totalEarnings > 0 ? 'positive' : totalEarnings < 0 ? 'negative' : 'neutral';
    const overallReturnPercent = finalCapital > 0 ? (totalEarnings / finalCapital * 100) : 0;
    const overallTurnoverReturnPercent = totalTurnover > 0 ? (totalEarnings / totalTurnover * 100) : 0;
    const summaryReturnClass = overallReturnPercent > 0 ? 'positive' : overallReturnPercent < 0 ? 'negative' : 'neutral';
    const summaryTurnoverReturnClass = overallTurnoverReturnPercent > 0 ? 'positive' : overallTurnoverReturnPercent < 0 ? 'negative' : 'neutral';

    tableHTML += `
        <tr class="summary-row">
          <td><strong>PODSUMOWANIE</strong></td>
          <td>-</td>
          <td class="${summaryEarningsClass}"><strong>${totalEarnings.toFixed(2)} EUR</strong></td>
          <td><strong>${totalDeposits.toFixed(2)} EUR</strong></td>
          <td><strong>${totalTurnover.toFixed(2)} EUR</strong></td>
          <td class="${summaryTurnoverReturnClass}"><strong>${overallTurnoverReturnPercent.toFixed(2)}%</strong></td>
          <td><strong>${finalCapital.toFixed(2)} EUR</strong></td>
          <td class="${summaryReturnClass}"><strong>${overallReturnPercent.toFixed(2)}%</strong></td>
        </tr>
      </tbody>
    </table>
    `;

    container.innerHTML = tableHTML;

  } catch (error) {
    console.error('❌ Error generating monthly table:', error);
    container.innerHTML = `
      <div style="color: #ef4444; text-align: center; padding: 2rem;">
        ❌ Błąd podczas ładowania danych: ${error.message}
      </div>
    `;
  }
}

// Setup modal event listeners
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('monthlyTableModal');
  const closeBtn = document.getElementById('closeModalBtn');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'block') {
      modal.style.display = 'none';
    }
  });
});