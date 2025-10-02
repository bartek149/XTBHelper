# 🚀 Instrukcje publikacji na GitHub

## Krok 1: Przygotowanie repozytorium

### Utwórz nowe repozytorium na GitHub
1. Idź na [github.com](https://github.com)
2. Kliknij **"New repository"**
3. Nazwa: `XTBHelper`
4. Opis: `🛠️ Praktyczne narzędzie pomocnicze do analizy transakcji XTB z cenami na żywo`
5. Ustaw jako **Public** (lub Private jeśli wolisz)
6. ✅ **NIE** zaznaczaj "Add a README file" (już mamy)
7. Kliknij **"Create repository"**

## Krok 2: Inicjalizacja Git w projekcie

Otwórz terminal/PowerShell w folderze projektu i wykonaj:

```bash
# Inicjalizuj git
git init

# Dodaj wszystkie pliki
git add .

# Pierwszy commit
git commit -m "🛠️ Initial commit: XTBHelper - narzędzie do analizy XTB"

# Dodaj remote (zamień [username] na swoją nazwę użytkownika)
git remote add origin https://github.com/[username]/XTBHelper.git

# Ustaw główną gałąź
git branch -M main

# Wypchnij na GitHub
git push -u origin main
```

## Krok 3: Weryfikacja

Po wykonaniu powyższych kroków:
1. Odśwież stronę repozytorium na GitHub
2. Powinieneś zobaczyć wszystkie pliki
3. README.md będzie automatycznie wyświetlany

## Krok 4: Dodanie przykładowych screenshotów (opcjonalne)

Aby projekt wyglądał profesjonalnie:

1. Utwórz folder `screenshots/`
2. Dodaj zrzuty ekranu dashboardu
3. Zaktualizuj README.md dodając:

```markdown
## 📸 Zrzuty ekranu

![Dashboard Overview](screenshots/dashboard-overview.png)
![Live Positions](screenshots/live-positions.png)
![Capital Chart](screenshots/capital-chart.png)
```

## Krok 5: Konfiguracja GitHub Pages (opcjonalne)

Aby udostępnić dashboard online:

1. W repozytorium idź do **Settings**
2. Scroll do sekcji **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** / **/ (root)**
5. Kliknij **Save**

⚠️ **UWAGA:** Nie publikuj pliku `raport.xlsx` - zawiera Twoje dane osobiste!

## Krok 6: Aktualizacje w przyszłości

Gdy wprowadzisz zmiany:

```bash
# Dodaj zmiany
git add .

# Commit z opisem
git commit -m "✨ Add new feature: portfolio summary"

# Wypchnij na GitHub
git push
```

## 🔒 Bezpieczeństwo

### Pliki które NIE powinny trafić na GitHub:
- ✅ `raport.xlsx` - już w .gitignore
- ✅ Pliki z kluczami API
- ✅ Dane osobiste

### Pliki które POWINNY być na GitHub:
- ✅ Kod źródłowy (.js, .css, .html)
- ✅ README.md
- ✅ .gitignore
- ✅ Dokumentacja

## 🏷️ Tagowanie wersji

Gdy chcesz oznaczyć stabilną wersję:

```bash
# Utwórz tag
git tag -a v1.0.0 -m "🎉 First stable release"

# Wypchnij tag
git push origin v1.0.0
```

## 🌟 Promowanie projektu

### Dodaj tematy (topics) do repozytorium:
- `trading`
- `dashboard` 
- `xtb`
- `finance`
- `javascript`
- `charts`
- `portfolio-analysis`

### Utwórz dobry opis:
```
🛠️ Praktyczne narzędzie pomocnicze do analizy transakcji XTB z cenami na żywo, analizą portfela i interaktywnymi wykresami. Vanilla JavaScript + Chart.js.
```

## 🤝 Współpraca

Jeśli chcesz aby inni mogli współtworzyć:

1. **Settings** → **Manage access**
2. **Invite a collaborator**
3. Lub zostaw jako public i przyjmuj Pull Requests

## 📊 GitHub Insights

Po publikacji będziesz mógł śledzić:
- Liczbę gwiazdek ⭐
- Forki 🍴
- Klony i pobrania
- Ruch na stronie

---

**🎉 Gratulacje! Twój projekt jest teraz na GitHub!**

Pamiętaj o regularnych commitach i opisowych wiadomościach commit-ów. To pomoże innym (i Tobie w przyszłości) zrozumieć historię zmian.
