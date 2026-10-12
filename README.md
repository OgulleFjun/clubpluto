## Club Pluto – Svartklubben

Hemsidan för det maskerade rollspelsevenemanget som Sala Analoga Spelförening och SUS arrangerar i Folkets hus källare, 1 november 2026 kl. 18.30.

Den är klubbens medlemsregister: registrering via inbjudan, incheckning, identitets- och vampyrgissningar, spelledarnas prismarker och arrangörens kontrollpanel. Pokerhänder och fysiska markhögar registreras inte.

- **Frontend**: React, Vite, TypeScript (`frontend/`)
- **Backend**: Node.js, Express, PostgreSQL (`backend/`)
- **Deploy**: samma webhook-mönster som salaspel.se. Se `docs/webhook-hook-example.md` och `docs/nginx-clubpluto.example.conf`.

### Roller

| Roll | Kan |
| --- | --- |
| Besökare | Läsa om kvällen och registrera sig med en giltig inbjudan |
| Deltagare | Profil, gissningar, egna poäng efter avslöjandet, två gästinbjudningar om rätten är på |
| Dörrvakt | Söka, kontrollera entrélösenord, checka in, registrera i dörren. Ser inte vampyrlistan eller facit |
| Spelledare | Se incheckade namn och registrera prismarker för sina spel. Ser inte porträttgalleriet, vampyrer eller facit |
| Administratör | Allt, inklusive Den Förste, förvandlingar, poäng och prisutlämning |

E-post och lösenord används för att logga in. Specifikationen nämner inte inloggning, men varje deltagare behöver ett eget konto.

### Poäng

Rätt identitet eller rätt vampyrgissning ger +1. Fel ger −1. En tom ruta ger 0. Bara den senaste gissningen räknas. Vampyrer kan inte vinna överlevnadspriset. Lika poäng kan delas, avgöras av tidigaste gissning, eller väljas av arrangören.

Porträtt och namn skickas med olika slumpkoder så att rätt par inte syns i API-svaret förrän facit avslöjas.

### Lokalt

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

Skapa databasen `clubpluto`, kopiera `backend/.env.example` till `backend/.env` och fyll i uppgifter.

```bash
cd backend
npm run migrate
node scripts/seed-admin.js du@example.com ett-långt-lösenord
cd ..
npm run dev
```

Frontend: http://localhost:5174  
API: http://localhost:3010

### På shrimp

1. Peka `clubpluto.eu` och `www.clubpluto.eu` mot samma server som salaspel.se.
2. Skapa databasen i den PostgreSQL som redan körs.
3. Klona repot, lägg `backend/.env` (den committas inte) med `PORT=3010`, databas och en lång `JWT_SECRET`. Sätt `FRONTEND_URL=https://www.clubpluto.eu`.
4. `npm run migrate` och `node scripts/seed-admin.js`.
5. Lägg in nginx från `docs/nginx-clubpluto.example.conf`. Kontrollera porten för `/hooks/` mot salaspel-vhosten.
6. `pm2 start ecosystem.config.cjs`
7. Lägg till hooken `deploy-clubpluto` i samma webhook-tjänst som `deploy-salaspel`. GitHub-webhooken ska vara `https://clubpluto.eu/hooks/deploy-clubpluto` med content type `application/json`.

`scripts/deploy-pull.sh` gör `git reset`, backup, `npm ci`, frontend-build, `npm run migrate` och `pm2 restart clubpluto-backend`.

### Sådant som kan ändras utan kod

Klubbnamn, tid, plats, regler, entrélösenord, om registrering och mysterium är öppna, om Den Förste får startbonus, speltexter, prisnivåer från 2 prismarker och hur lika poäng avgörs. Allt det ligger i kontrollpanelen.
