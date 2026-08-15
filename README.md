# AIMealTracker 🥗

An AI-powered macro/calorie tracker built for **Indian vegetarian food** — because most
calorie-tracking apps assume US packaged food and choke on "2 roti, dal, sabzi."

Type your meal in plain language, and it uses the Claude API to break it down into
individual food items with estimated calories, protein, carbs, and fat — using
realistic Indian home-cooking portion sizes.

## Why I built this

Every generic tracker I tried treated Indian dishes as a black box or forced me to
manually search for the closest USDA match (which is almost never accurate). This just
understands the input the way I'd actually say it out loud.

## Features

- Natural language meal logging ("2 roti, dal tadka, paneer sabzi, curd")
- AI-estimated macros tuned for Indian vegetarian cuisine
- Daily totals dashboard (calories / protein / carbs / fat)
- Per-day meal history, browsable by date
- All data stored locally in your browser (no backend, no signup)

## Tech stack

- React + Vite
- Anthropic Claude API (`claude-sonnet-4-5`) for natural-language nutrition parsing
- Plain CSS, localStorage for persistence

## Running it locally

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

On first load, you'll be asked for an Anthropic API key (get one free at
[console.anthropic.com](https://console.anthropic.com)). It's stored only in your
browser's localStorage and sent directly to Anthropic's API — no server in between.

## Building for production

```bash
npm run build
```

Outputs a static site in `dist/` that can be deployed anywhere (Vercel, Netlify,
GitHub Pages, Replit, etc.).

## Notes / limitations

- Macro estimates are AI-generated approximations, not lab-verified nutrition data —
  good for tracking trends, not medical/clinical use.
- Requires your own Anthropic API key (pay-as-you-go, very cheap for this use case).
- No auth/multi-user support — this is a personal single-user tool by design.

## License

MIT — do whatever you want with it.
