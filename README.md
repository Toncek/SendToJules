# Jules Command Center

Pokročilé, zero-build Chrome & Brave rozšírenie (Manifest V3) na integráciu pracovných postupov v prehliadači s Google Jules REST API.

## Funkcie
* **Odoslanie označeného textu:** Jednoducho odošlite označený text z akejkoľvek webstránky priamo do Jules.
* **Smart GitHub detekcia:** Automaticky deteguje GitHub repozitáre z URL adresy.
* **Zachovanie formátovania:** Označený kód v `<pre>` alebo `<code>` tagu je zabalený do Markdown syntaxe.
* **Rýchle skratky:** Z kontextového menu môžete na 1 klik odoslať kód do jedného z vašich posledných repozitárov.
* **Sledovanie relácií:** Monitorujte aktívne sessions a schvaľujte plány priamo z rozšírenia.
* **Notifikácie:** Upozornenia na ploche o zmene stavu session.
* **Klávesová skratka:** Rýchlo odošlite text stlačením `Alt+Shift+J`.

## Inštalácia

1. Stiahnite alebo naklonujte tento repozitár.
2. Otvorte prehliadač:
   - **Chrome**: Prejdite na `chrome://extensions`
   - **Brave**: Prejdite na `brave://extensions`
3. Zapnite "Vývojársky režim" (Developer mode) v pravom hornom rohu.
4. Kliknite na "Načítať rozbalené" (Load unpacked) a vyberte zložku s naklonovaným projektom.

## Nastavenie
1. Kliknite pravým tlačidlom na ikonu rozšírenia a zvoľte **"Možnosti"** (Options).
2. Zadajte váš Jules API kľúč a kliknite na "Otestovať pripojenie a synchronizovať repozitáre".
3. Môžete si prispôsobiť predvolenú vetvu a vlastné šablóny (prompt presets).

## Použitie
* Označte text na akejkoľvek stránke a stlačte `Alt+Shift+J` (alebo použite kontextové menu "Poslať do Jules").
* Otvorí sa okno s možnosťou úpravy textu, výberu repozitára a rýchlymi akciami pomocou šablón.
* Sledujte stav vytvorených úloh v záložke "Aktívne Sessions".
