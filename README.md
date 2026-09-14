# iomastavka

Render-ready freight calculator for China → Russia.

## Render environment variables
Set these in Render → Environment:

- `OPENWEATHER_API_KEY` — your OpenWeather API key. Keep it in Render, not in frontend code or GitHub.
- `SESSION_SECRET` — any long random string.
- `ADMIN_PASSWORD_HASH` — optional; the project contains a working fallback hash for the current password.

The weather background uses Moscow coordinates and Moscow local time. At night the moon/stars appear; weather effects (rain/snow/clouds) can remain visible at night too.

## Start command
`npm start`
