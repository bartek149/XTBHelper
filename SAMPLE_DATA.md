# 📊 Przykładowe dane dla XTB Dashboard

## Struktura pliku raport.xlsx

Dashboard oczekuje pliku Excel z następującymi arkuszami:

### Arkusz 1: Closed Positions (Zamknięte pozycje)
```
Symbol | Name | Type | Volume | Open price | Close price | Gross P/L | Open time | Close time
IFX.DE | Infineon | BUY | 100 | 33.50 | 35.20 | 170.00 | 2024-01-15 10:30:00 | 2024-02-01 14:20:00
SAP.DE | SAP SE | BUY | 50 | 245.00 | 250.00 | 250.00 | 2024-01-20 09:15:00 | 2024-02-05 16:45:00
```

### Arkusz 2: Open Positions (Otwarte pozycje)
```
Symbol | Type | Volume | Open price | Market price | Open time
CBK.DE | BUY | 200 | 32.40 | 32.80 | 2024-02-10 11:00:00
DTE.DE | BUY | 150 | 31.20 | 29.50 | 2024-02-15 13:30:00
```

### Arkusz 3: (Opcjonalny - inne dane)

### Arkusz 4: Deposits (Wpłaty)
```
Type | Time | Amount
deposit | 2024-01-01 | 10000
deposit | 2024-02-01 | 5000
deposit | 2024-03-01 | 3000
```

## Jak przygotować swoje dane

1. **Eksportuj dane z XTB:**
   - Zaloguj się do platformy XTB
   - Idź do sekcji "Historia"
   - Eksportuj transakcje do Excel

2. **Sprawdź format:**
   - Upewnij się, że nazwy kolumn są po angielsku
   - Daty w formacie YYYY-MM-DD HH:MM:SS
   - Liczby z kropką jako separator dziesiętny

3. **Umieść plik:**
   - Zapisz jako `raport.xlsx` w głównym folderze
   - Plik zostanie automatycznie zignorowany przez git

## Testowanie z przykładowymi danymi

Jeśli chcesz przetestować dashboard bez własnych danych:

1. Utwórz plik `raport.xlsx` z powyższą strukturą
2. Dodaj kilka przykładowych transakcji
3. Uruchom dashboard

## Bezpieczeństwo danych

⚠️ **WAŻNE:** 
- Nigdy nie commituj prawdziwych danych na GitHub
- Plik `raport.xlsx` jest w .gitignore
- Przed udostępnieniem kodu usuń wszystkie prawdziwe dane

## Rozwiązywanie problemów

### "Nie można znaleźć raport.xlsx"
- Upewnij się, że plik jest w głównym folderze
- Sprawdź czy nazwa jest dokładnie `raport.xlsx`

### "Brak danych do wyświetlenia"
- Sprawdź czy arkusze mają prawidłowe nazwy
- Upewnij się, że kolumny mają angielskie nazwy
- Sprawdź format dat i liczb

### Błędne obliczenia
- Sprawdź czy kolumna "Type" zawiera "BUY" lub "SELL"
- Upewnij się, że ceny są liczbami, nie tekstem
- Sprawdź czy nie ma pustych wierszy w środku danych
