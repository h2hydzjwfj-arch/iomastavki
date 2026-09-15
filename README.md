# iomastavka

Render deployment package.

Environment variables already used by the app:
- OPENAI_API_KEY — AI, КП/PDF/file analysis, speech
- OPENWEATHER_API_KEY — weather
- OPENAI_MODEL — optional, defaults to gpt-5.6-luna
- OPENAI_TRANSCRIBE_MODEL — optional
- OPENAI_TTS_VOICE — optional
- RATES_FILE — optional persistent path for the rate database (recommended when using a Render Persistent Disk, e.g. /data/rates.json)

AI can import rate information from text or attached PDF/Excel/Word/TXT files. Rates are stored in data/rates.json by default. On Render, the default filesystem is ephemeral; for permanent rate history, mount a Render Persistent Disk and set RATES_FILE=/data/rates.json.
