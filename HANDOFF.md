# HANDOFF — Strona ślubna (Paulina & Bartek)

> **Cel dokumentu:** Ten plik opisuje stronę na tyle dokładnie, żeby w nowej konwersacji
> odtworzyć jej działanie **1:1** — z innym motywem kolorystycznym i innymi treściami
> (inna para, data, miejsca, menu itd.), bez oglądania oryginalnego kodu.
>
> **Jak używać:** Sekcje 6–7 (design/typografia) i 8 (treści) to jedyne miejsca, które
> zmieniasz przy personalizacji. Reszta (logika, API, deploy) pozostaje identyczna.
>
> 🔴 **UWAGA — sekrety w tym pliku (sekcja 14):** Sekcja 14 zawiera **rzeczywiste wartości .env
> z tego (starego) projektu** jako konkretny wzorzec konfiguracji. To są ŻYWE dane dostępowe
> (baza, SMTP, Cloudinary). W nowym projekcie **wygeneruj własne, nowe** i **nie commituj** tego
> pliku do publicznego repo bez usunięcia sekcji 14 (albo dodaj `HANDOFF.md` do `.gitignore`).
> Traktuj wartości z sekcji 14 jak hasła — najlepiej po skopiowaniu zrotować je w starym projekcie.

---

## 1. Czym jest ta strona

Jednostronicowe (SPA) **zaproszenie ślubne** dla gości, chronione hasłem. Zawiera:

- Ekran logowania hasłem (miękka bramka — "prywatne zaproszenie").
- Stronę główną (long-scroll) z sekcjami: Hero, odliczanie, powitanie, agenda, menu,
  mapy dojazdu, formularz RSVP, informacja o prezentach, kontakt, lista życzeń muzycznych
  (głosowanie), stopka.
- Podstronę `/galeria` — "photo booth": goście wgrywają zdjęcia (Cloudinary), wspólna galeria.
- Backend, który: wysyła maila do pary po RSVP, przechowuje piosenki + głosy + zdjęcia w MariaDB/MySQL.

Język UI: **polski**. Domena produkcyjna: **slubpaulinabartek.pl**.

---

## 2. Stack technologiczny

**Frontend**
- React 18.3 + Vite 5.4 (`type: module`, JSX, brak TypeScript)
- react-router-dom 7 (routing SPA)
- Tailwind CSS 3.4 + `@tailwindcss/forms` + PostCSS + autoprefixer
- framer-motion 11 (animacje)
- Fonty z Google Fonts (Playfair Display, Montserrat, Lato) importowane w CSS

**Backend**
- Node.js 22 (ESM, `type: module`) + Express 4
- mysql2/promise (pula połączeń) → MariaDB/MySQL
- nodemailer (SMTP) — maile RSVP
- cors, dotenv
- nodemon (dev)

**Infra / deploy**
- Docker (multi-stage frontend przez nginx; backend node)
- docker-compose (dev + prod)
- Traefik jako reverse proxy + TLS (Let's Encrypt) w prod
- GitHub Actions → build & push obrazów do Docker Hub → deploy po SSH na VPS
- Cloudinary (hosting zdjęć z galerii — unsigned upload)
- Zewnętrzna baza MySQL (seohost.pl)

---

## 3. Struktura katalogów (bez node_modules)

```
slubpaulinabartek/
├─ .github/workflows/publish.yml      # CI/CD
├─ docker-compose-developement.yml    # dev (build lokalny)
├─ docker-compose-prod.yml            # prod (obrazy z Docker Hub + Traefik)
├─ backend/
│  ├─ server.js                       # WŁAŚCIWY serwer (Express, API, DB, mail)
│  ├─ index.js                        # LEGACY/nieużywany (mini serwer na porcie 5000)
│  ├─ Dockerfile
│  ├─ package.json
│  └─ .env                            # (gitignored) sekrety backendu
└─ frontend/
   ├─ index.html                      # entry HTML (lang=pl, favicony, manifest)
   ├─ vite.config.js                  # proxy /api → localhost:3001
   ├─ tailwind.config.js              # ★ MOTYW: kolory, fonty, cienie, animacje
   ├─ postcss.config.js
   ├─ eslint.config.js
   ├─ nginx.conf / nginx.main.conf    # konfiguracja nginx w obrazie prod
   ├─ Dockerfile                       # multi-stage (build → nginx)
   ├─ .env                            # (gitignored) VITE_* zmienne
   ├─ public/                         # favicony, webmanifest, PWA ikony
   └─ src/
      ├─ main.jsx                     # bootstrap React (StrictMode)
      ├─ App.jsx                      # ★ routing + bramka auth + przycisk "do góry"
      ├─ index.css                    # ★ import fontów, @tailwind, globalne style, scrollbar
      ├─ App.css                      # pusty (placeholder)
      ├─ assets/couple.jpg            # zdjęcie Hero (couple), test.jpg nieużywane
      ├─ utils/emailGenerator.js      # wrapper fetch → POST /api/rsvp
      └─ components/
         ├─ PasswordProtection.jsx    # ekran hasła
         ├─ Hero.jsx                  # sekcja powitalna (full-screen, zdjęcie)
         ├─ Countdown.jsx             # licznik do daty ślubu
         ├─ Welcome.jsx               # "Drodzy goście!"
         ├─ Agenda.jsx                # przebieg dnia (10 kafelków)
         ├─ Info.jsx                  # menu / potrawy (5 kafelków)
         ├─ Map.jsx                   # 2 mapy Google (ceremonia + wesele)
         ├─ RSVP.jsx                  # ★ formularz potwierdzenia obecności (2 kroki)
         ├─ Gifts.jsx                 # informacja o prezentach
         ├─ Contact.jsx              # telefony do pary
         ├─ Songs.jsx                 # ★ lista życzeń muzycznych + głosowanie + admin delete
         ├─ Footer.jsx                # stopka + nawigacja
         └─ page/PhotoBooth.jsx       # ★ podstrona /galeria (upload do Cloudinary)
```

`★` = pliki, które faktycznie zmieniasz przy personalizacji (motyw/treść/logika kluczowa).

---

## 4. Architektura wysokopoziomowa

```
Przeglądarka
   │
   │  https://slubpaulinabartek.pl
   ▼
Traefik (reverse proxy, TLS, redirect www→bez-www)
   ├── Host=slubpaulinabartek.pl, PathPrefix=/api   → backend:3001  (Express)
   │                                                     ├─ nodemailer → SMTP
   │                                                     └─ mysql2 → MariaDB (zewn. host)
   └── Host=slubpaulinabartek.pl (reszta)            → frontend:3000 (nginx + statyczny build React)
                                                          │
   Frontend woła bezpośrednio (z przeglądarki):           └─ Cloudinary API (upload zdjęć, unsigned)
```

- **Dev lokalnie:** Vite dev server na `:5173`, proxy `/api` → `http://localhost:3001` (backend).
- **Prod:** nginx serwuje statyczny build na porcie 3000; wszystkie żądania `/api/*` łapie Traefik
  i kieruje do backendu (nginx **nie** proxuje API — routing robi Traefik po ścieżce).
- Zdjęcia lecą **z przeglądarki wprost do Cloudinary** (nie przez backend); backend zapisuje tylko URL.

---

## 5. Routing i przepływ uwierzytelniania (KLUCZOWE)

Plik: [frontend/src/App.jsx](frontend/src/App.jsx), [frontend/src/components/PasswordProtection.jsx](frontend/src/components/PasswordProtection.jsx)

### Trasy (react-router-dom, `BrowserRouter`)
| Ścieżka | Gdy zalogowany | Gdy niezalogowany |
|---|---|---|
| `/` | Strona główna (wszystkie sekcje) | `<PasswordProtection>` |
| `/galeria` | `<PhotoBooth>` | `<PasswordProtection>` |
| `*` (dowolna inna) | `<Navigate to="/">` (redirect na główną) | — |

### Stan uwierzytelnienia
- Trzymany w `App` jako `isAuthenticated`, inicjalizowany z:
  `sessionStorage.getItem('weddingAuth') === 'authenticated'`.
- **sessionStorage** → auth znika po zamknięciu karty (nie localStorage).
- Sukces logowania: `PasswordProtection` ustawia `sessionStorage.weddingAuth='authenticated'`
  i woła `onSuccess()` → `App.setIsAuthenticated(true)`.

### Logika `PasswordProtection`
- Poprawne hasło: `import.meta.env.VITE_PASSWORD` (wstrzykiwane w build-time przez Vite).
  **Uwaga:** to hasło ląduje w bundlu JS → jest widoczne w źródle. To bramka "miękka".
- Trzy drogi wejścia:
  1. **Aktywna sesja** — jeśli `weddingAuth==='authenticated'`, auto-login przy montowaniu.
  2. **Hasło w URL** — `?pwd=<hasło>`; jeśli zgadza się z `VITE_PASSWORD`, ustawia sesję,
     **czyści query string** z paska adresu (`history.replaceState`) i loguje.
     (To pozwala rozsyłać gościom link typu `.../galeria?pwd=22082026`.)
  3. **Ręczne wpisanie** hasła w formularzu (submit z 300 ms sztucznym „loading”).
- Błędne hasło: komunikat „Hasło nieprawidłowe” + animacja „shake” (framer-motion), czyszczenie pola.
- „Zabezpieczenie” anty-devtools: `keydown` blokujący `F12` oraz `Ctrl+Shift+I`
  (kosmetyczne, łatwe do obejścia — nie traktować jako realnej ochrony).

### Wygląd ekranu logowania
- Fullscreen `fixed inset-0`, gradient tła `from-primary-bg via-primary-bg to-accent-green/10`.
- Biała karta `bg-white/95 rounded-2xl shadow-elegant`, animacje wejścia (opacity/scale/y).
- Tytuł = imiona pary (`text-3xl font-serif`), podtytuł „Wpisz hasło, aby wejść”.
- Pole `type=password`, przycisk „Wejdź” (spinner „Sprawdzanie...” podczas loading).
- Stopka karty: „Prywatne zaproszenie na ślub”.

---

## 6. ★ SYSTEM DESIGNU / MOTYW KOLORYSTYCZNY (zmieniasz tutaj)

Definicja: [frontend/tailwind.config.js](frontend/tailwind.config.js) + [frontend/src/index.css](frontend/src/index.css).

### 6.1 Paleta (obecna — zielono-złota, elegancka)
Zdefiniowana w `tailwind.config.js → theme.extend.colors`:

| Token Tailwind | HEX | Rola / gdzie używany |
|---|---|---|
| `primary-bg`   | `#F3F0E7` | Główne tło strony (kremowy beż) |
| `accent-green` | `#3A4B40` | Kolor wiodący: przyciski, akcenty, tło Agendy, Footer |
| `info-green`   | `#253B2D` | Ciemniejsza zieleń — tło sekcji Menu (Info) |
| `accent-gold`  | `#C5A059` | Złoty akcent: kreski pod nagłówkami, ceny, scrollbar, zaznaczenie |
| `text-main`    | `#3A4B40` | Główny kolor tekstu (= accent-green) |
| `light-gray`   | `#EFEAE3` | (zdefiniowany, marginalnie używany) |
| `cream`        | `#FBF9F4` | (zdefiniowany, marginalnie używany) |

Dodatkowo używane wprost (poza tokenami): biel `white` (z opacity np. `bg-white/20`, `/30`, `/90`),
`black/40` (przyciemnienie zdjęcia Hero), `red-500`/`red-300` (błędy walidacji, przycisk „Usuń”).

**Duplikaty do zsynchronizowania przy zmianie motywu** (te same wartości występują też jako
surowe HEX-y, nie tokeny):
- [index.css](frontend/src/index.css): `body { background-color:#f3f0e7; color:#3a4b40 }`,
  scrollbar (`#f3f0e7`, `#c5a059`, `#3a4b40`), `::selection { #c5a059 }`,
  `.gradient-text` gradient `#3a4b40 → #c5a059`.
- Zmieniając paletę, **zmień oba miejsca** (tailwind.config.js ORAZ index.css).

### 6.2 Jak zmienić motyw (przepis)
1. Wybierz 4 role kolorów: `primary-bg` (tło), `accent` główny, `accent` ciemny (sekcje), `accent` ozdobny (złoto→np. róż/srebro).
2. Podmień 7 wartości w `tailwind.config.js`.
3. Podmień te same HEX-y w `index.css` (body, scrollbar, selection, gradient-text).
4. Zaktualizuj `theme_color`/`background_color` w [public/site.webmanifest](frontend/public/site.webmanifest) (obecnie `#ffffff`).
5. Zdjęcie Hero (`src/assets/couple.jpg`) i favicony w `public/` — podmień pliki.

### 6.3 Cienie (boxShadow)
- `soft`: `0 10px 30px rgba(58,75,64,0.08)`
- `softer`: `0 4px 15px rgba(58,75,64,0.06)`
- `elegant`: `0 15px 40px rgba(58,75,64,0.12)`
- (rgba bazuje na accent-green `#3A4B40` = `58,75,64` — przy zmianie motywu można dostosować.)

### 6.4 Inne rozszerzenia motywu
- `spacing`: `18 → 4.5rem`, `22 → 5.5rem`.
- `borderRadius`: `xl:16px`, `2xl:24px`, `3xl:32px`.
- `fontSize`: nadpisane skokowo od `xs` (12/16) do `6xl` (60/64) — pary [rozmiar, line-height].
- `animation`: `float` (6s, unosi się ±20px), `fade-in` (1s). `keyframes`: `float`, `fadeIn`.
- Globalne przejścia w `index.css`: `button,a,input,textarea,select { transition: all .3s ease }`.
- `html { scroll-behavior: smooth }` (płynne kotwice `#hero`, `#rsvp`, `#map`).

### 6.5 Reużywalne klasy komponentowe (index.css `@layer components`)
- `.btn-primary` — pełny zielony pill button.
- `.btn-secondary` — obramowany, wypełnia się na hover.
- `.card-hover` — hover:shadow-elegant.
- `.gradient-text` — tekst z gradientem green→gold (webkit background-clip).
  (W praktyce sekcje częściej używają inline Tailwind niż tych klas — ale są dostępne.)

---

## 7. Typografia

Import w [index.css](frontend/src/index.css) linia 1 (Google Fonts):
`Playfair Display` (700,800,900) + `Montserrat` (400–700) + `Lato` (300,400,700).

Rodziny w `tailwind.config.js`:
- `font-serif` → **Playfair Display** — wszystkie nagłówki, imiona pary, „ozdobny” tekst.
- `font-sans` → **Montserrat** — tekst podstawowy (domyślny `body`).
- `font-lato` → **Lato** — zdefiniowany, rzadko używany.

`body`: Montserrat, `line-height:1.6`, antialiasing on. Nagłówki sekcji zwykle
`text-4xl md:text-5xl font-serif` + złota kreska `w-16 h-1 bg-accent-gold` pod spodem.

---

## 8. ★ TREŚCI DO PERSONALIZACJI (wszystkie hardcoded dane w jednym miejscu)

Wszystko poniżej jest zaszyte w kodzie (brak CMS). Podmień przy nowej parze.

### 8.1 Tożsamość / meta
- **Imiona pary:** „Paulina & Bartek” — w: Hero.jsx, Footer.jsx, PasswordProtection.jsx.
- **Tytuł strony (`<title>`):** „Paulina & Bartek Ślub 2026” — [index.html](frontend/index.html).
- `<html lang="pl">`.
- Manifest: `name:"MyWebSite"`, `short_name:"MySite"` — [site.webmanifest](frontend/public/site.webmanifest) (warto zaktualizować).

### 8.2 Data i godzina ślubu
- **Wyświetlana data (Hero):** „22 Sierpnia 2026”, podpis „Sobota” — [Hero.jsx](frontend/src/components/Hero.jsx).
- **Data licznika (Countdown):** `new Date('2026-08-22T15:00:00')` — [Countdown.jsx:25](frontend/src/components/Countdown.jsx#L25).
- Hasło strony pochodzi od daty (patrz sekcja 14) — spójne z 22.08.2026.

### 8.3 Hero
- Nagłówek: „Paulina & Bartek”
- Podtytuł: „Zapraszamy do udziału w naszym wielkim dniu”
- Data + „Sobota”
- CTA: „Potwierdź Przybycie” → kotwica `#rsvp`
- Tło: `couple.jpg` z nakładką `bg-black/40`. (Flaga `hasPhoto=true`; jest fallback-gradient gdy false.)

### 8.4 Welcome (sekcja „Drodzy goście!”)
Tekst: „Tu znajdziecie najważniejsze informacje odnośnie ślubu — daty, lokalizacje, mapki,
a także potwierdzicie swoją obecność… Już nie możemy doczekać się spotkania z Wami!”

### 8.5 Agenda (przebieg dnia) — [Agenda.jsx](frontend/src/components/Agenda.jsx)
Tablica `infoCards` (id, title, time), tło `bg-accent-green`, nagłówek „Przebieg”, grid 5-kolumnowy:
| # | Wydarzenie | Godz. |
|---|---|---|
|1|Ceremonia Ślubna|15:00|
|2|Powitanie Gości na Sali i Rozpoczęcie Przyjęcia|17:00|
|3|Życzenia dla Pary Młodej|17:15|
|4|Uroczysty Obiad Weselny|17:45|
|5|Pierwszy Taniec|18:40|
|6|Kolacja Wieczorna|20:30|
|7|Tort Weselny|22:00|
|8|Kolacja Nocna|23:00|
|9|Oczepiny|00:00|
|10|Poczęstunek Nocny|00:30|

### 8.6 Info / Menu (potrawy) — [Info.jsx](frontend/src/components/Info.jsx)
Tło `bg-info-green`, nagłówek „Potrawy”, grid 2-kolumnowy, tablica `infoCards` (title, description):
1. Obiad Weselny — „Rosół z kury z makaronem”
2. Obiad Weselny — „Filet z kurczaka faszerowany szpinakiem i serem mozzarella, sos pieprzowy, gratin ziemniaczany i zestaw surówek”
3. Kolacja Wieczorna — „Karczek w sosie myśliwskim, kluski śląskie i surówka z kiszonego ogórka”
4. Kolacja Nocna — „Strogonof wołowy ze świeżo wypiekaną bagietką”
5. Poczęstunek Nocny — „Żurek”

### 8.7 Mapy (Map.jsx) — [Map.jsx](frontend/src/components/Map.jsx)
Tablica `locations` (2 wpisy). Każdy: `title, name, address, time, embedSrc (Google Maps iframe),
mapsUrl (link „Pokaż na mapie”), iframeTitle, animateX`.
1. **Ceremonia Ślubna** — „Kościół na Świętym Krzyżu”, ul. Klasztorna 1, 26-016 Nowa Słupia, „Ceremonia 15:00”.
2. **Przyjęcie Weselne** — „Hotel Echo”, ul. Główna 12, 26-060 Cedzyna, „Przyjęcie 17:00”.
> Przy zmianie: wygeneruj nowe `embedSrc` z Google Maps (Udostępnij → Umieść mapę → skopiuj `src` iframe)
> i `mapsUrl` (link „search?api=1&query=...”).

### 8.8 RSVP — [RSVP.jsx](frontend/src/components/RSVP.jsx)
- Nagłówek „RSVP”, podtytuł „Potwierdź swoją obecność do 18 lipca”.
- Sukces (krok 2) pokazuje adres kontaktowy: tekst „bartek011229@gmail.com”
  (uwaga: `href` mailto to `kontakt@naszslub.pl` — patrz bug w sekcji 16).

### 8.9 Gifts — [Gifts.jsx](frontend/src/components/Gifts.jsx)
Nagłówek „Prezenty”, tekst: „Będzie nam bardzo miło, jeśli zamiast kwiatów obdarujecie nas
pomocną cegiełką na naszą wspólną przyszłość.”

### 8.10 Contact — [Contact.jsx](frontend/src/components/Contact.jsx)
Tablica `couples`:
- Paulina — `+48 607 597 506`
- Bartek — `+48 786 165 293`
Numery klikalne (`tel:` po usunięciu spacji).

### 8.11 Footer — [Footer.jsx](frontend/src/components/Footer.jsx)
- Linki nawigacji: „STRONA GŁÓWNA” (#hero), „POTWIERDZENIE PRZYBYCIA” (#rsvp), „LOKALIZACJA” (#map).
- Nagłówek „Paulina & Bartek” + tekst „Zapraszamy Cię do udziału… Twoja obecność oznacza dla nas całe szczęście.”
- „Made with ❤️ for our special day”, „© {rok} Paulina & Bartek. All rights reserved.”
- Link „Powrót do góry ↑”.

### 8.12 Songs / PhotoBooth
- Songs: nagłówek „Lista życzeń muzycznych”, podtytuł „Zaproponuj utwór i zagłosuj…”. Dane
  (piosenki) są dynamiczne z bazy — brak treści do podmiany poza etykietami.
- PhotoBooth: nagłówek „Galeria Weselna”, podtytuł „Uwiecznijmy te chwile razem!”.
- Baner na stronie głównej (w App.jsx między Welcome a Agenda): „Podziel się z nami swoimi
  chwilami!” + przycisk „Otwórz Galerię Zdjęć” → `/galeria`.

---

## 9. Opis komponentów frontendu (zachowanie + wygląd)

Wspólne cechy: framer-motion `whileInView` z `viewport={{once:true}}` (animacja przy scrollu, raz).
Sekcje mają `id` do kotwic. Layout responsywny Tailwind (`md:`, `lg:`).

- **App.jsx** — Router; renderuje bramkę auth albo pełną stronę; globalnie `min-h-screen bg-primary-bg
  text-text-main overflow-x-hidden`; komponent `ScrollToTopButton` (fixed, prawy-dół, pojawia się po
  scrollu >300px, płynny scroll do góry, ikona strzałki, `bg-accent-green rounded-full z-50`).
- **Hero** — full-screen `h-screen`, zdjęcie `object-cover` + `bg-black/40`, wyśrodkowana treść,
  animacje stagger (container/item variants).
- **Countdown** — licznik dni/godzin/minut/sekund do daty ślubu; `setInterval` co 1s; komponent
  pomocniczy `TimeUnit` (padStart do 2 cyfr). Pasek `bg-primary-bg` z dolnym borderem.
- **Welcome** — prosty blok tekstowy, wyśrodkowany.
- **Agenda** — tło `accent-green`; 10 kafelków `bg-white/20 backdrop-blur rounded-xl`; grid `md:grid-cols-5`;
  animacja kaskadowa (`custom={i}`, delay i*0.2). Godzina w kolorze `accent-gold`.
- **Info (Menu)** — tło `info-green`; 5 kafelków; grid `md:grid-cols-2`; tytuł kafelka `accent-gold`.
- **Map** — 2 kolumny (`lg:grid-cols-2`); iframe Google Maps (lazy) + karta z adresem i przyciskiem
  „Pokaż na mapie” (otwiera `mapsUrl` w nowej karcie). Border-left `accent-green`.
- **RSVP** — patrz sekcja 11 (przepływ). Formularz 2-krokowy z `AnimatePresence`.
- **Gifts / Contact / Footer** — statyczne bloki opisane w sekcji 8.
- **Songs** — patrz sekcja 12.
- **PhotoBooth** — patrz sekcja 13.

---

## 10. ★ RSVP — przepływ (frontend + backend)

**Frontend:** [RSVP.jsx](frontend/src/components/RSVP.jsx) + [utils/emailGenerator.js](frontend/src/utils/emailGenerator.js)

Krok 1 (formularz):
- Pola: `firstName`, `lastName` (oba wymagane), `attending` (radio: `yes`/`no`, wymagane).
- Licznik „osób towarzyszących” (+/−): dynamicznie dodaje pary pól Imię/Nazwisko (`companions[]`).
- Walidacja klienta (`validateForm`): imię, nazwisko, wybór obecności. Komunikaty po polsku.
- Submit → `sendEmails({ guestName:"Imię Nazwisko", attending, companionCount, companions })`.
  - `emailGenerator` buduje payload: `{ name, email(undef), attending, guests: companionCount+1,
    companions, dietary(undef) }` i robi `POST /api/rsvp`.
  - Jeśli odpowiedź nie OK → rzuca `Error(data.error)` → formularz pokazuje `errors.submit`.
- Sukces → `setStep(2)`.

Krok 2 (sukces): „Dziękujemy!” + „Możesz zmienić odpowiedź pisząc do nas na …”.

**Backend:** `POST /api/rsvp` (server.js):
- Walidacja: `name` wymagane, `attending` wymagane, jeśli `guests>0` to `companions` wymagane.
- Buduje HTML listy towarzyszy.
- **Wysyła mail** przez nodemailer: from „Wedding RSVP <SMTP_USER>”, to `COUPLE_EMAIL||SMTP_USER`,
  subject „RSVP od {name}”, body: imię, obecność (Tak/Nie), łączna liczba osób, lista towarzyszy.
- Następnie próbuje `INSERT` do tabeli `rsvps` — **UWAGA: ten INSERT jest zabugowany** (sekcja 16),
  co powoduje że mimo wysłanego maila użytkownik może dostać błąd 500. Mail jednak dociera.
- Odpowiedź OK: `{ success:true, message:"RSVP zostało wysłane pomyślnie!" }`.

---

## 11. ★ Songs — lista życzeń muzycznych (głosowanie + admin)

**Frontend:** [Songs.jsx](frontend/src/components/Songs.jsx). `API_URL='/api/songs'`.

- Na starcie równolegle: `GET /api/songs` (lista, sort po głosach) + `GET /api/songs/voted`
  (id piosenek, na które to urządzenie już głosowało).
- **Dodawanie utworu:** formularz (tytuł*, wykonawca*, link) → `POST /api/songs`.
- **Głosowanie (upvote):** `POST /api/songs/:id/upvote`; jeśli 409 → oznacza, że już głosowano
  (aktualizuje lokalny `upvotedIds` + `sessionStorage.upvotedSongs`). Optymistyczny re-sort po głosach.
- **Usuwanie (admin):** ikona kosza → pole hasła → `DELETE /api/songs/:id` z `{ password }`.
  Backend akceptuje tylko gdy hasło == `ADMIN_PASSWORD` (patrz sekcja 14/16 — pułapka z nazwą zmiennej).

**Backend endpoints (server.js):**
| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/api/songs` | Lista, `ORDER BY votes DESC, created_at ASC` |
| POST | `/api/songs` | Dodaj (title, artist wymagane; link opcjonalny) |
| POST | `/api/songs/:id/upvote` | +1 głos; dedup po (song_id, ip, user_agent[:100]); 409 gdy już głosowano; 404 gdy brak utworu |
| GET | `/api/songs/voted` | Zwraca `song_id[]` dla danego (ip, user_agent[:100]) |
| DELETE | `/api/songs/:id` | Admin (hasło w body); 401 bez uprawnień |

Dedup głosów: para **IP + User-Agent(100 znaków)**. IP z `x-forwarded-for` (pierwszy) lub `socket.remoteAddress`.
Unikalny klucz w DB: `unique_vote (song_id, ip, user_agent(100))`.

---

## 12. ★ PhotoBooth / Galeria (Cloudinary)

**Frontend:** [page/PhotoBooth.jsx](frontend/src/components/page/PhotoBooth.jsx). `API_URL='/api/photos'`.
Zmienne: `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`.

Przepływ uploadu:
1. Dwa inputy `type=file`: „Zrób zdjęcie” (`capture='environment'` — aparat na mobile) i „Z biblioteki”.
2. `handleUpload`: `FormData(file, upload_preset)` → `POST https://api.cloudinary.com/v1_1/{cloud}/image/upload`
   (**unsigned upload** — bez podpisu; preset musi być ustawiony jako *unsigned* w Cloudinary).
3. Po sukcesie (`secure_url`): `POST /api/photos { url, public_id }` → zapis w DB.
4. `fetchPhotos()` odświeża galerię.

Wyświetlanie:
- Siatka `grid-cols-2 md:grid-cols-3`, kafle `aspect-[3/4]`.
- Miniatury: URL Cloudinary z transformacją wstrzykniętą przez `.replace('/upload/', '/upload/w_400,h_533,c_fill,g_auto,q_auto:eco,f_auto/')`.
- Lightbox (klik): pełny ekran `z-[100] bg-black/95`, obraz z transformacją `q_auto,f_auto`,
  zamykanie klikiem/Esc, blokada scrolla body.
- Placeholder skeleton (pulsujący) do czasu `onLoad`.
- Nawigacja: przycisk „Wróć do strony głównej” → `navigate('/')`.

**Backend:**
| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/api/photos` | Lista zdjęć, `ORDER BY created_at DESC` |
| POST | `/api/photos` | Zapis `{ url, public_id }` |

---

## 13. Baza danych (schema)

MariaDB/MySQL. Tabele tworzone automatycznie w `initDB()` przy starcie backendu (`CREATE TABLE IF NOT EXISTS`).

```sql
-- songs
id INT AUTO_INCREMENT PK
title VARCHAR(255) NOT NULL
artist VARCHAR(255) NOT NULL
link VARCHAR(255)
votes INT DEFAULT 0
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

-- upvotes (dedup głosów)
id INT AUTO_INCREMENT PK
song_id INT NOT NULL
ip VARCHAR(45) NOT NULL
user_agent VARCHAR(500) NOT NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
UNIQUE KEY unique_vote (song_id, ip, user_agent(100))

-- rsvps
id INT AUTO_INCREMENT PK
name VARCHAR(255) NOT NULL
attending ENUM('yes','no') NOT NULL
guests INT DEFAULT 0
companions JSON
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- ⚠️ BRAK kolumn ip / user_agent, mimo że INSERT w /api/rsvp próbuje je zapisać (bug, sekcja 16)

-- photos
id INT AUTO_INCREMENT PK
url VARCHAR(500) NOT NULL
public_id VARCHAR(255)
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

Połączenie: `mysql.createPool(process.env.DB_URL)` (connection string).

---

## 14. 🔴 Zmienne środowiskowe (RZECZYWISTE wartości ze starego projektu = wzorzec)

> **To są żywe sekrety.** W nowym projekcie wygeneruj własne (nowa baza, nowy SMTP, nowe konto
> Cloudinary, nowe hasła). Wartości poniżej pokazują dokładny FORMAT każdej zmiennej.

### Backend — plik `backend/.env`
Dosłowna zawartość (skopiuj strukturę, podmień wartości):

```dotenv
PORT=3001
FRONTEND_URL=https://slubpaulinabartek.pl

SMTP_HOST=mail.photodrive.dev
SMTP_PORT=587
SMTP_USER=noreply@photodrive.dev
SMTP_PASS=6gFRyFrkwmqSxW9ewv7k

SONGS_ADMIN_PASSWORD=22082026admin

COUPLE_EMAIL=bartek011229@gmail.com
COUPLE_NAMES=Paulina & Bartek

DB_URL=mysql://srv95452_slubpaulinabartek:V7ZzqFRDJJpGmKEW7nAs@h65.seohost.pl:3306/srv95452_slubpaulinabartek

CLOUDINARY_CLOUD_NAME=duvtdsdmp
CLOUDINARY_API_KEY=835829776786813
CLOUDINARY_API_SECRET=MaNGf8b_CsIML5jURCUCNE-JGk4
```

Znaczenie / uwagi:
| Zmienna | Rola | Uwaga |
|---|---|---|
| `PORT` | port backendu | `3001` |
| `FRONTEND_URL` | origin dozwolony w CORS | prod: domena; dev: `http://localhost:5173` |
| `SMTP_HOST/PORT/USER/PASS` | konto SMTP do wysyłki maili RSVP | port 587, `secure:false` (STARTTLS) |
| `SONGS_ADMIN_PASSWORD` | zamierzone hasło admina piosenek | ⚠️ **kod tego NIE czyta** — patrz bug #2 sekcja 16 |
| `COUPLE_EMAIL` | odbiorca maili RSVP | |
| `COUPLE_NAMES` | nazwa pary | zdefiniowana, w kodzie prawie nieużywana |
| `DB_URL` | connection string MySQL | `mysql://user:pass@host:3306/dbname` |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | obecne w .env, ale **backend ich nie używa** | upload robi klient (unsigned) |

### Frontend — plik `frontend/.env` (wstrzykiwane w BUILD-time przez Vite)
Dosłowna zawartość:

```dotenv
# Hasło do strony (wymagane przez PasswordProtection)
VITE_PASSWORD=22082026
VITE_CLOUDINARY_CLOUD_NAME=duvtdsdmp
VITE_CLOUDINARY_UPLOAD_PRESET=wedding_preset

# Link zapraszający z hasłem:
# https://slubpaulinabartek.pl/galeria?pwd=22082026
```

| Zmienna | Rola |
|---|---|
| `VITE_PASSWORD` | hasło wejścia (❗wchodzi do bundla JS — bramka miękka, widoczne w źródle) |
| `VITE_CLOUDINARY_CLOUD_NAME` | nazwa chmury Cloudinary |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | **unsigned** upload preset (utwórz w Cloudinary: Settings → Upload → Add upload preset → Signing Mode: Unsigned) |

**Schemat haseł (obecnie):** hasło wejścia = data ślubu `DDMMYYYY` (22.08.2026 → `22082026`);
zamierzone hasło admina = to samo + „admin” (`22082026admin`). Link z hasłem:
`https://<domena>/galeria?pwd=<VITE_PASSWORD>`.
> W nowym projekcie: ustaw `VITE_PASSWORD` na datę nowego ślubu (lub cokolwiek). Pamiętaj, że
> jest widoczne w bundlu — to nie jest realna ochrona, tylko „prywatne zaproszenie”.

### Zakładanie usług zewnętrznych w nowym projekcie
1. **Baza MySQL/MariaDB** — dowolny hosting (tu: seohost.pl). Utwórz bazę + usera, wklej `DB_URL`.
   Tabele tworzą się same przy pierwszym starcie backendu (`initDB`).
2. **SMTP** — konto pocztowe/relay (tu: własny mail na photodrive.dev). Wpisz host/port/user/pass.
3. **Cloudinary** — załóż konto → `Cloud name` → utwórz **unsigned** upload preset →
   wpisz `VITE_CLOUDINARY_CLOUD_NAME` i `VITE_CLOUDINARY_UPLOAD_PRESET`.

---

## 15. Integracje zewnętrzne

- **SMTP (nodemailer):** wysyłka powiadomień RSVP. `secure:false`, port 587. Konfiguracja z env.
- **Cloudinary:** hosting zdjęć galerii. Upload **unsigned** wprost z przeglądarki (preset).
  Transformacje w URL (resize/format/quality). Backend przechowuje tylko `url` + `public_id`.
- **Google Maps (embed):** 2 iframe'y z linkami embed + linki „search” do nawigacji.
- **Google Fonts:** import w index.css (Playfair Display, Montserrat, Lato).

---

## 16. ★ Analiza bezpieczeństwa i ZNANE BUGI

### Bezpieczeństwo (charakter „miękkiej bramki”, nie twardej ochrony)
1. **Hasło wejścia w bundlu JS** — `VITE_PASSWORD` jest wkompilowane w frontend; każdy może je
   odczytać z DevTools/źródła. To celowo bramka „prywatne zaproszenie”, nie realne uwierzytelnienie.
2. **Anty-DevTools (F12/Ctrl+Shift+I)** — kosmetyczne, trywialne do obejścia. Nie chroni niczego.
3. **Admin delete piosenek** — hasło wysyłane w body żądania (po HTTPS OK), porównanie plaintext
   w kodzie. Brak rate-limitingu / lockoutu.
4. **Brak rate-limitingu** na żadnym endpoint (RSVP, songs, photos) — możliwy spam.
5. **Upload zdjęć unsigned + publiczny `POST /api/photos`** — każdy z hasłem strony (a nawet bez,
   bo endpoint nie sprawdza auth) może dodać wpis zdjęcia; galeria jest otwarta na nadużycia.
   Endpointy `/api/*` nie weryfikują `weddingAuth` (auth jest tylko po stronie UI).
6. **CORS** ograniczony do `FRONTEND_URL` — dobre. Ale API i tak jest publiczne z tego origin.
7. **SQL** — używane parametryzowane zapytania (`pool.execute(?, [...])`) → brak SQL injection. Dobrze.
8. **Sekrety w repo:** `.env` są gitignored (dobrze). ⚠️ Natomiast **ten plik HANDOFF.md ma żywe
   wartości w sekcji 14** — nie commituj go do publicznego repo bez usunięcia sekcji 14 (lub dodaj
   `HANDOFF.md` do `.gitignore`).

### 🐞 Realne BUGI (gdzie + jak poprawić — z gotowym kodem)

**BUG #1 — RSVP INSERT niespójny ze schematem** · plik `backend/server.js` (~linia 145, endpoint `POST /api/rsvp`)
Zapytanie ma 6 kolumn, 4 placeholdery i 4 wartości, a tabela `rsvps` nie ma kolumn `ip`/`user_agent`.
Skutek: INSERT rzuca wyjątek → `catch` zwraca **500 „Nie udało się wysłać maila”, mimo że mail już
został wysłany**. Gość widzi błąd, para i tak dostaje powiadomienie.
```js
// PRZED (błędne):
await pool.execute(
  'INSERT INTO rsvps (name, attending, guests, companions, ip, user_agent) VALUES (?, ?, ?, ?)',
  [name.trim(), attending, guests || 0, JSON.stringify(companions) || null],
);
// PO (poprawne — zgodne ze schematem, 4 kolumny = 4 placeholdery = 4 wartości):
await pool.execute(
  'INSERT INTO rsvps (name, attending, guests, companions) VALUES (?, ?, ?, ?)',
  [name.trim(), attending, guests || 0, companions ? JSON.stringify(companions) : null],
);
```
(Uwaga: `JSON.stringify(companions) || null` też jest podejrzane — `JSON.stringify(undefined)` daje
`undefined`, a `JSON.stringify(null)`/pustej tablicy nie daje falsy stringa; użyj wersji z `? :` jak wyżej.)

**BUG #2 — nazwa zmiennej hasła admina** · `backend/server.js` (~linia 83) vs deploy
Kod czyta `process.env.ADMIN_PASSWORD`, ale `docker-compose-prod.yml`, CI i `backend/.env` ustawiają
`SONGS_ADMIN_PASSWORD`. Efekt w prod: `ADMIN_PASSWORD` = undefined → fallback → hasło admina to `'admin'`.
```js
// PRZED:
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
// PO (dopasuj do nazwy używanej w .env/compose/CI):
const ADMIN_PASSWORD = process.env.SONGS_ADMIN_PASSWORD || 'admin';
```
Alternatywnie: zostaw kod i wszędzie (env/compose/CI-secrets) używaj `ADMIN_PASSWORD`. Ważne, by nazwa
była JEDNA w całym łańcuchu: `backend/.env` → `docker-compose-prod.yml` (environment) → GitHub Secret → `server.js`.

**BUG #3 — RSVP mailto mismatch** · `frontend/src/components/RSVP.jsx` (~linia 339, krok „Dziękujemy!”)
Tekst linku pokazuje `bartek011229@gmail.com`, ale `href="mailto:kontakt@naszslub.pl"` (inny adres).
**Fix:** ustaw `href={\`mailto:${TEN_SAM_ADRES}\`}` i ten sam tekst. W nowym projekcie wstaw właściwy e-mail pary.

**BUG #4 — favicony ze ścieżką względną** · `frontend/index.html`
`href="public/favicon-96x96.png"` (i pozostałe) — w buildzie pliki z `public/` trafiają do ROOTA,
więc powinno być `href="/favicon-96x96.png"`. Względne `public/...` może dawać 404 w prod.
**Fix:** zamień wszystkie `href="public/..."` i `href="public/site.webmanifest"` na `href="/..."`.

**BUG #5 — literówki klas Tailwind** · `Info.jsx` (`text-ss`) i `Map.jsx` (`text-s`)
Klasy nie istnieją → Tailwind je ignoruje (brak efektu na tekście). **Fix:** `text-sm` / `text-xs`.

**BUG #6 — martwy plik** · `backend/index.js` — nieużywany mini-serwer (CommonJS, port 5000).
Właściwy serwer to `server.js`. **Fix:** usuń plik (albo zignoruj — nic nie robi).

**BUG #7 — generyczny manifest** · `frontend/public/site.webmanifest`
`name:"MyWebSite"`, `short_name:"MySite"`, `theme_color/background_color:"#ffffff"` — niespójne z marką/motywem.
**Fix:** ustaw nazwę pary i kolory motywu.

**BUG #8 — martwy kod w Hero** · `frontend/src/components/Hero.jsx`
Zostawiona flaga `const hasPhoto = true` + zakomentowana instrukcja importu. Kosmetyka — do posprzątania.

---

## 17. Deployment / CI-CD / Docker

### Docker — frontend ([frontend/Dockerfile](frontend/Dockerfile))
- Multi-stage: `node:22-alpine` (build `npm ci` + `npm run build` z ARG `VITE_*`) →
  `nginx:stable-alpine` (kopiuje `dist` do `/usr/share/nginx/html`).
- Uruchamiany jako non-root `appuser`. `EXPOSE 3000`.
- nginx: [nginx.main.conf](frontend/nginx.main.conf) (pid w /tmp, include conf.d) +
  [nginx.conf](frontend/nginx.conf) (listen 3000, gzip, cache 1y na assety, SPA `try_files … /index.html`).
- **Ważne:** `VITE_*` muszą być podane jako build-args (są wkompilowane) — nie da się ich zmienić po buildzie.

### Docker — backend ([backend/Dockerfile](backend/Dockerfile))
- `node:22-alpine`, `npm ci --production`, `EXPOSE 3001`, `CMD node server.js`. Env z compose.

### docker-compose
- **dev** ([docker-compose-developement.yml](docker-compose-developement.yml)): build lokalny,
  frontend na `80:80` (uwaga: nginx.conf słucha 3000 — w dev mapowanie 80:80 nie trafia w 3000;
  to konfiguracja pod prod/Traefik), backend `expose 3001`, `env_file: ./backend/.env`.
- **prod** ([docker-compose-prod.yml](docker-compose-prod.yml)): pobiera obrazy
  `${DOCKER_USERNAME}/bartek:slubpaulinabartek-{backend,frontend}` z Docker Hub; sieć zewnętrzna
  `traefik_proxy_network`; **Traefik labels**:
  - API: `Host(slubpaulinabartek.pl) && PathPrefix(/api)` → port 3001, priority 20.
  - Front: `Host(slubpaulinabartek.pl)` → port 3000, priority 10, TLS `my-resolver`.
  - Redirect `www.` → bez `www` (middleware redirectregex).
  - Env backendu z `${...}` (SMTP_*, DB_URL, SONGS_ADMIN_PASSWORD, COUPLE_*).

### CI/CD ([.github/workflows/publish.yml](.github/workflows/publish.yml))
- Trigger: push na `main` przy zmianach w backend/server.js|package.json|Dockerfile,
  frontend/src/**|package.json|Dockerfile, docker-compose-prod.yml, sam workflow.
- `dorny/paths-filter` → osobne flagi backend/frontend/compose.
- **build-backend** (jeśli zmiana): buildx → login Docker Hub → build&push obrazu backendu (cache gha).
- **build-frontend** (jeśli zmiana): setup node 22 → `npm ci` → lint (`|| true`) → buildx →
  build&push z `build-args` = `VITE_PASSWORD`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`
  (z GitHub Secrets).
- **deploy**: SCP `docker-compose-prod.yml` na VPS → SSH: docker login, `export` env z sekretów,
  `docker pull` obu obrazów, `docker compose -f docker-compose-prod.yml up -d --remove-orphans`, prune.
- **GitHub Secrets wymagane:** `DOCKER_USERNAME`, `DOCKER_TOKEN`, `VITE_PASSWORD`,
  `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`, `VPS_HOST`, `VPS_USERNAME`,
  `VPS_SSH_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SONGS_ADMIN_PASSWORD`,
  `COUPLE_EMAIL`, `COUPLE_NAMES`, `DB_URL`.

---

## 18. Uruchomienie lokalne (dev)

```bash
# Backend
cd backend
cp .env.example .env   # lub utwórz .env wg sekcji 14
npm install
npm run dev            # nodemon server.js → http://localhost:3001  (wymaga dostępnej bazy MySQL)

# Frontend (osobny terminal)
cd frontend
# utwórz .env z VITE_PASSWORD, VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET
npm install
npm run dev            # vite → http://localhost:5173  (proxy /api → :3001)
```

- Wejście na `http://localhost:5173`, hasło = `VITE_PASSWORD`.
- Bez działającej bazy: backend nie wstanie (`initDB` → `process.exit(1)`). Songs/photos/rsvp-insert
  wymagają DB; sam mail RSVP wymaga poprawnego SMTP.

---

## 19. ★ CHECKLISTA reprodukcji na nowym motywie + nowych treściach

1. **Kolory** — podmień 7 tokenów w `tailwind.config.js` ORAZ te same HEX-y w `index.css`
   (body, scrollbar, ::selection, .gradient-text). Zaktualizuj boxShadow rgba jeśli trzeba (sekcja 6).
2. **Fonty** — jeśli inne, zmień import w `index.css` linia 1 + `fontFamily` w `tailwind.config.js`.
3. **Manifest + favicony** — `public/site.webmanifest` (name/theme_color) i pliki favicon w `public/`.
4. **Zdjęcie Hero** — podmień `src/assets/couple.jpg` (usuń nieużywane `test.jpg`).
5. **Imiona pary** — Hero, Footer, PasswordProtection, `<title>` w index.html.
6. **Data ślubu** — Hero (tekst) + Countdown (`new Date(...)`) + hasło (VITE_PASSWORD).
7. **Treści sekcji** — Agenda (10), Info/Menu (5), Map (2 lokalizacje + nowe embedy Google Maps),
   RSVP terminy/e-mail, Gifts, Contact (telefony), Welcome, Footer. Wszystko w sekcji 8.
8. **Zmienne env** — nowe `backend/.env` i `frontend/.env` wg sekcji 14 (DB, SMTP, Cloudinary, hasła).
9. **Deploy** — zmień domenę w `docker-compose-prod.yml` (Traefik Host rules, FRONTEND_URL),
   nazwy obrazów (`bartek:...`), ustaw GitHub Secrets (sekcja 17).
10. **Napraw bugi z sekcji 16** przy okazji (RSVP INSERT, nazwa ADMIN_PASSWORD, mailto, favicony).

---

*Dokument wygenerowany na podstawie pełnej analizy repozytorium (stan: gałąź `main`).*
```
