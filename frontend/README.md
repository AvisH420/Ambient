# IoT Sensor Dashboard - Frontend (Phase 4)

Minimalist dashboard built in the spirit of the Ardène template - warm cream palette, Instrument Serif display, motion-blurred reveals, hairline section dividers, gentle area charts.

Renders live data from the FastAPI backend by polling every 3 seconds.

## Stack

- Vite + React
- Tailwind CSS (custom warm beige palette under `cream` and `ink`)
- Framer Motion (page-load reveals, value-change blur transitions, anomaly list animation)
- Recharts (three stacked area charts on the live stream)

## Run locally

```
cd ~/iot-project/frontend
npm install
npm run dev
```

Opens at http://localhost:5173. The page polls `http://localhost:8000` (the FastAPI backend) every 3 seconds. Keep that backend running in another terminal.

## Project structure

```
frontend/
  index.html              page shell, font preloads
  package.json            deps + scripts
  vite.config.js          Vite + React plugin
  tailwind.config.js      cream/ink color palette, font families
  postcss.config.js       Tailwind plumbing
  vercel.json             SPA rewrite for Vercel
  public/
    backdrop.jpg          blurred backdrop photo (warm-toned)
  src/
    main.jsx              React entry
    App.jsx               entire dashboard - hero, metric cards, charts, anomalies
    api.js                fetch helpers (uses VITE_API_URL)
    index.css             tailwind + body styling
```

## Deploy

### Frontend on Vercel

1. Push the `frontend/` folder to a GitHub repo (or the whole `iot-project` repo and point Vercel at the `frontend/` subdirectory).
2. In Vercel, import the repo. Vercel auto-detects Vite and uses `npm run build` + `dist/` as the output.
3. Set the environment variable `VITE_API_URL` to your deployed backend URL (e.g. `https://your-app.onrender.com`).
4. Deploy.

### Backend on Render (Vercel can't run it)

The backend has a long-running MQTT subscriber, which Vercel's serverless model cannot host. Use Render's free web service tier:

1. Push `backend/` to a GitHub repo.
2. On Render, create a new Web Service from that repo.
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Important: the ESP32 currently publishes to your local Mosquitto. For production you need a cloud MQTT broker - HiveMQ Cloud has a free serverless tier. Update the ESP32 sketch to publish there, and update `MQTT_HOST` in `mqtt_subscriber.py` to match.

For now you can demo locally and worry about cloud broker migration later. The Vercel + Render split works fine for local backend during development.

## Design notes

The palette mirrors the reference - warm cream `#F2EBDC` as the canvas, deep walnut `#2D2A26` as the text, terracotta `#A65A2E` reserved for anomaly accents. All section labels are tracked-out small caps. Display headlines are lowercase Instrument Serif with negative letter spacing. Numbers use `tabular-nums` so they don't jitter as values update.

Animations are restrained on purpose - small upward fades on first reveal, brief blur-to-clear when a metric value changes, soft staggered entry for new anomalies. No spinning, no bouncing, no parallax.
