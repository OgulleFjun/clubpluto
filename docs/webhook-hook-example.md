# Webhook – samma tjänst som salaspel

På shrimp, i deploy-webhookens `server.js` (samma fil som `deploy-salaspel`, ofta `/home/frederick/deploy-webhook/server.js`), lägg till:

```js
{
  id: 'deploy-clubpluto',
  executeCommand: '/home/frederick/clubpluto/scripts/deploy-pull.sh',
  commandWorkingDirectory: '/home/frederick/clubpluto',
  secret: 'NYTT_HMAC_SECRET_FÖR_DETTA_REPO',
}
```

Byt sökvägen om repot ligger hos en annan användare. `deploy-pull.sh` hittar själv sin rot, men `executeCommand` måste peka på filen.

## GitHub

Repo → Settings → Webhooks → Add webhook

- Payload URL: `https://salaspel.se/hooks/deploy-clubpluto`
- Content type: `application/json`
- Secret: samma som `secret` ovan
- Events: Just the push event

URL:en kan ligga på salaspel.se eftersom det är samma webhook-lyssnare. När nginx för Club Pluto också skickar `/hooks/` till den lyssnaren fungerar även `https://www.clubpluto.eu/hooks/deploy-clubpluto`.

Gör skriptet körbart på servern:

```bash
chmod +x /home/frederick/clubpluto/scripts/deploy-pull.sh
chmod +x /home/frederick/clubpluto/scripts/backup-db.sh
```

## Manuell test

```bash
/home/frederick/clubpluto/scripts/deploy-pull.sh
```
