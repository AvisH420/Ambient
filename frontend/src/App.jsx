import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { getReadings, getStats, getAnomalies } from './api'

// ---------- helpers ----------

const POLL_MS = 3000

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

const todayISO = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

// motion variants
const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: 1.1, delay: i * 0.1 },
  }),
}

// ---------- root ----------

export default function App() {
  const [readings, setReadings] = useState([])
  const [stats, setStats] = useState(null)
  const [anomalies, setAnomalies] = useState([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const [r, s, a] = await Promise.all([
          getReadings(200),
          getStats(1),
          getAnomalies(20),
        ])
        if (!alive) return
        setReadings(r.slice().reverse()) // API returns newest-first; chart wants oldest-first
        setStats(s)
        setAnomalies(a)
        setConnected(true)
        setError(null)
      } catch (e) {
        if (!alive) return
        setConnected(false)
        setError(e.message)
      }
    }
    tick()
    const iv = setInterval(tick, POLL_MS)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [])

  const latest = readings[readings.length - 1]

  return (
    <div className="min-h-screen relative text-ink">
      <Backdrop />
      <Nav connected={connected} />
      <main className="relative max-w-6xl mx-auto px-6 md:px-12 pt-32 md:pt-40 pb-24">
        <Hero />
        <Readings latest={latest} stats={stats} />
        <Stream readings={readings} />
        <Anomalies anomalies={anomalies} />
        <Footer error={error} count={readings.length} />
      </main>
    </div>
  )
}

// ---------- backdrop ----------

function Backdrop() {
  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/backdrop.jpg)',
          filter: 'blur(60px) saturate(0.6)',
          transform: 'scale(1.15)',
          opacity: 0.55,
        }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-cream/55" />
    </>
  )
}

// ---------- nav ----------

function Nav({ connected }) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-40 px-6 md:px-12 py-6 backdrop-blur-md bg-cream/40 border-b border-ink/5"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8 text-[11px] tracking-[0.22em] uppercase">
          <a href="#readings" className="hover:text-ink/60 transition-colors">readings</a>
          <a href="#stream" className="hover:text-ink/60 transition-colors">stream</a>
          <a href="#anomalies" className="hover:text-ink/60 transition-colors">anomalies</a>
        </div>
        <div className="font-display text-2xl tracking-tight lowercase italic select-none">
          ambient
        </div>
        <div className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase">
          <StatusDot connected={connected} />
          <span>{connected ? 'live' : 'offline'}</span>
        </div>
      </div>
    </motion.nav>
  )
}

function StatusDot({ connected }) {
  return (
    <div className="relative w-2 h-2">
      <div
        className={`absolute inset-0 rounded-full transition-colors ${
          connected ? 'bg-emerald-800' : 'bg-ink/30'
        }`}
      />
      {connected && (
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-800"
          animate={{ scale: [1, 2.8], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
    </div>
  )
}

// ---------- hero ----------

function Hero() {
  return (
    <section className="mb-28 md:mb-40">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="text-[11px] tracking-[0.25em] uppercase text-ink/55 flex items-center gap-4 mb-16 md:mb-20"
      >
        <span className="h-px w-12 bg-ink/25" />
        <span>raipur, chhattisgarh</span>
        <span className="mx-2 text-ink/30">·</span>
        <span>21.2514° N, 81.6296° E</span>
        <span className="ml-auto">{todayISO()}</span>
      </motion.div>

      <motion.h1
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={1}
        className="font-display text-[64px] md:text-[120px] lg:text-[160px] leading-[0.92] tracking-[-0.03em] lowercase"
      >
        ambient
        <br />
        <span className="italic">monitoring</span>
      </motion.h1>

      <motion.p
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={4}
        className="mt-14 md:mt-20 max-w-xl text-base md:text-lg leading-relaxed text-ink/75"
      >
        three sensors, one esp32, a quiet machine learning model. temperature,
        humidity, and air quality stream in real time from a microcontroller on
        my desk into this dashboard, where an isolation forest watches for
        anything unusual.
      </motion.p>
    </section>
  )
}

// ---------- readings panel ----------

function Readings({ latest, stats }) {
  return (
    <section id="readings" className="mb-28 md:mb-40">
      <SectionLabel left="01 — readings" right="updated every 3s" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ink/10 border border-ink/10">
        <MetricCard
          label="temperature"
          value={latest?.temperature?.toFixed(1)}
          unit="°C"
          stats={stats?.temperature}
          decimals={1}
          delay={0}
        />
        <MetricCard
          label="humidity"
          value={latest?.humidity?.toFixed(1)}
          unit="%"
          stats={stats?.humidity}
          decimals={1}
          delay={0.1}
        />
        <MetricCard
          label="air quality"
          value={latest?.air_quality}
          unit=""
          stats={stats?.air_quality}
          decimals={0}
          delay={0.2}
        />
      </div>
    </section>
  )
}

function MetricCard({ label, value, unit, stats, decimals = 1, delay = 0 }) {
  const display = value ?? '—'
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className="bg-cream/70 backdrop-blur-sm p-8 md:p-10"
    >
      <div className="text-[11px] tracking-[0.25em] uppercase text-ink/55 mb-10">
        {label}
      </div>

      <div className="flex items-baseline gap-2 min-h-[60px]">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={display}
            initial={{ opacity: 0, y: 6, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(6px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-5xl md:text-6xl tabular-nums leading-none"
          >
            {display}
          </motion.div>
        </AnimatePresence>
        <div className="font-display text-2xl md:text-3xl text-ink/40">{unit}</div>
      </div>

      <div className="mt-10 pt-6 border-t border-ink/10 grid grid-cols-3 gap-3">
        <Stat label="min" value={stats?.min?.toFixed?.(decimals) ?? '—'} />
        <Stat label="avg" value={stats?.avg?.toFixed?.(decimals) ?? '—'} />
        <Stat label="max" value={stats?.max?.toFixed?.(decimals) ?? '—'} />
      </div>
    </motion.div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.2em] uppercase text-ink/45 mb-1.5">
        {label}
      </div>
      <div className="tabular-nums text-sm text-ink/85">{value}</div>
    </div>
  )
}

// ---------- live stream (charts) ----------

function Stream({ readings }) {
  const data = useMemo(
    () =>
      readings.map((r) => ({
        t: new Date(r.timestamp).getTime(),
        temp: r.temperature,
        humidity: r.humidity,
        aq: r.air_quality,
      })),
    [readings],
  )

  return (
    <section id="stream" className="mb-28 md:mb-40">
      <SectionLabel left="02 — live stream" right={`${readings.length} samples`} />
      <div className="bg-cream/70 backdrop-blur-sm border border-ink/10">
        <ChartRow data={data} dataKey="temp" label="temperature" unit="°C" color="#7A5C3C" />
        <ChartRow data={data} dataKey="humidity" label="humidity" unit="%" color="#5C6F3C" />
        <ChartRow data={data} dataKey="aq" label="air quality" unit="" color="#A65A2E" last />
      </div>
    </section>
  )
}

function ChartRow({ data, dataKey, label, unit, color, last }) {
  const gradientId = `grad-${dataKey}`
  return (
    <div className={last ? 'p-6 md:px-10 md:py-8' : 'p-6 md:px-10 md:py-8 border-b border-ink/10'}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] tracking-[0.22em] uppercase text-ink/60">{label}</div>
        <div className="text-[11px] tracking-[0.15em] tabular-nums text-ink/45">{unit}</div>
      </div>
      <div className="h-32 md:h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#2D2A26" strokeOpacity={0.05} vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              labelFormatter={(v) => new Date(v).toLocaleTimeString()}
              formatter={(v) => (typeof v === 'number' ? v.toFixed(2) : v)}
              contentStyle={{
                background: '#F8F3E7',
                border: '1px solid #D9CFBC',
                borderRadius: 0,
                fontSize: 11,
                fontFamily: 'Inter, sans-serif',
                color: '#2D2A26',
              }}
              cursor={{ stroke: '#2D2A26', strokeOpacity: 0.15, strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.25}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ---------- anomalies ----------

function Anomalies({ anomalies }) {
  return (
    <section id="anomalies" className="mb-24">
      <SectionLabel
        left="03 — anomalies"
        right={anomalies.length === 0 ? 'none flagged' : `${anomalies.length} flagged`}
      />

      {anomalies.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="bg-cream/70 backdrop-blur-sm border border-ink/10 px-8 md:px-10 py-12 text-ink/55 italic font-display text-lg"
        >
          baseline is calm. nothing unusual.
        </motion.div>
      ) : (
        <div className="space-y-px bg-ink/10 border border-ink/10">
          <AnimatePresence initial={false}>
            {anomalies.map((a) => (
              <motion.div
                layout
                key={a.id}
                initial={{ opacity: 0, x: 24, filter: 'blur(6px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="bg-cream/70 backdrop-blur-sm px-6 md:px-10 py-6 flex items-center justify-between gap-6"
              >
                <div className="flex items-center gap-6">
                  <div className="w-px h-10 bg-terra" />
                  <div>
                    <div className="text-[10px] tracking-[0.22em] uppercase text-ink/50">
                      {fmtTime(a.timestamp)}
                    </div>
                    <div className="mt-1.5 text-sm tabular-nums">
                      <span>{a.temperature?.toFixed(1)}°C</span>
                      <span className="mx-3 text-ink/25">·</span>
                      <span>{a.humidity?.toFixed(1)}%</span>
                      <span className="mx-3 text-ink/25">·</span>
                      <span>{a.air_quality}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] tracking-[0.22em] uppercase text-ink/50">
                    score
                  </div>
                  <div className="mt-1.5 text-sm tabular-nums">
                    {a.anomaly_score?.toFixed(3)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}

// ---------- shared ----------

function SectionLabel({ left, right }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.8 }}
      className="text-[11px] tracking-[0.25em] uppercase text-ink/55 flex items-center gap-4 mb-10 md:mb-12"
    >
      <span className="h-px w-12 bg-ink/25" />
      <span>{left}</span>
      {right && <span className="ml-auto">{right}</span>}
    </motion.div>
  )
}

function Footer({ error, count }) {
  return (
    <footer className="pt-12 mt-12 border-t border-ink/10 text-[11px] tracking-[0.22em] uppercase text-ink/45 flex items-center justify-between flex-wrap gap-3">
      <span>esp32 · dht22 · mq-135 · mqtt · fastapi · isolation forest</span>
      <span>
        {count} cached
        {error ? ` · ${error}` : ''}
      </span>
    </footer>
  )
}
