# IOMASTAVKA — merged build 2.2

This build combines the current working IOMASTAVKA functionality with the blue glass / animated-sky visual design.

Included:
- route/rate calculator with saved rates and historical-rate marking;
- volumetric-weight factors: air 167, road 400, rail 500, sea 1000, multimodal 1000 kg/m³;
- China/Russia/Asia city suggestions with typo assistance;
- +5% China-carrier commission shown separately in quote results;
- AI assistant with web search context and text-file context;
- TN VED checker with concise duty/VAT/customs-fee/excise/marking/restriction output;
- 41 forwarder contacts;
- current CBR rates with mirror fallback;
- Moscow weather with real sunrise/sunset day/night detection;
- logistics/customs news with important-news markers;
- AI parsing of uploaded rate quotations into the saved rate database;
- responsive blue glass UI, animated sky, moon/sun, waves and the four-tool hover launcher.

Render environment variables expected:
- OPENAI_API_KEY
- OPENWEATHER_API_KEY
- optional OPENAI_MODEL

Run: `node server.js`


## Render upload safety
`server.js` can load `agents.json` and `rates.json` from either `data/` or the project root. Root copies are included so the app still starts if Render/GitHub upload does not preserve the `data/` folder.
