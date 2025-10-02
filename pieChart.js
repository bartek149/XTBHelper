function renderPieCharts(entries) {
  const symbolProfits = {};

  entries.forEach(entry => {
    const symbol = entry['Symbol'];
    const profit = parseFloat(entry['Gross P/L']);
    if (!symbol || isNaN(profit)) return;

    if (!symbolProfits[symbol]) {
      symbolProfits[symbol] = 0;
    }
    symbolProfits[symbol] += profit;
  });

  const sortedSymbols = Object.entries(symbolProfits).sort((a, b) => b[1] - a[1]);

  const topWinners = sortedSymbols.slice(0, 5);
  const topLosers = sortedSymbols
    .filter(([_, val]) => val < 0)
    .slice(-5)
    .reverse();

  createPieChart("bestStocksChart", topWinners, "Najlepsze spółki", true);
  createPieChart("worstStocksChart", topLosers, "Najgorsze spółki", false);
}

function createPieChart(canvasId, dataEntries, title, isPositive) {
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return;

  const labels = dataEntries.map(e => e[0]);
  const data = dataEntries.map(e => Math.abs(e[1]));

  // 🎨 Kolory gradientowe dla efektu 3D (symulowanego)
  const positiveColors = [
    'rgba(34,197,94,0.8)',    // green
    'rgba(16,185,129,0.8)',   // emerald
    'rgba(59,130,246,0.8)',   // blue
    'rgba(132,204,22,0.8)',   // lime
    'rgba(94,234,212,0.8)'    // teal
  ];

  const negativeColors = [
    'rgba(239,68,68,0.8)',    // red
    'rgba(244,63,94,0.8)',    // rose
    'rgba(190,24,93,0.8)',    // fuchsia
    'rgba(202,138,4,0.8)',    // amber
    'rgba(120,53,15,0.8)'     // brownish
  ];

  const backgroundColors = isPositive ? positiveColors : negativeColors;

  new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        label: title,
        data,
        backgroundColor: backgroundColors,
        borderColor: 'rgba(0, 0, 0, 0.4)',
        borderWidth: 3,
        hoverOffset: 12, // efekt podskoku
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateRotate: true,
        animateScale: true
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#e5e7eb',
            font: {
              size: 12,
              weight: 'bold'
            },
            padding: 16
          }
        },
        title: {
          display: true,
          text: title,
          color: '#f3f4f6',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${value.toFixed(2)} €`;
            }
          }
        }
      },
      layout: {
        padding: 10
      }
    }
  });
}
