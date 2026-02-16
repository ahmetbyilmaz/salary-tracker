import { useState, useEffect, useRef } from "react";
import { Wallet, Clock, Calendar, TrendingUp, ArrowRight, RefreshCw } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
const CURRENCY_SYMBOLS = { TL: "₺", USD: "$", EUR: "€" };

// Türkçe i→İ dönüşümü için locale-aware büyük harf
const upper = (str, lang) => str.toLocaleUpperCase(lang === "tr" ? "tr-TR" : "en-US");

// ── Billionaire Data (estimated annual earnings in USD) ───────────────────────
// Sources: Forbes, Bloomberg Billionaires Index averages
const BILLIONAIRES = [
  { id: "musk",     name: "Elon Musk",        emoji: "🚀", annualUSD: 180_000_000_000, color: "#1e2a3a", accent: "#6ee7b7" },
  { id: "bezos",    name: "Jeff Bezos",        emoji: "📦", annualUSD: 75_000_000_000,  color: "#1a2535", accent: "#93c5fd" },
  { id: "zuck",     name: "Mark Zuckerberg",   emoji: "👾", annualUSD: 60_000_000_000,  color: "#1f1a35", accent: "#c4b5fd" },
  { id: "arnault",  name: "Bernard Arnault",   emoji: "👜", annualUSD: 50_000_000_000,  color: "#251a1a", accent: "#fca5a5" },
  { id: "gates",    name: "Bill Gates",        emoji: "💻", annualUSD: 25_000_000_000,  color: "#1a2520", accent: "#6ee7b7" },
];

// USD monthly equivalent for a billionaire
function billionaireMonthly(annualUSD) {
  return annualUSD / 12;
}

// ── i18n ─────────────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  tr: {
    appName: "Maaş Sayacı",
    appSubtitle: "Kazancınızı anlık olarak izleyin",
    salaryType: "Maaş Tipi",
    currency: "Para Birimi",
    monthlySalary: "Aylık",
    salaryLabel: "Maaş",
    payDay: "Maaş Günü (1–31)",
    startBtn: "Hesaplamaya Başla",
    earnedThisMonth: "Bu Ay Kazandınız",
    earnedThisSession: "Bu Oturumda Kazandınız",
    sessionSince: "Sayfa açıldığından itibaren",
    live: "CANLI",
    session: "OTURUM",
    payCycle: "Maaş Döngüsü",
    daysLeft: "gün kaldı",
    lastPay: "Son Maaş",
    nextPay: "Sonraki Maaş",
    daily: "Günlük",
    hourly: "Saatlik",
    perMinute: "Dakikalık",
    perSecond: "Saniyelik",
    footer: "Her saniye güncelleniyor ✦ Maaş sayacı",
    net: "Net",
    gross: "Brüt",
  },
  en: {
    appName: "Salary Tracker",
    appSubtitle: "Track your earnings in real time",
    salaryType: "Salary Type",
    currency: "Currency",
    monthlySalary: "Monthly",
    salaryLabel: "Salary",
    payDay: "Pay Day (1–31)",
    startBtn: "Start Tracking",
    earnedThisMonth: "Earned This Month",
    earnedThisSession: "Earned This Session",
    sessionSince: "Since you opened this page",
    live: "LIVE",
    session: "SESSION",
    payCycle: "Pay Cycle",
    daysLeft: "days left",
    lastPay: "Last Pay",
    nextPay: "Next Pay",
    daily: "Daily",
    hourly: "Hourly",
    perMinute: "Per Minute",
    perSecond: "Per Second",
    footer: "Updates every second ✦ Salary Tracker",
    net: "Net",
    gross: "Gross",
  },
};

// ── Lang Button ───────────────────────────────────────────────────────────────
function LangButton({ lang, setLang }) {
  return (
    <button
      onClick={() => setLang(lang === "tr" ? "en" : "tr")}
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(12px)",
        border: "1.5px solid rgba(167,139,250,0.22)",
        boxShadow: "0 2px 12px rgba(167,139,250,0.12)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        color: "#6b5b8a",
        letterSpacing: "0.04em",
        transition: "all 0.2s",
        fontFamily: "inherit",
      }}
    >
      <span style={{ fontSize: 15 }}>{lang === "tr" ? "🇹🇷" : "🇬🇧"}</span>
      {lang === "tr" ? "TR" : "EN"}
    </button>
  );
}

function formatMoney(amount, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || "₺";
  const locale = currency === "USD" || currency === "EUR" ? "en-US" : "tr-TR";
  return `${symbol}${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getMoneyFontSize(amount, currency) {
  const formatted = formatMoney(amount, currency);
  const len = formatted.length;
  if (len <= 10) return "clamp(32px, 8vw, 52px)";
  if (len <= 13) return "clamp(28px, 7vw, 48px)";
  if (len <= 16) return "clamp(24px, 6vw, 42px)";
  if (len <= 19) return "clamp(20px, 5vw, 32px)";
  return "clamp(18px, 4.5vw, 28px)";
}

function getEarnings(monthlySalary, payDay) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Last pay date
  let lastPay = new Date(year, month, payDay);
  if (lastPay > now) lastPay = new Date(year, month - 1, payDay);

  // Next pay date
  let nextPay = new Date(lastPay);
  nextPay.setMonth(nextPay.getMonth() + 1);

  const totalMs = nextPay - lastPay;
  const elapsedMs = now - lastPay;
  const progress = Math.min(elapsedMs / totalMs, 1);

  const earned = monthlySalary * progress;
  const perDay = monthlySalary / 30;
  const perHour = perDay / 24;
  const perMinute = perHour / 60;
  const perSecond = perMinute / 60;

  return { earned, perDay, perHour, perMinute, perSecond, progress, nextPay };
}

// ── Animated Number ───────────────────────────────────────────────────────────
function AnimatedNumber({ value, currency }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf = useRef(null);

  useEffect(() => {
    const start = prev.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(start + (end - start) * eased);
      if (t < 1) raf.current = requestAnimationFrame(animate);
      else prev.current = end;
    };

    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return <span>{formatMoney(display, currency)}</span>;
}

// ── Mini Card ─────────────────────────────────────────────────────────────────
function MiniCard({ icon: Icon, label, value, currency, color }) {
  return (
    <div
      className="rounded-3xl p-5 flex flex-col gap-2"
      style={{
        background: color,
        boxShadow: "0 2px 18px 0 rgba(180,180,220,0.10)",
      }}
    >
      <div className="flex items-center gap-2 opacity-60">
        <Icon size={15} />
        <span className="text-xs font-semibold tracking-widest uppercase">{label}</span>
      </div>
      <div className="text-lg font-bold" style={{ letterSpacing: "-0.02em" }}>
        {formatMoney(value, currency)}
      </div>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ progress, nextPay, t, lang }) {
  const pct = Math.round(progress * 100);
  const daysLeft = Math.ceil((nextPay - new Date()) / 86400000);

  return (
    <div className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.55)" }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-50">
          {upper(t.payCycle, lang)}
        </span>
        <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>
          {daysLeft} {t.daysLeft}
        </span>
      </div>

      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 10, background: "rgba(167,139,250,0.15)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #a78bfa 0%, #6ee7b7 100%)",
            transition: "width 1s ease",
          }}
        />
      </div>

      <div className="flex justify-between mt-2">
        <span className="text-xs opacity-40">{t.lastPay}</span>
        <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>
          {pct}%
        </span>
        <span className="text-xs opacity-40">{t.nextPay}</span>
      </div>
    </div>
  );
}

// ── Setup Screen ──────────────────────────────────────────────────────────────
function SetupScreen({ onStart, t, lang }) {
  const [form, setForm] = useState({
    type: "Net",
    currency: "TL",
    salary: "",
    payDay: "15",
  });
  const [displaySalary, setDisplaySalary] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSalaryChange = (e) => {
    // Strip everything except digits and one comma/dot for decimals
    const raw = e.target.value.replace(/\./g, "").replace(",", ".");
    const numeric = raw.replace(/[^0-9.]/g, "");
    const parts = numeric.split(".");
    const intPart = parts[0];
    const decPart = parts[1] !== undefined ? "," + parts[1] : "";

    // Format integer part with dots every 3 digits
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + decPart;

    setDisplaySalary(formatted);
    // Store raw numeric value for calculations
    set("salary", numeric);
  };

  const valid = form.salary && Number(form.salary) > 0;

  const inputStyle = {
    background: "rgba(255,255,255,0.7)",
    border: "1.5px solid rgba(167,139,250,0.25)",
    borderRadius: 16,
    padding: "12px 16px",
    fontSize: 15,
    color: "#4b4569",
    outline: "none",
    width: "100%",
    transition: "border 0.2s",
    fontFamily: "inherit",
  };

  const chipBase = {
    padding: "8px 20px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    border: "1.5px solid transparent",
    transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
    letterSpacing: "0.03em",
  };

  const chip = (active) => ({
    ...chipBase,
    background: active
      ? "linear-gradient(135deg, #1e2a3a 0%, #2d3f55 100%)"
      : "rgba(255,255,255,0.55)",
    color: active ? "#e8f0fb" : "#7a6e92",
    border: active
      ? "1.5px solid #3b5070"
      : "1.5px solid rgba(167,139,250,0.18)",
    boxShadow: active
      ? "0 4px 16px rgba(30,42,58,0.28), inset 0 1px 0 rgba(255,255,255,0.08)"
      : "0 1px 4px rgba(167,139,250,0.06)",
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #f3f0ff 0%, #e8f8f2 50%, #fdf0fb 100%)" }}
    >
      {/* Decorative blobs */}
      <div style={{
        position: "fixed", top: -80, right: -60, width: 320, height: 320,
        background: "radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: -60, left: -40, width: 260, height: 260,
        background: "radial-gradient(circle, rgba(110,231,183,0.18) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      <div className="w-full max-w-md" style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4"
            style={{
              width: 64, height: 64, borderRadius: 20,
              background: "linear-gradient(135deg, #a78bfa 0%, #6ee7b7 100%)",
              boxShadow: "0 8px 24px rgba(167,139,250,0.35)",
            }}
          >
            <Wallet size={28} color="#fff" />
          </div>
          <h1 style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: 32, fontWeight: 700, color: "#4b4569",
            letterSpacing: "-0.03em", marginBottom: 6,
          }}>
            {t.appName}
          </h1>
          <p style={{ color: "#9b8ab8", fontSize: 14 }}>
            {t.appSubtitle}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-7 flex flex-col gap-6"
          style={{
            background: "rgba(255,255,255,0.65)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 40px rgba(167,139,250,0.12), 0 1px 0 rgba(255,255,255,0.9) inset",
            border: "1.5px solid rgba(255,255,255,0.8)",
          }}
        >
          {/* Maaş Tipi */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#9b8ab8", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              {upper(t.salaryType, lang)}
            </label>
            <div className="flex gap-3">
              {[[t.net, "Net"], [t.gross, "Brüt"]].map(([label, val]) => (
                <button key={val} style={chip(form.type === val)} onClick={() => set("type", val)}>{label}</button>
              ))}
            </div>
          </div>

          {/* Para Birimi */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#9b8ab8", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              {upper(t.currency, lang)}
            </label>
            <div className="flex gap-3">
              {["TL", "USD", "EUR"].map((c) => (
                <button key={c} style={chip(form.currency === c)} onClick={() => set("currency", c)}>
                  {CURRENCY_SYMBOLS[c]} {c}
                </button>
              ))}
            </div>
          </div>

          {/* Maaş Tutarı */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#9b8ab8", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              {upper(`${t.monthlySalary} ${form.type === "Net" ? t.net : t.gross} ${t.salaryLabel}`, lang)}
            </label>
            <div className="relative">
              <span style={{
                position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                color: "#a78bfa", fontWeight: 700, fontSize: 16,
              }}>{CURRENCY_SYMBOLS[form.currency]}</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={displaySalary}
                onChange={handleSalaryChange}
                style={{ ...inputStyle, paddingLeft: 36 }}
                onFocus={(e) => (e.target.style.border = "1.5px solid rgba(167,139,250,0.7)")}
                onBlur={(e) => (e.target.style.border = "1.5px solid rgba(167,139,250,0.25)")}
              />
            </div>
          </div>

          {/* Maaş Günü */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#9b8ab8", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              {upper(t.payDay, lang)}
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={form.payDay}
              onChange={(e) => set("payDay", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.border = "1.5px solid rgba(167,139,250,0.7)")}
              onBlur={(e) => (e.target.style.border = "1.5px solid rgba(167,139,250,0.25)")}
            />
          </div>

          {/* CTA */}
          <button
            disabled={!valid}
            onClick={() => onStart(form)}
            className="flex items-center justify-center gap-2 w-full"
            style={{
              padding: "15px 24px",
              borderRadius: 999,
              background: valid
                ? "linear-gradient(135deg, #a78bfa 0%, #6ee7b7 100%)"
                : "rgba(167,139,250,0.2)",
              color: valid ? "#fff" : "#c4b5e0",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "0.02em",
              border: "none",
              cursor: valid ? "pointer" : "not-allowed",
              boxShadow: valid ? "0 6px 24px rgba(167,139,250,0.35)" : "none",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          >
            {t.startBtn}
            <ArrowRight size={17} />
          </button>
        </div>

        {/* Billionaire Quick-Start */}
        <div style={{ marginTop: 24 }}>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ flex: 1, height: 1, background: "rgba(167,139,250,0.15)" }} />
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
              color: "#b0a0d0", textTransform: "uppercase", whiteSpace: "nowrap",
            }}>
              {lang === "tr" ? "💰 " + upper("Milyarderler ile Kıyasla", lang) : "💰 " + upper("Compare with Billionaires", lang)}
            </p>
            <div style={{ flex: 1, height: 1, background: "rgba(167,139,250,0.15)" }} />
          </div>
          <div className="flex flex-col gap-2">
            {BILLIONAIRES.map((b) => {
              const bMonthly = billionaireMonthly(b.annualUSD);
              const bPerSec  = bMonthly / 30 / 24 / 60 / 60;
              return (
                <button
                  key={b.id}
                  onClick={() => onStart({
                    type: "Net",
                    currency: "USD",
                    salary: String(bMonthly),
                    payDay: "1",
                    billionaire: b,
                  })}
                  style={{
                    width: "100%",
                    padding: "12px 18px",
                    borderRadius: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
                    background: "rgba(255,255,255,0.60)",
                    border: "1.5px solid rgba(167,139,250,0.15)",
                    boxShadow: "0 1px 6px rgba(167,139,250,0.07)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${b.color} 0%, #1a2535 100%)`;
                    e.currentTarget.style.border = `1.5px solid ${b.accent}50`;
                    e.currentTarget.style.boxShadow = `0 4px 20px ${b.color}55`;
                    e.currentTarget.querySelector(".bname").style.color = "#f0f4ff";
                    e.currentTarget.querySelector(".bsub").style.color = b.accent;
                    e.currentTarget.querySelector(".bval").style.color = b.accent;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.60)";
                    e.currentTarget.style.border = "1.5px solid rgba(167,139,250,0.15)";
                    e.currentTarget.style.boxShadow = "0 1px 6px rgba(167,139,250,0.07)";
                    e.currentTarget.querySelector(".bname").style.color = "#4b4569";
                    e.currentTarget.querySelector(".bsub").style.color = "#b0a0d0";
                    e.currentTarget.querySelector(".bval").style.color = "#9b8ab8";
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 20 }}>{b.emoji}</span>
                    <div className="text-left">
                      <p className="bname" style={{ fontSize: 13, fontWeight: 700, color: "#4b4569", letterSpacing: "-0.01em", transition: "color 0.2s" }}>
                        {b.name}
                      </p>
                      <p className="bsub" style={{ fontSize: 10, fontWeight: 600, color: "#b0a0d0", letterSpacing: "0.04em", transition: "color 0.2s" }}>
                        ${(b.annualUSD / 1_000_000_000).toFixed(0)}B / {lang === "tr" ? "yıl" : "year"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="bval" style={{ fontSize: 11, fontWeight: 700, color: "#9b8ab8", transition: "color 0.2s" }}>
                      ${bPerSec.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} / {lang === "tr" ? "sn" : "sec"}
                    </p>
                    <ArrowRight size={13} style={{ color: "#c4b5e0" }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ config, onReset, t, lang }) {
  const [data, setData] = useState(() => getEarnings(Number(config.salary), Number(config.payDay)));
  const [tick, setTick] = useState(0);
  const sessionStart = useRef(Date.now());
  const [sessionEarned, setSessionEarned] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setData(getEarnings(Number(config.salary), Number(config.payDay)));
      setTick((t) => t + 1);
      const elapsedSeconds = (Date.now() - sessionStart.current) / 1000;
      const perSecond = Number(config.salary) / 30 / 24 / 60 / 60;
      setSessionEarned(elapsedSeconds * perSecond);
    }, 1000);
    return () => clearInterval(id);
  }, [config]);

  const activeSalary = config.billionaire
    ? billionaireMonthly(config.billionaire.annualUSD)
    : Number(config.salary);
  const activeCurrency = config.billionaire ? "USD" : config.currency;
  const activeData = config.billionaire
    ? getEarnings(activeSalary, Number(config.payDay))
    : data;

  const now = new Date();
  const locale = lang === "tr" ? "tr-TR" : "en-US";
  const timeStr = now.toLocaleTimeString(locale);
  const dateStr = now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });

  const cards = [
    { icon: Calendar,   label: upper(t.daily, lang),     value: activeData.perDay,    color: "rgba(167,139,250,0.10)" },
    { icon: Clock,      label: upper(t.hourly, lang),    value: activeData.perHour,   color: "rgba(110,231,183,0.10)" },
    { icon: TrendingUp, label: upper(t.perMinute, lang), value: activeData.perMinute, color: "rgba(251,207,232,0.20)" },
    { icon: Wallet,     label: upper(t.perSecond, lang), value: activeData.perSecond, color: "rgba(167,139,250,0.08)" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #f3f0ff 0%, #e8f8f2 50%, #fdf0fb 100%)" }}
    >
      {/* Blobs */}
      <div style={{
        position: "fixed", top: -100, right: -80, width: 400, height: 400,
        background: "radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: -80, left: -60, width: 340, height: 340,
        background: "radial-gradient(circle, rgba(110,231,183,0.15) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      <div className="w-full max-w-md flex flex-col gap-5" style={{ position: "relative", zIndex: 1 }}>

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#9b8ab8", textTransform: "capitalize" }}>{dateStr}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#4b4569", letterSpacing: "-0.02em", fontFamily: "'Georgia', serif" }}>{timeStr}</p>
          </div>
          <button onClick={onReset}
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: "rgba(255,255,255,0.7)",
              border: "1.5px solid rgba(167,139,250,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#9b8ab8",
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Main Counter Card */}
        <div className="rounded-3xl p-8 text-center"
          style={{
            background: "rgba(255,255,255,0.65)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 40px rgba(167,139,250,0.14), 0 1px 0 rgba(255,255,255,0.9) inset",
            border: "1.5px solid rgba(255,255,255,0.85)",
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#b0a0d0", textTransform: "uppercase", marginBottom: 8 }}>
            {upper(t.earnedThisMonth, lang)}
          </p>

          {/* Pulse dot */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
              background: "#6ee7b7",
              boxShadow: "0 0 0 3px rgba(110,231,183,0.25)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 700, letterSpacing: "0.06em" }}>{upper(t.live, lang)}</span>
          </div>

          <div style={{
            fontSize: getMoneyFontSize(activeData.earned, activeCurrency),
            fontWeight: 800,
            fontFamily: "'Georgia', 'Times New Roman', serif",
            letterSpacing: "-0.04em",
            background: "linear-gradient(135deg, #a78bfa 0%, #6ee7b7 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.1,
            minHeight: 62,
            transition: "font-size 0.3s ease",
          }}>
            <AnimatedNumber value={activeData.earned} currency={activeCurrency} />
          </div>

          <p style={{ fontSize: 12, color: "#b0a0d0", marginTop: 8 }}>
            {config.billionaire ? config.billionaire.name : `${config.type} · ${config.currency}`}
          </p>
        </div>

        {/* Session Counter Card */}
        <div className="rounded-3xl p-6 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(30,42,58,0.92) 0%, rgba(45,63,85,0.92) 100%)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(30,42,58,0.22), 0 1px 0 rgba(255,255,255,0.06) inset",
            border: "1.5px solid rgba(255,255,255,0.08)",
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(200,215,235,0.5)", textTransform: "uppercase", marginBottom: 6 }}>
            {upper(t.earnedThisSession, lang)}
          </p>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span style={{
              display: "inline-block", width: 7, height: 7, borderRadius: "50%",
              background: "#fbbf24",
              boxShadow: "0 0 0 3px rgba(251,191,36,0.2)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700, letterSpacing: "0.06em" }}>{upper(t.session, lang)}</span>
          </div>
          <div style={{
            fontSize: getMoneyFontSize(sessionEarned, config.billionaire ? "USD" : config.currency),
            fontWeight: 800,
            fontFamily: "'Georgia', 'Times New Roman', serif",
            letterSpacing: "-0.04em",
            background: "linear-gradient(135deg, #fbbf24 0%, #f0abfc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.1,
            minHeight: 48,
            transition: "font-size 0.3s ease",
          }}>
            <AnimatedNumber value={sessionEarned} currency={config.billionaire ? "USD" : config.currency} />
          </div>
          <p style={{ fontSize: 11, color: "rgba(200,215,235,0.35)", marginTop: 6 }}>
            {t.sessionSince}
          </p>
        </div>

        {/* Progress Bar */}
        <ProgressBar progress={data.progress} nextPay={data.nextPay} t={t} lang={lang} />

        {/* Mini Cards */}
        <div className="grid grid-cols-2 gap-3">
          {cards.map((c) => (
            <MiniCard key={c.label} icon={c.icon} label={c.label} value={c.value} currency={activeCurrency} color={c.color} />
          ))}
        </div>

        {/* Footer */}
        <p className="text-center" style={{ fontSize: 11, color: "#c4b5e0", letterSpacing: "0.04em" }}>
          {t.footer}
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(110,231,183,0.25); }
          50% { box-shadow: 0 0 0 7px rgba(110,231,183,0.08); }
        }
      `}</style>
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [config, setConfig] = useState(null);
  const [lang, setLang] = useState("tr");
  const t = TRANSLATIONS[lang];

  return (
    <>
      <LangButton lang={lang} setLang={setLang} />
      {config
        ? <Dashboard config={config} onReset={() => setConfig(null)} t={t} lang={lang} />
        : <SetupScreen onStart={setConfig} t={t} lang={lang} />
      }
    </>
  );
}
