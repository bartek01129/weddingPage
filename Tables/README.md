# Stoliki — Paulina &amp; Bartek

Generator kart z rozpiską gości przy stolikach, do samodzielnego wydruku. Otwórz `index.html`
w przeglądarce (najlepiej Chrome / Edge — mają „Zapisz jako PDF” w oknie drukowania).

**Jedna kartka A4 = jeden stolik.** Kartki są pomyślane pod tablicę / plan stołów, więc
typografia jest duża i czytelna z dystansu.

## Układ kartki

```
  ─╲╱───╲╱─ Stolik ─╲╱───╲╱─   ← pofalowana wstęga przez całą szerokość

                 1              ← numer albo nazwa stolika

         ANNA KOWALSKA
         JAN KOWALSKI           ← goście, do 12 osób
              ⋮

   PAULINA & BARTEK · 22 SIERPNIA 2026
```

Wstęga nie jest banerem ani osobnym ozdobnikiem pod wyrazem. To **jedna pofalowana linia
przez całą szerokość kartki**, która ma być **przedłużeniem pisma, a nie doczepką**: wychodzi
z łuku litery „S”, a z „k” biegnie dalej na prawą krawędź.

Żeby to działało przy dowolnym kroju napisu, program **sam odnajduje zakończenia liter**
w rastrze glifów — font nie udostępnia takiej informacji:

1. Wyraz jest rysowany na kanwie w potrójnej rozdzielczości.
2. Od skrajnej kolumny szukamy **czubków kresek**: pikseli, wokół których tusz leży tylko po
   jednej stronie (w środku kreski rozkłada się symetrycznie). Z kandydatów bierzemy ten
   **przy linii pisma** — bez tego dla „k” trafialiśmy w czubek laski i całe prawe ramię
   startowało wysoko nad wyrazem.
3. Od czubka idziemy w głąb litery **kolumna po kolumnie**, śledząc pionowy przebieg tuszu:
   jego środek i grubość. Kroje kaligraficzne kończą włos ozdobną **kulką** (Pinyon: „S” i „k”),
   a kierunek liczony z rozkładu tuszu na kulce to szum — kulka nie ma kierunku — i ramię
   nurkowało do niej hakiem. Środek śledzony przez kulkę biegnie przez jej środek, a kotwica
   w najgrubszym miejscu to dokładnie **środek kulki**: wstęga wychodzi z niej jak z koralika.
4. Styczną daje **dopasowanie liniowe środków** — tylko na zewnętrznej połowie kolumn, bo ogonek
   się zakrzywia i fit po całym oknie dawałby kąt uśredniony, nie ten w styku.

Do tego cztery detale, bez których styk i tak wygląda źle:

- ramię startuje **dokładnie z grubością kreski litery** w miejscu styku (cieńsze zostawia
  nacięcie, dużo grubsze — zgrubienie) i pełną grubość wstęgi nabiera dopiero w ok. 2/5
  długości; na krawędzi kartki znów schodzi do włoska,
- szpic wsuwa się pod glif na **zmierzoną głębokość tuszu wzdłuż stycznej** (85% zasięgu) —
  stały naddatek wystawał zza kulki albo zza zakrętu ogonka jako mały dzióbek,
- nachylenie kreski przedłużamy tylko na `waveBlend` milimetrów i **wygaszamy wykładniczo**;
  gdyby niosło dalej, strome zakończenie przechyliłoby całe ramię,
- zakończenia „S” i „k” leżą na różnych wysokościach, więc ramię startuje dokładnie w literze,
  ale potem **schodzi na wspólną linię pisma** — wokół niej fala jest już symetryczna.

> **Uwaga przy zmianach:** pomiar musi poczekać na wczytanie kroju. Kanwa rysuje wtedy
> krojem zastępczym i pomiar wychodzi z zupełnie innego pisma — a że wynik jest cache’owany,
> zostaje z nami na stałe, mimo że DOM przerysuje się już poprawnie. Stąd `scriptLoaded()`
> i odrzucanie wyniku bez zapisu do czasu, aż `document.fonts` potwierdzi krój.

### Pionowe proporcje

Napis „Stolik” ma **38 mm** (na tablicy czyta się go z kilku metrów), numer **56 mm**.
Odstępy w `METRICS` liczone są **od tuszu, nie od pól wiersza**:

- `gapWord` to odległość wstęgi od **góry cyfry**. Nad cyfrą Playfaira zostaje ok. `0,34`
  firetu pustego pola wiersza — przy numerze tej wielkości to prawie dwa centymetry powietrza,
  więc odejmujemy je od marginesu. Przy dłuższej **nazwie** stolika pole wiersza jest niskie
  i korekty nie stosujemy, inaczej tekst wszedłby we wstęgę.
- Lista gości jest wyśrodkowana w wolnym polu i podnosimy ją o `guestLift` — **przesunięciem**,
  nie skróceniem pola, bo skrócenie odbierałoby wysokość potrzebną na pełny stopień pisma.
  Przesunięcie sięga najdalej tam, gdzie kończy się zapas nad listą, więc komplet 12 nazwisk
  zostaje po prostu na środku.

Ścieżka generowana jest **wprost we współrzędnych milimetrowych** i jako wypełniony obrys,
a nie `stroke` — dzięki temu grubość nie zależy od skalowania viewBoxa i może zbiegać
od pełnego pociągnięcia przy literze do włoska na krawędzi.

## Wygląd

- Zieleń: **`#3E4A38`** — dokładnie ta sama co na winietkach (`../print/Winietki/`)
- Tło: białe, ramka i linie włosowe w jasnym odcieniu `#C6CBC1`
- Kroje (Google Fonts — wymagają internetu przy pierwszym otwarciu):
  - „Stolik” — **Pinyon Script** (do wyboru też Great Vibes, Parisienne, Playfair kursywa)
  - numer stolika — **Playfair Display**
  - nazwiska — **Cormorant Garamond**, domyślnie wersalikami z rozstrzeleniem
  - stopka — **Montserrat**

## Wpisywanie gości

Każdy stolik to jedna karta w panelu po lewej: pole na numer (lub nazwę, np. `Stół Państwa
Młodych`) i pole na gości — **jeden gość w linii**. Kolejność stolików zmienisz, przeciągając
kartę za uchwyt `⠿`.

### Wklejanie całego planu naraz

Bloki oddzielone **pustą linią**. Pierwsza linia bloku to numer stolika, reszta to goście:

```
Stolik 1
Anna Kowalska
Jan Kowalski

Stolik 2
Maria Nowak
Piotr Nowak
```

Nagłówek bloku może mieć postać `Stolik 1`, `Stół 1`, `Table 1`, samo `1`, `1.` albo dowolną
nazwę własną. Jeśli pierwsza linia wygląda na nazwisko, blok dostaje kolejny numer po kolei,
a **wszystkie** linie trafiają na listę gości.

- **Wczytaj plan** — zastępuje wszystkie stoliki
- **Dopisz do istniejących** — dokłada na koniec

## Ile osób zmieści się na kartce

Kartka jest wyskalowana pod **12 gości** — do tylu nazwiska idą w jednej kolumnie, dużym pismem.
Powyżej tego (12 przy A4 pionowo, 9 przy poziomo) tryb automatyczny przechodzi na dwie kolumny.
Liczbę kolumn można też wymusić ręcznie.

Nazwiska mają **stały stopień pisma** — `nameSize`, 6,5 mm przy A4 pionowo (5,6 mm poziomo).
Liczba osób go nie zmienia: karty wiszą na tablicy obok siebie i lista trzech gości pisana
większym pismem niż lista dwunastu od razu rzuca się w oczy. Wartość jest tak dobrana, żeby
komplet 12 nazwisk wszedł na kartkę w jednej kolumnie.

Automat zostaje tylko jako zabezpieczenie i schodzi niżej wyłącznie wtedy, gdy inaczej się nie da:

1. **z szerokości** — nazwisko dłuższe niż kolumna zwęża pismo, zamiast łamać się w pół,
2. **z wysokości** — przy liście dłuższej niż zakładana maleje pismo, potem interlinia, a na
   końcu dokładana jest druga kolumna.

## Zapisywanie danych

Wszystko zapisuje się **automatycznie w przeglądarce** (localStorage) — po zamknięciu karty dane
zostają. Dodatkowo:

- **Eksport pliku** — zrzuca cały plan do `stoliki.json`
- **Import pliku** — wczytuje go z powrotem

Warto zrobić eksport przed czyszczeniem historii przeglądarki albo przy przenoszeniu planu
na inny komputer.

## Jak drukować

1. **Zapisz jako PDF** lub **Drukuj**.
2. W oknie drukowania ustaw:
   - marginesy: **brak / none**
   - skala: **100 %** — nigdy „dopasuj do strony”
   - **włącz „Grafika tła” / „Background graphics”** — bez tego wstążka i ramka nie wyjdą
3. Papier: karton **200–250 g/m²**, matowy.

Opcja **Linijka kontrolna 100 mm** dorysowuje przy lewej krawędzi odcinek do zmierzenia zwykłą
linijką — jeśli po wydruku nie ma równo 100 mm, drukarka przeskalowała stronę. Przy A4
bez cięcia zwykle nie jest potrzebna, stąd domyślnie wyłączona.

## Opcje

| Opcja | Do czego |
|---|---|
| Napis na wstędze | domyślnie „Stolik”; może być „Stół”, „Table” itd. |
| Krój napisu | Pinyon Script / Great Vibes / Parisienne / Playfair kursywa |
| Układ listy gości | automatycznie, wymuszona 1 kolumna albo 2 kolumny |
| Nazwiska WERSALIKAMI | wersaliki z rozstrzeleniem (jak na wzorze) albo zwykła wielkość liter |
| Ozdobna ramka | podwójna włosowa ramka przy krawędzi kartki |
| Stopka z imionami i datą | treść stopki edytujesz w dwóch polach obok |
| Linijka kontrolna 100 mm | weryfikacja skali 1:1 po wydruku |

## Dokładność wymiarów

Ramka i linijka są rysowane wektorowo we współrzędnych milimetrowych (warstwa SVG), a nie jako
tła CSS — tła CSS Chrome zaokrągla do pikseli urządzenia. Pomiar wygenerowanego PDF-a:
**209,9 × 297,0 mm** przy celu 210 × 297 mm.

Kolory i ornamentyka są spójne z `../print/Winietki/` oraz `../print/menu-program-a4.html`.
