# 🛠️ XTBHelper

Praktyczne narzędzie pomocnicze do analizy transakcji z platformy XTB z funkcjami pobierania cen na żywo i szczegółową analizą portfela.

## ✨ Funkcjonalności

### 📊 Główne funkcje
- **Analiza zamkniętych pozycji** - Pełna historia transakcji z filtrami miesięcznymi
- **Otwarte pozycje na żywo** - Aktualne ceny, zyski/straty i procenty w czasie rzeczywistym
- **Wykres kapitału** - Wizualizacja wzrostu kapitału z podziałem na wpłaty i zyski
- **Najlepsze/najgorsze spółki** - Wykresy kołowe pokazujące performance
- **Automatyczne odświeżanie** - Ceny aktualizują się co 30 sekund

### 🔥 Zaawansowane funkcje
- **Multi-API cenowe** - Yahoo Finance, Finnhub, Binance z fallback
- **Inteligentne obliczenia** - Uwzględnia typ pozycji (BUY/SELL)
- **Podsumowanie portfela** - Łączne zyski, straty i ROI
- **Responsywny design** - Działa na wszystkich urządzeniach
- **Animacje i efekty** - Nowoczesny, interaktywny interfejs

## 🚀 Szybki start

### Wymagania
- Przeglądarka internetowa (Chrome, Firefox, Safari, Edge)
- Plik `raport.xlsx` z danymi z XTB

### Instalacja
1. Sklonuj repozytorium:
```bash
git clone https://github.com/[username]/XTBHelper.git
cd XTBHelper
```

2. Umieść swój plik `raport.xlsx` w głównym folderze

3. Otwórz `index.html` w przeglądarce

## 📁 Struktura projektu

```
XTBHelper/
├── index.html              # Główna strona
├── style.css              # Style i animacje
├── dashboard.js           # Główna logika i wykresy
├── open-positions.js      # Otwarte pozycje z cenami live
├── script.js             # Funkcje pomocnicze
├── pieChart.js           # Wykresy kołowe
├── raport.xlsx           # Twoje dane z XTB (dodaj własny)
└── README.md             # Ten plik
```

## 🎯 Jak używać

### 1. Przygotowanie danych
- Pobierz raport z XTB w formacie Excel
- Upewnij się, że zawiera arkusze:
  - Zamknięte pozycje
  - Otwarte pozycje  
  - Wpłaty/wypłaty

### 2. Funkcje dashboardu

#### 📊 Tabela wszystkich transakcji
- Pełna historia zamkniętych pozycji
- Sortowanie i filtrowanie
- Obliczenia zysków/strat

#### 📅 Widok miesięczny
- Filtruj transakcje według miesięcy
- Przyciskami ⬅️ ➡️ nawiguj między miesiącami
- Automatyczne obliczanie ROI

#### 📌 Otwarte pozycje
- **Ceny na żywo** - Automatyczne pobieranie z różnych API
- **Procenty** - Aktualny % zysku/straty dla każdej pozycji
- **Podsumowanie** - Łączny zysk/strata portfela
- **Odświeżanie** - Przycisk ręcznego odświeżania

#### 📈 Wykres kapitału
- **Niebieska linia** - Kapitał łączny (wpłaty + zyski)
- **Zielona linia** - Tylko zyski/straty z transakcji
- **Pomarańczowa linia** - Tylko wpłaty własne
- **Tooltips** - Szczegółowe informacje po najechaniu

## 🔧 Konfiguracja

### API dla cen na żywo
XTBHelper automatycznie próbuje różne API w kolejności:
1. **Yahoo Finance** - Dla akcji europejskich (.DE)
2. **Yahoo Proxy** - Obejście CORS
3. **Finnhub** - Darmowe API (60 req/min)
4. **Alpha Vantage** - Z kluczem demo
5. **Binance** - Dla kryptowalut
6. **Mock API** - Fallback z realistycznymi cenami

### Dodanie własnego klucza API
Jeśli chcesz używać płatnych API, edytuj `open-positions.js`:

```javascript
// Alpha Vantage z własnym kluczem
const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=TWÓJ_KLUCZ`);
```

## 🎨 Personalizacja

### Kolory i style
Edytuj `style.css` aby zmienić:
- Kolory główne (`#2563eb`, `#10b981`, `#ef4444`)
- Animacje i efekty
- Rozmiary i fonty

### Dodanie nowych funkcji
- `dashboard.js` - Główne wykresy i logika
- `open-positions.js` - Funkcje otwartych pozycji
- `pieChart.js` - Wykresy najlepszych/najgorszych spółek

## 🐛 Rozwiązywanie problemów

### Ceny nie ładują się
1. Sprawdź konsolę przeglądarki (F12)
2. Upewnij się, że masz połączenie z internetem
3. Niektóre API mogą być zablokowane przez CORS

### Błędne dane
1. Sprawdź format pliku Excel
2. Upewnij się, że kolumny mają prawidłowe nazwy
3. Sprawdź czy nie ma pustych wierszy

### Performance
- Dashboard jest zoptymalizowany dla ~1000 transakcji
- Dla większych zbiorów danych rozważ paginację

## 🤝 Współpraca

Chcesz pomóc w rozwoju? Świetnie!

1. Fork repozytorium
2. Utwórz branch dla swojej funkcji (`git checkout -b feature/nowa-funkcja`)
3. Commit zmian (`git commit -am 'Dodaj nową funkcję'`)
4. Push do brancha (`git push origin feature/nowa-funkcja`)
5. Utwórz Pull Request

## 📝 Changelog

### v1.0.0 (2024-10-02)
- ✅ Podstawowy helper z analizą transakcji
- ✅ Wykresy kapitału i performance
- ✅ Ceny na żywo dla otwartych pozycji
- ✅ Responsywny design
- ✅ Multi-API integration
- ✅ Podsumowanie portfela

## 📄 Licencja

MIT License - możesz swobodnie używać, modyfikować i dystrybuować.

## 🙏 Podziękowania

- **XTB** - Za platformę tradingową
- **Chart.js** - Za bibliotekę wykresów
- **Yahoo Finance** - Za darmowe API cenowe
- **Finnhub** - Za API finansowe

---

**⚠️ Disclaimer:** Ten helper służy wyłącznie do analizy danych. Nie stanowi porady inwestycyjnej. Inwestowanie wiąże się z ryzykiem.

**📧 Kontakt:** [Twój email lub GitHub]

---

⭐ **Jeśli projekt Ci się podoba, zostaw gwiazdkę na GitHub!** ⭐
