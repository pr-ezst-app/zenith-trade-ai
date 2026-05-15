import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { id: "charts", label: "Charts", icon: "LineChart" },
  { id: "trading", label: "Trading", icon: "Zap" },
  { id: "portfolio", label: "Portfolio", icon: "PieChart" },
  { id: "alerts", label: "Alerts", icon: "Bell" },
  { id: "history", label: "History", icon: "History" },
  { id: "analytics", label: "Analytics", icon: "BarChart2" },
  { id: "botsetup", label: "Bot Setup", icon: "Bot" },
  { id: "settings", label: "Settings", icon: "Settings" },
];

const PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"];

function useFakePrice(base: number, volatility = 0.001) {
  const [price, setPrice] = useState(base);
  const [dir, setDir] = useState<"up" | "down">("up");
  useEffect(() => {
    const iv = setInterval(() => {
      setPrice((p) => {
        const delta = p * volatility * (Math.random() - 0.48);
        const next = Math.max(p + delta, base * 0.8);
        setDir(delta >= 0 ? "up" : "down");
        return +next.toFixed(2);
      });
    }, 800);
    return () => clearInterval(iv);
  }, [base, volatility]);
  return { price, dir };
}

function useFakeCandles(count = 60) {
  const [candles, setCandles] = useState<{ o: number; h: number; l: number; c: number }[]>(() => {
    let p = 67000;
    return Array.from({ length: count }, () => {
      const o = p;
      const move = p * 0.012 * (Math.random() - 0.48);
      const c = p + move;
      const h = Math.max(o, c) + Math.abs(move) * Math.random() * 0.5;
      const l = Math.min(o, c) - Math.abs(move) * Math.random() * 0.5;
      p = c;
      return { o, h, l, c };
    });
  });

  useEffect(() => {
    const iv = setInterval(() => {
      setCandles((prev) => {
        const last = prev[prev.length - 1];
        const move = last.c * 0.003 * (Math.random() - 0.48);
        const c = last.c + move;
        const h = Math.max(last.c, c) + Math.abs(move) * 0.3;
        const l = Math.min(last.c, c) - Math.abs(move) * 0.3;
        return [...prev.slice(1), { o: last.c, h, l, c }];
      });
    }, 1200);
    return () => clearInterval(iv);
  }, []);

  return candles;
}

function CandleChart({ candles }: { candles: { o: number; h: number; l: number; c: number }[] }) {
  const W = 800, H = 220;
  const min = Math.min(...candles.map((c) => c.l));
  const max = Math.max(...candles.map((c) => c.h));
  const range = max - min || 1;
  const cw = W / candles.length;
  const pad = 2;
  const toY = (v: number) => H - ((v - min) / range) * (H - 16) - 8;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(152,80%,48%)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="hsl(152,80%,48%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="url(#chartGrad)"
        stroke="none"
        points={[
          ...candles.map((c, i) => `${i * cw + cw / 2},${toY(c.c)}`),
          `${(candles.length - 1) * cw + cw / 2},${H}`,
          `0,${H}`,
        ].join(" ")}
      />
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1={0} y1={H * t} x2={W} y2={H * t} stroke="hsl(220,12%,14%)" strokeWidth={1} />
      ))}
      {candles.map((c, i) => {
        const x = i * cw;
        const bullish = c.c >= c.o;
        const color = bullish ? "hsl(152,80%,48%)" : "hsl(0,72%,55%)";
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyH = Math.max(Math.abs(toY(c.o) - toY(c.c)), 1);
        return (
          <g key={i}>
            <line x1={x + cw / 2} y1={toY(c.h)} x2={x + cw / 2} y2={toY(c.l)} stroke={color} strokeWidth={0.8} />
            <rect x={x + pad} y={bodyTop} width={cw - pad * 2} height={bodyH} fill={color} rx={0.5} />
          </g>
        );
      })}
      <polyline
        fill="none"
        stroke="hsl(152,80%,48%)"
        strokeWidth={1.5}
        strokeOpacity={0.6}
        points={candles.map((c, i) => `${i * cw + cw / 2},${toY(c.c)}`).join(" ")}
      />
    </svg>
  );
}

function OrderBookRow({ price, size, side, maxSize }: { price: number; size: number; side: "bid" | "ask"; maxSize: number }) {
  const pct = (size / maxSize) * 100;
  return (
    <div className="relative flex items-center text-xs font-mono-trade py-[2px] px-2 hover:bg-white/[0.03] cursor-default">
      <div
        className="absolute inset-y-0 right-0"
        style={{ width: `${pct}%`, background: side === "bid" ? "hsl(152 80% 48% / 0.08)" : "hsl(0 72% 55% / 0.08)" }}
      />
      <span className={`flex-1 ${side === "bid" ? "text-green" : "text-red"}`}>
        {price.toLocaleString("en-US", { minimumFractionDigits: 1 })}
      </span>
      <span className="flex-1 text-right text-muted-foreground">{size.toFixed(4)}</span>
      <span className="flex-1 text-right text-muted-foreground">{(price * size).toFixed(0)}</span>
    </div>
  );
}

function useOrderBook(basePrice: number) {
  const [book, setBook] = useState<{ bids: number[][]; asks: number[][] }>({ bids: [], asks: [] });
  useEffect(() => {
    const gen = (p: number) => {
      const bids = Array.from({ length: 10 }, (_, i) => [
        +(p - (i + 1) * (p * 0.0002)).toFixed(1),
        +(Math.random() * 2 + 0.1).toFixed(4),
      ]);
      const asks = Array.from({ length: 10 }, (_, i) => [
        +(p + (i + 1) * (p * 0.0002)).toFixed(1),
        +(Math.random() * 2 + 0.1).toFixed(4),
      ]);
      setBook({ bids, asks });
    };
    gen(basePrice);
    const iv = setInterval(() => gen(basePrice), 1000);
    return () => clearInterval(iv);
  }, [basePrice]);
  return book;
}

function StatCard({ label, value, change, icon }: { label: string; value: string; change?: string; icon: string }) {
  const up = change && !change.startsWith("-");
  return (
    <div className="panel p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono-trade">{label}</span>
        <div className="w-7 h-7 rounded flex items-center justify-center bg-secondary">
          <Icon name={icon} size={14} className="text-muted-foreground" />
        </div>
      </div>
      <div className="text-xl font-semibold font-mono-trade text-foreground">{value}</div>
      {change && (
        <div className={`text-xs mt-1 font-mono-trade ${up ? "text-green" : "text-red"}`}>
          {up ? "▲" : "▼"} {change}
        </div>
      )}
    </div>
  );
}

function Dashboard({ btcPrice, btcDir }: { btcPrice: number; btcDir: string }) {
  const candles = useFakeCandles(50);
  const { price: ethPrice } = useFakePrice(3540, 0.001);
  const { price: solPrice } = useFakePrice(185, 0.002);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Portfolio Value" value="$284,720" change="+2.34%" icon="Wallet" />
        <StatCard label="Today P&L" value="+$6,512" change="+2.34%" icon="TrendingUp" />
        <StatCard label="Open Positions" value="7" icon="Layers" />
        <StatCard label="Win Rate" value="68.4%" change="+1.2%" icon="Target" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="panel p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            <span className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest">Live Prices</span>
          </div>
          <div className="divide-y divide-border">
            {[
              { pair: "BTC/USDT", price: btcPrice, chg: "+2.14%", dir: btcDir },
              { pair: "ETH/USDT", price: ethPrice, chg: "+0.87%", dir: "up" },
              { pair: "SOL/USDT", price: solPrice, chg: "-1.23%", dir: "down" },
              { pair: "BNB/USDT", price: 621.5, chg: "+0.44%", dir: "up" },
            ].map((r) => (
              <div key={r.pair} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02]">
                <span className="text-xs font-mono-trade text-foreground">{r.pair}</span>
                <span className={`text-sm font-mono-trade font-medium ${r.dir === "up" ? "text-green" : "text-red"}`}>
                  {r.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <span className={`text-xs font-mono-trade ${r.chg.startsWith("+") ? "text-green" : "text-red"}`}>{r.chg}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2 panel p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono-trade font-medium">BTC/USDT</span>
              <span className={`text-lg font-mono-trade font-bold ${btcDir === "up" ? "text-green" : "text-red"}`}>
                ${btcPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-xs font-mono-trade text-green bg-green/10 px-2 py-0.5 rounded">+2.14%</span>
          </div>
          <div className="h-[180px] p-2">
            <CandleChart candles={candles} />
          </div>
        </div>
      </div>
      <div className="panel p-0">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest">Active Orders</span>
          <button className="text-xs text-green font-mono-trade hover:underline">View All</button>
        </div>
        <table className="w-full text-xs font-mono-trade">
          <thead>
            <tr className="border-b border-border">
              {["Pair", "Type", "Side", "Price", "Amount", "Filled", "Status"].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-muted-foreground font-normal uppercase tracking-wider text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              { pair: "BTC/USDT", type: "Limit", side: "BUY", price: "66,800.00", amount: "0.5000", filled: "0.2341", status: "Partial" },
              { pair: "ETH/USDT", type: "Market", side: "SELL", price: "3,540.20", amount: "2.0000", filled: "2.0000", status: "Filled" },
              { pair: "SOL/USDT", type: "Limit", side: "BUY", price: "182.50", amount: "10.000", filled: "0.0000", status: "Open" },
            ].map((o, i) => (
              <tr key={i} className="hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 text-foreground">{o.pair}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{o.type}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${o.side === "BUY" ? "bg-green/10 text-green" : "bg-red/10 text-red"}`}>{o.side}</span>
                </td>
                <td className="px-4 py-2.5 text-foreground">{o.price}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{o.amount}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{o.filled}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    o.status === "Filled" ? "bg-green/10 text-green" :
                    o.status === "Partial" ? "bg-yellow-500/10 text-yellow-400" :
                    "bg-muted text-muted-foreground"
                  }`}>{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Charts({ btcPrice, btcDir }: { btcPrice: number; btcDir: string }) {
  const [tf, setTf] = useState("1H");
  const [pair, setPair] = useState("BTC/USDT");
  const candles = useFakeCandles(80);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="panel p-0">
        <div className="px-4 py-3 border-b border-border flex items-center gap-4 flex-wrap">
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            className="bg-secondary border border-border text-sm font-mono-trade text-foreground px-2 py-1 rounded focus:outline-none"
          >
            {PAIRS.map((p) => <option key={p}>{p}</option>)}
          </select>
          {["1M", "5M", "15M", "1H", "4H", "1D", "1W"].map((t) => (
            <button key={t} onClick={() => setTf(t)} className={`text-xs font-mono-trade px-2 py-1 rounded transition-colors ${tf === t ? "bg-green/10 text-green" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <span className={`text-2xl font-mono-trade font-bold ${btcDir === "up" ? "text-green" : "text-red"}`}>
              ${btcPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-mono-trade text-green bg-green/10 px-2 py-0.5 rounded">+2.14% (24h)</span>
          </div>
        </div>
        <div className="h-[340px] p-3">
          <CandleChart candles={candles} />
        </div>
        <div className="h-[60px] px-3 pb-3 flex items-end gap-[1px]">
          {candles.map((c, i) => {
            const vol = Math.random() * 100;
            const bull = c.c >= c.o;
            return (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${20 + vol * 0.4}px`, background: bull ? "hsl(152 80% 48% / 0.4)" : "hsl(0 72% 55% / 0.4)" }} />
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "24h High", value: "$68,420" },
          { label: "24h Low", value: "$64,810" },
          { label: "24h Volume", value: "24,831 BTC" },
          { label: "Market Cap", value: "$1.32T" },
        ].map((s) => (
          <div key={s.label} className="panel px-4 py-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono-trade mb-1">{s.label}</div>
            <div className="text-sm font-mono-trade font-semibold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Trading({ btcPrice, btcDir }: { btcPrice: number; btcDir: string }) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState("Limit");
  const [amount, setAmount] = useState("0.1");
  const [price, setPrice] = useState("");
  const book = useOrderBook(btcPrice);
  const candles = useFakeCandles(60);
  const maxBidSize = book.bids.length ? Math.max(...book.bids.map((b) => b[1])) : 1;
  const maxAskSize = book.asks.length ? Math.max(...book.asks.map((a) => a[1])) : 1;

  return (
    <div className="grid grid-cols-3 gap-3 animate-fade-in">
      <div className="col-span-2 space-y-3">
        <div className="panel p-0">
          <div className="px-4 py-3 border-b border-border flex items-center gap-4">
            <span className="text-sm font-mono-trade font-semibold">BTC/USDT</span>
            <span className={`text-xl font-mono-trade font-bold ${btcDir === "up" ? "text-green" : "text-red"}`}>
              ${btcPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
            <div className="ml-auto flex gap-4 text-xs font-mono-trade text-muted-foreground">
              <span>H: <span className="text-foreground">$68,420</span></span>
              <span>L: <span className="text-foreground">$64,810</span></span>
              <span>Vol: <span className="text-foreground">24,831 BTC</span></span>
            </div>
          </div>
          <div className="h-[260px] p-3">
            <CandleChart candles={candles} />
          </div>
        </div>
        <div className="panel p-0">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest">Order Book</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border">
            <div>
              <div className="px-2 py-1.5 border-b border-border grid grid-cols-3 text-[10px] text-muted-foreground font-mono-trade uppercase tracking-wider">
                <span>Bid Price</span><span className="text-right">Size</span><span className="text-right">Total</span>
              </div>
              {book.bids.map((b, i) => <OrderBookRow key={i} price={b[0]} size={b[1]} side="bid" maxSize={maxBidSize} />)}
            </div>
            <div>
              <div className="px-2 py-1.5 border-b border-border grid grid-cols-3 text-[10px] text-muted-foreground font-mono-trade uppercase tracking-wider">
                <span>Ask Price</span><span className="text-right">Size</span><span className="text-right">Total</span>
              </div>
              {book.asks.map((a, i) => <OrderBookRow key={i} price={a[0]} size={a[1]} side="ask" maxSize={maxAskSize} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="panel p-4 space-y-4">
          <div className="flex rounded overflow-hidden border border-border">
            <button onClick={() => setSide("buy")} className={`flex-1 py-2 text-sm font-mono-trade font-semibold transition-colors ${side === "buy" ? "bg-green text-black" : "text-muted-foreground hover:text-foreground"}`}>BUY</button>
            <button onClick={() => setSide("sell")} className={`flex-1 py-2 text-sm font-mono-trade font-semibold transition-colors ${side === "sell" ? "bg-red text-white" : "text-muted-foreground hover:text-foreground"}`}>SELL</button>
          </div>
          <div className="flex gap-1">
            {["Limit", "Market", "Stop"].map((t) => (
              <button key={t} onClick={() => setOrderType(t)} className={`flex-1 text-xs py-1 rounded font-mono-trade transition-colors ${orderType === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
            ))}
          </div>
          <div className="space-y-2">
            {orderType !== "Market" && (
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono-trade block mb-1">Price (USDT)</label>
                <div className="relative">
                  <input value={price || btcPrice.toFixed(2)} onChange={(e) => setPrice(e.target.value)} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono-trade text-foreground focus:outline-none focus:border-green/50" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono-trade">USDT</span>
                </div>
              </div>
            )}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono-trade block mb-1">Amount (BTC)</label>
              <div className="relative">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono-trade text-foreground focus:outline-none focus:border-green/50" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono-trade">BTC</span>
              </div>
            </div>
            <div className="flex gap-1 pt-1">
              {["25%", "50%", "75%", "100%"].map((p) => (
                <button key={p} className="flex-1 text-[10px] font-mono-trade py-1 rounded bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">{p}</button>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-1.5">
              <div className="flex justify-between text-xs font-mono-trade">
                <span className="text-muted-foreground">Total</span>
                <span className="text-foreground">${(parseFloat(amount || "0") * btcPrice).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs font-mono-trade">
                <span className="text-muted-foreground">Fee (0.1%)</span>
                <span className="text-foreground">${(parseFloat(amount || "0") * btcPrice * 0.001).toFixed(2)}</span>
              </div>
            </div>
            <button className={`w-full py-3 rounded text-sm font-mono-trade font-bold transition-all hover:opacity-90 active:scale-[0.99] ${side === "buy" ? "bg-green text-black" : "bg-red text-white"}`}>
              {side === "buy" ? "BUY BTC" : "SELL BTC"}
            </button>
          </div>
        </div>
        <div className="panel p-4">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono-trade mb-3">Available Balance</div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono-trade"><span className="text-muted-foreground">USDT</span><span className="text-foreground">128,450.00</span></div>
            <div className="flex justify-between text-xs font-mono-trade"><span className="text-muted-foreground">BTC</span><span className="text-foreground">1.24830</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Portfolio() {
  const positions = [
    { asset: "BTC", amount: "1.2483", entry: "$64,200", current: "$67,420", pnl: "+$4,015", pct: "+4.97%", value: "$84,112", dir: "up" },
    { asset: "ETH", amount: "12.500", entry: "$3,480", current: "$3,540", pnl: "+$750", pct: "+1.72%", value: "$44,250", dir: "up" },
    { asset: "SOL", amount: "250.00", entry: "$190", current: "$185", pnl: "-$1,250", pct: "-2.63%", value: "$46,250", dir: "down" },
    { asset: "BNB", amount: "45.00", entry: "$610", current: "$621", pnl: "+$495", pct: "+1.80%", value: "$27,945", dir: "up" },
  ];
  const allocation = [
    { asset: "BTC", pct: 42, color: "hsl(43,96%,56%)" },
    { asset: "ETH", pct: 22, color: "hsl(210,100%,60%)" },
    { asset: "SOL", pct: 23, color: "hsl(280,80%,60%)" },
    { asset: "BNB", pct: 13, color: "hsl(186,100%,50%)" },
  ];
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Value" value="$284,720" change="+$6,512 today" icon="Wallet" />
        <StatCard label="Total P&L" value="+$14,230" change="+5.26%" icon="TrendingUp" />
        <StatCard label="Unrealized" value="+$4,010" change="+1.43%" icon="Activity" />
        <StatCard label="Assets" value="4" icon="Layers" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 panel p-0">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest">Open Positions</span>
          </div>
          <table className="w-full text-xs font-mono-trade">
            <thead>
              <tr className="border-b border-border">
                {["Asset", "Amount", "Entry Price", "Current", "Value", "P&L", "%"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-muted-foreground font-normal uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {positions.map((p) => (
                <tr key={p.asset} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-semibold text-foreground">{p.asset}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.amount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.entry}</td>
                  <td className="px-4 py-3 text-foreground">{p.current}</td>
                  <td className="px-4 py-3 text-foreground">{p.value}</td>
                  <td className={`px-4 py-3 ${p.dir === "up" ? "text-green" : "text-red"}`}>{p.pnl}</td>
                  <td className={`px-4 py-3 ${p.dir === "up" ? "text-green" : "text-red"}`}>{p.pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel p-4">
          <div className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest mb-4">Allocation</div>
          <div className="space-y-3">
            {allocation.map((a) => (
              <div key={a.asset}>
                <div className="flex justify-between text-xs font-mono-trade mb-1">
                  <span className="text-foreground">{a.asset}</span>
                  <span className="text-muted-foreground">{a.pct}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: a.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-xs font-mono-trade"><span className="text-muted-foreground">Margin Used</span><span className="text-foreground">$42,700</span></div>
            <div className="flex justify-between text-xs font-mono-trade"><span className="text-muted-foreground">Free Margin</span><span className="text-green">$86,320</span></div>
            <div className="h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
              <div className="h-full rounded-full bg-green" style={{ width: "33%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Alerts() {
  const alerts = [
    { id: 1, pair: "BTC/USDT", type: "Price Above", value: "$70,000", status: "active", created: "2026-05-14 10:30" },
    { id: 2, pair: "ETH/USDT", type: "Price Below", value: "$3,400", status: "active", created: "2026-05-14 12:00" },
    { id: 3, pair: "SOL/USDT", type: "% Change", value: "-5%", status: "triggered", created: "2026-05-13 09:00" },
    { id: 4, pair: "BNB/USDT", type: "Price Above", value: "$650", status: "paused", created: "2026-05-12 15:00" },
  ];
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-mono-trade text-muted-foreground uppercase tracking-widest">Price Alerts</h2>
        <button className="flex items-center gap-1.5 text-xs font-mono-trade text-green border border-green/30 px-3 py-1.5 rounded hover:bg-green/10 transition-colors">
          <Icon name="Plus" size={12} /> New Alert
        </button>
      </div>
      <div className="panel p-0">
        <table className="w-full text-xs font-mono-trade">
          <thead>
            <tr className="border-b border-border">
              {["Pair", "Condition", "Target", "Status", "Created", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-muted-foreground font-normal uppercase tracking-wider text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {alerts.map((a) => (
              <tr key={a.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-foreground">{a.pair}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.type}</td>
                <td className="px-4 py-3 text-foreground">{a.value}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    a.status === "active" ? "bg-green/10 text-green" :
                    a.status === "triggered" ? "bg-blue-500/10 text-blue-400" :
                    "bg-muted text-muted-foreground"
                  }`}>{a.status.toUpperCase()}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{a.created}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="text-muted-foreground hover:text-foreground"><Icon name="Edit2" size={12} /></button>
                    <button className="text-muted-foreground hover:text-red"><Icon name="Trash2" size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function History() {
  const trades = [
    { time: "2026-05-15 14:22", pair: "BTC/USDT", side: "BUY", type: "Limit", price: "$66,800", amount: "0.5000", fee: "$33.40", pnl: "+$310", status: "Filled" },
    { time: "2026-05-15 11:05", pair: "ETH/USDT", side: "SELL", type: "Market", price: "$3,540", amount: "2.0000", fee: "$7.08", pnl: "+$120", status: "Filled" },
    { time: "2026-05-14 18:30", pair: "SOL/USDT", side: "BUY", type: "Limit", price: "$188", amount: "50.000", fee: "$9.40", pnl: "-$150", status: "Filled" },
    { time: "2026-05-14 09:15", pair: "BNB/USDT", side: "BUY", type: "Market", price: "$612", amount: "10.000", fee: "$6.12", pnl: "+$90", status: "Filled" },
    { time: "2026-05-13 21:40", pair: "BTC/USDT", side: "SELL", type: "Limit", price: "$65,200", amount: "0.2500", fee: "$16.30", pnl: "+$850", status: "Filled" },
  ];
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Trades" value="284" icon="Hash" />
        <StatCard label="Total Volume" value="$4.2M" icon="BarChart" />
        <StatCard label="Total Fees" value="$4,210" icon="DollarSign" />
        <StatCard label="Realized P&L" value="+$24,810" change="+$1,120 today" icon="TrendingUp" />
      </div>
      <div className="panel p-0">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest">Trade History</span>
          <div className="flex gap-2">
            <select className="bg-secondary border border-border text-xs font-mono-trade text-foreground px-2 py-1 rounded focus:outline-none">
              {PAIRS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <button className="text-xs text-muted-foreground font-mono-trade border border-border px-2 py-1 rounded hover:text-foreground transition-colors flex items-center gap-1">
              <Icon name="Download" size={11} /> Export
            </button>
          </div>
        </div>
        <table className="w-full text-xs font-mono-trade">
          <thead>
            <tr className="border-b border-border">
              {["Time", "Pair", "Side", "Type", "Price", "Amount", "Fee", "P&L", "Status"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-muted-foreground font-normal uppercase tracking-wider text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trades.map((t, i) => (
              <tr key={i} className="hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 text-muted-foreground">{t.time}</td>
                <td className="px-4 py-2.5 text-foreground">{t.pair}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.side === "BUY" ? "bg-green/10 text-green" : "bg-red/10 text-red"}`}>{t.side}</span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{t.type}</td>
                <td className="px-4 py-2.5 text-foreground">{t.price}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{t.amount}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{t.fee}</td>
                <td className={`px-4 py-2.5 ${t.pnl.startsWith("+") ? "text-green" : "text-red"}`}>{t.pnl}</td>
                <td className="px-4 py-2.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green/10 text-green">{t.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Analytics() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May"];
  const pnlData = [12400, -3200, 18700, 8900, 14200];
  const maxAbs = Math.max(...pnlData.map(Math.abs));
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Sharpe Ratio" value="2.14" change="+0.3 vs last month" icon="Activity" />
        <StatCard label="Max Drawdown" value="-8.4%" icon="TrendingDown" />
        <StatCard label="Avg Trade" value="+$87.4" change="+12% vs last month" icon="BarChart2" />
        <StatCard label="Best Day" value="+$4,820" change="May 12" icon="Star" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="panel p-4">
          <div className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest mb-4">Monthly P&L</div>
          <div className="flex items-end gap-2 h-40">
            {pnlData.map((v, i) => {
              const h = (Math.abs(v) / maxAbs) * 100;
              const pos = v >= 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 justify-end h-full">
                  <div className={`text-[10px] font-mono-trade ${pos ? "text-green" : "text-red"}`}>${(v / 1000).toFixed(1)}k</div>
                  <div className="w-full rounded-t" style={{ height: `${h}%`, background: pos ? "hsl(152 80% 48% / 0.6)" : "hsl(0 72% 55% / 0.6)" }} />
                  <div className="text-[10px] text-muted-foreground font-mono-trade">{months[i]}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel p-4">
          <div className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest mb-4">Performance Metrics</div>
          <div className="space-y-3">
            {[
              { label: "Win Rate", value: "68.4%", bar: 68, color: "hsl(152,80%,48%)" },
              { label: "Profit Factor", value: "2.31", bar: 77, color: "hsl(210,100%,60%)" },
              { label: "Avg Win/Loss", value: "1.84", bar: 62, color: "hsl(43,96%,56%)" },
              { label: "Expectancy", value: "$87.4", bar: 54, color: "hsl(186,100%,50%)" },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-xs font-mono-trade mb-1">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className="text-foreground">{m.value}</span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${m.bar}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="panel p-4">
        <div className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest mb-3">Top Performing Pairs</div>
        <div className="grid grid-cols-5 gap-3">
          {[
            { pair: "BTC/USDT", pnl: "+$14,200", trades: 42, wr: "71%" },
            { pair: "ETH/USDT", pnl: "+$6,800", trades: 38, wr: "66%" },
            { pair: "SOL/USDT", pnl: "+$3,100", trades: 61, wr: "62%" },
            { pair: "BNB/USDT", pnl: "+$1,900", trades: 24, wr: "75%" },
            { pair: "XRP/USDT", pnl: "-$210", trades: 18, wr: "44%" },
          ].map((p) => (
            <div key={p.pair} className="bg-secondary rounded p-3">
              <div className="text-xs font-mono-trade font-semibold text-foreground mb-2">{p.pair}</div>
              <div className={`text-sm font-mono-trade font-bold mb-1 ${p.pnl.startsWith("+") ? "text-green" : "text-red"}`}>{p.pnl}</div>
              <div className="text-[10px] text-muted-foreground font-mono-trade">{p.trades} trades · WR {p.wr}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type Strategy = { id: string; name: string; description: string; params: Record<string, string> };

const DEFAULT_STRATEGIES: Strategy[] = [
  { id: "grid", name: "Grid Trading", description: "Places buy/sell orders at regular intervals within a price range", params: { gridLevels: "10", gridSpacing: "0.5", upperBound: "70000", lowerBound: "60000" } },
  { id: "dca", name: "DCA (Dollar Cost Average)", description: "Buys at fixed intervals regardless of price", params: { interval: "4h", buyAmount: "100", maxBuys: "20" } },
  { id: "momentum", name: "Momentum", description: "Follows trend breakouts using RSI and MACD signals", params: { rsiPeriod: "14", rsiOverbought: "70", rsiOversold: "30", macdFast: "12", macdSlow: "26" } },
  { id: "arb", name: "Arbitrage", description: "Exploits price differences across exchanges", params: { minSpread: "0.3", maxLatency: "100" } },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className={`w-10 h-5 rounded-full relative transition-colors ${value ? "bg-green" : "bg-secondary"}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function Settings() {
  const [botEnabled, setBotEnabled] = useState(true);
  const [riskPct, setRiskPct] = useState("2");
  const [maxPos, setMaxPos] = useState("5");
  const [stopLoss, setStopLoss] = useState("3");
  const [takeProfit, setTakeProfit] = useState("6");
  const [activeStrategy, setActiveStrategy] = useState("grid");
  const [strategies, setStrategies] = useState<Strategy[]>(DEFAULT_STRATEGIES);
  const [editingStrategy, setEditingStrategy] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({ email: true, telegram: false, sound: true });
  const [trailingStop, setTrailingStop] = useState(false);
  const [paperMode, setPaperMode] = useState(false);

  const currentStrategy = strategies.find((s) => s.id === activeStrategy)!;

  const updateParam = (stratId: string, key: string, val: string) => {
    setStrategies((prev) =>
      prev.map((s) => s.id === stratId ? { ...s, params: { ...s.params, [key]: val } } : s)
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-4">
        {/* Left column: Bot control + Risk */}
        <div className="space-y-4">
          <div className="panel p-5 space-y-4">
            <div className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest">Bot Control</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-mono-trade text-foreground">Auto Trading</div>
                <div className="text-xs text-muted-foreground mt-0.5">Live order execution</div>
              </div>
              <Toggle value={botEnabled} onChange={setBotEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-mono-trade text-foreground">Paper Mode</div>
                <div className="text-xs text-muted-foreground mt-0.5">Simulate without real funds</div>
              </div>
              <Toggle value={paperMode} onChange={setPaperMode} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-mono-trade text-foreground">Trailing Stop</div>
                <div className="text-xs text-muted-foreground mt-0.5">Dynamic stop loss adjustment</div>
              </div>
              <Toggle value={trailingStop} onChange={setTrailingStop} />
            </div>
          </div>

          <div className="panel p-5 space-y-3">
            <div className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest">Risk Management</div>
            {[
              { label: "Risk Per Trade (%)", value: riskPct, set: setRiskPct },
              { label: "Max Open Positions", value: maxPos, set: setMaxPos },
              { label: "Stop Loss (%)", value: stopLoss, set: setStopLoss },
              { label: "Take Profit (%)", value: takeProfit, set: setTakeProfit },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono-trade block mb-1">{f.label}</label>
                <input
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono-trade text-foreground focus:outline-none focus:border-green/50"
                />
              </div>
            ))}
          </div>

          <div className="panel p-5 space-y-3">
            <div className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest">Notifications</div>
            {[
              { label: "Email Alerts", key: "email" as const },
              { label: "Telegram Bot", key: "telegram" as const },
              { label: "Sound Alerts", key: "sound" as const },
            ].map((n) => (
              <div key={n.key} className="flex items-center justify-between">
                <span className="text-sm font-mono-trade text-foreground">{n.label}</span>
                <Toggle value={notifications[n.key]} onChange={(v) => setNotifications((prev) => ({ ...prev, [n.key]: v }))} />
              </div>
            ))}
          </div>
        </div>

        {/* Center + Right: Strategy editor */}
        <div className="col-span-2 space-y-4">
          <div className="panel p-0">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest">Trading Strategy</span>
              <div className={`flex items-center gap-1.5 text-xs font-mono-trade ${botEnabled ? "text-green" : "text-muted-foreground"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${botEnabled ? "bg-green animate-pulse" : "bg-muted-foreground"}`} />
                {botEnabled ? "RUNNING" : "STOPPED"}
              </div>
            </div>

            {/* Strategy selector tabs */}
            <div className="flex border-b border-border">
              {strategies.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setActiveStrategy(s.id); setEditingStrategy(null); }}
                  className={`px-4 py-2.5 text-xs font-mono-trade transition-colors border-b-2 -mb-px ${
                    activeStrategy === s.id
                      ? "border-green text-green"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>

            {/* Strategy description + active indicator */}
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-mono-trade">{currentStrategy.description}</p>
              <button
                onClick={() => setEditingStrategy(editingStrategy === activeStrategy ? null : activeStrategy)}
                className="text-xs font-mono-trade text-green border border-green/30 px-3 py-1 rounded hover:bg-green/10 transition-colors flex items-center gap-1.5"
              >
                <Icon name={editingStrategy === activeStrategy ? "Check" : "Edit2"} size={11} />
                {editingStrategy === activeStrategy ? "Done" : "Edit Parameters"}
              </button>
            </div>

            {/* Parameters */}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(currentStrategy.params).map(([key, val]) => {
                  const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                  return (
                    <div key={key}>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono-trade block mb-1">{label}</label>
                      <input
                        value={val}
                        disabled={editingStrategy !== activeStrategy}
                        onChange={(e) => updateParam(activeStrategy, key, e.target.value)}
                        className={`w-full bg-secondary border rounded px-3 py-2 text-sm font-mono-trade text-foreground focus:outline-none transition-colors ${
                          editingStrategy === activeStrategy
                            ? "border-green/50 focus:border-green"
                            : "border-border opacity-60 cursor-not-allowed"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {editingStrategy === activeStrategy && (
                <div className="mt-4 pt-4 border-t border-border flex gap-2">
                  <button
                    onClick={() => setEditingStrategy(null)}
                    className="px-4 py-2 text-xs font-mono-trade bg-green text-black rounded font-bold hover:opacity-90 transition-opacity"
                  >
                    Save & Apply
                  </button>
                  <button
                    onClick={() => { setStrategies(DEFAULT_STRATEGIES); setEditingStrategy(null); }}
                    className="px-4 py-2 text-xs font-mono-trade border border-border text-muted-foreground rounded hover:text-foreground transition-colors"
                  >
                    Reset to Default
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Strategy preview card */}
          <div className="panel p-5">
            <div className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest mb-3">Active Strategy Summary</div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Strategy", value: currentStrategy.name },
                { label: "Risk/Trade", value: `${riskPct}%` },
                { label: "Stop Loss", value: `${stopLoss}%` },
                { label: "Take Profit", value: `${takeProfit}%` },
              ].map((s) => (
                <div key={s.label} className="bg-secondary rounded p-3">
                  <div className="text-[10px] text-muted-foreground font-mono-trade uppercase tracking-wider mb-1">{s.label}</div>
                  <div className="text-sm font-mono-trade font-semibold text-foreground">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className={`text-[10px] px-2 py-0.5 rounded font-mono-trade font-semibold ${botEnabled ? "bg-green/10 text-green" : "bg-muted text-muted-foreground"}`}>
                {botEnabled ? (paperMode ? "● PAPER TRADING" : "● LIVE TRADING") : "○ STOPPED"}
              </div>
              {trailingStop && <div className="text-[10px] px-2 py-0.5 rounded font-mono-trade bg-blue-500/10 text-blue-400">TRAILING STOP ON</div>}
              {paperMode && <div className="text-[10px] px-2 py-0.5 rounded font-mono-trade bg-yellow-500/10 text-yellow-400">PAPER MODE</div>}
            </div>
          </div>

          {/* API Keys */}
          <div className="panel p-5">
            <div className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest mb-4">Exchange Connections</div>
            <div className="space-y-2">
              {["Binance", "Bybit"].map((ex) => (
                <div key={ex} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm font-mono-trade text-foreground">{ex}</div>
                    <div className="text-xs text-muted-foreground font-mono-trade">••••••••••••••••••••••••</div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-green/10 text-green font-mono-trade">Connected</span>
                    <button className="text-xs text-muted-foreground hover:text-foreground font-mono-trade border border-border px-2 py-0.5 rounded transition-colors">Edit</button>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-3 text-xs text-green font-mono-trade border border-green/30 px-3 py-1.5 rounded hover:bg-green/10 transition-colors flex items-center gap-1">
              <Icon name="Plus" size={12} /> Add Exchange
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BotSetup() {
  const [saved, setSaved] = useState(false);

  const [exchange, setExchange] = useState("Binance");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");

  const [pair, setPair] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [capital, setCapital] = useState("1000");
  const [capitalPct, setCapitalPct] = useState(false);

  // Candle signal setup — slot A & B
  const [candleA, setCandleA] = useState("bullish_engulfing");
  const [candleB, setCandleB] = useState("hammer");
  const [signalLogic, setSignalLogic] = useState<"AND" | "OR">("AND");
  const [signalLookback, setSignalLookback] = useState("3");

  // Bot behavior
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitOffset, setLimitOffset] = useState("0.1");
  const [positionSize, setPositionSize] = useState("100");
  const [stopLoss, setStopLoss] = useState("2");
  const [takeProfit, setTakeProfit] = useState("4");
  const [trailingStop, setTrailingStop] = useState(false);
  const [trailingPct, setTrailingPct] = useState("0.5");
  const [maxOpenTrades, setMaxOpenTrades] = useState("3");
  const [reentryEnabled, setReentryEnabled] = useState(false);
  const [reentryCooldown, setReentryCooldown] = useState("5");
  const [paperMode, setPaperMode] = useState(true);
  const [direction, setDirection] = useState<"long" | "short" | "both">("long");

  const testConnection = () => {
    setTestStatus("testing");
    setTimeout(() => setTestStatus(apiKey.length > 4 ? "ok" : "fail"), 1800);
  };

  const inp = "w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono-trade text-foreground focus:outline-none focus:border-green/50 transition-colors";
  const lbl = "text-[10px] text-muted-foreground uppercase tracking-widest font-mono-trade block mb-1";

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${on ? "bg-green" : "bg-secondary border border-border"}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );

  const SectionTitle = ({ title, sub }: { title: string; sub?: string }) => (
    <div className="mb-4">
      <div className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest">{title}</div>
      {sub && <div className="text-[10px] text-muted-foreground/60 font-mono-trade mt-0.5">{sub}</div>}
    </div>
  );

  const CANDLE_PATTERNS = [
    { id: "bullish_engulfing", label: "Bullish Engulfing", dir: "bull" },
    { id: "bearish_engulfing", label: "Bearish Engulfing", dir: "bear" },
    { id: "hammer", label: "Hammer", dir: "bull" },
    { id: "shooting_star", label: "Shooting Star", dir: "bear" },
    { id: "doji", label: "Doji", dir: "neutral" },
    { id: "morning_star", label: "Morning Star", dir: "bull" },
    { id: "evening_star", label: "Evening Star", dir: "bear" },
    { id: "three_white_soldiers", label: "3 White Soldiers", dir: "bull" },
    { id: "three_black_crows", label: "3 Black Crows", dir: "bear" },
    { id: "piercing_line", label: "Piercing Line", dir: "bull" },
    { id: "dark_cloud_cover", label: "Dark Cloud Cover", dir: "bear" },
    { id: "spinning_top", label: "Spinning Top", dir: "neutral" },
  ];

  const dirColor = (d: string) =>
    d === "bull" ? "text-green" : d === "bear" ? "text-red" : "text-yellow-400";

  const CandleSlot = ({
    label, value, onChange,
  }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div className="flex-1 panel p-4">
      <div className="text-[10px] text-muted-foreground font-mono-trade uppercase tracking-widest mb-3">{label}</div>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
        {CANDLE_PATTERNS.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-all ${
              value === p.id
                ? "bg-green/10 border border-green/40"
                : "border border-transparent hover:bg-secondary"
            }`}
          >
            <span className={`text-xs font-mono-trade ${value === p.id ? "text-green font-semibold" : "text-foreground"}`}>{p.label}</span>
            <span className={`text-[10px] font-mono-trade uppercase ${dirColor(p.dir)}`}>{p.dir}</span>
          </button>
        ))}
      </div>
      {value && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green" />
          <span className="text-[10px] font-mono-trade text-green">
            {CANDLE_PATTERNS.find((p) => p.id === value)?.label}
          </span>
        </div>
      )}
    </div>
  );

  if (saved) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-14 h-14 rounded-full bg-green/10 border border-green/30 flex items-center justify-center">
          <Icon name="Check" size={28} className="text-green" />
        </div>
        <div className="text-lg font-mono-trade font-bold text-foreground">Bot Active!</div>
        <div className="text-xs font-mono-trade text-muted-foreground text-center max-w-sm">
          Configuration saved. {paperMode ? "Running in paper mode — no real orders." : "Live trading is ON."}<br />
          Monitor performance from the Dashboard.
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => setSaved(false)} className="text-xs font-mono-trade border border-border text-muted-foreground px-4 py-2 rounded hover:text-foreground transition-colors flex items-center gap-1.5">
            <Icon name="Pencil" size={12} /> Edit Config
          </button>
          <button className="text-xs font-mono-trade bg-green text-black font-bold px-4 py-2 rounded hover:opacity-90 transition-opacity">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-mono-trade font-bold text-foreground">Bot Configuration</div>
          <div className="text-[10px] text-muted-foreground font-mono-trade mt-0.5">All settings are editable inline — changes take effect on next Save.</div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-[10px] px-2 py-1 rounded font-mono-trade font-semibold ${paperMode ? "bg-yellow-500/10 text-yellow-400" : "bg-green/10 text-green"}`}>
            {paperMode ? "● PAPER MODE" : "● LIVE"}
          </div>
          <button
            onClick={() => setSaved(true)}
            className="flex items-center gap-1.5 text-xs font-mono-trade bg-green text-black font-bold px-4 py-2 rounded hover:opacity-90 transition-opacity"
          >
            <Icon name="Save" size={12} /> Save & Apply
          </button>
        </div>
      </div>

      {/* Row 1: Exchange + Market */}
      <div className="grid grid-cols-2 gap-4">
        {/* Exchange */}
        <div className="panel p-4">
          <SectionTitle title="Exchange" />
          <div className="grid grid-cols-2 gap-2 mb-3">
            {["Binance", "Bybit", "OKX", "Kraken"].map((ex) => (
              <button key={ex} onClick={() => { setExchange(ex); setTestStatus("idle"); }}
                className={`py-2 text-xs font-mono-trade rounded border transition-colors ${exchange === ex ? "border-green bg-green/10 text-green" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {ex}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <label className={lbl}>API Key</label>
              <input value={apiKey} onChange={(e) => { setApiKey(e.target.value); setTestStatus("idle"); }} placeholder="Paste API key" className={inp} />
            </div>
            <div>
              <label className={lbl}>API Secret</label>
              <div className="relative">
                <input type={showSecret ? "text" : "password"} value={apiSecret}
                  onChange={(e) => { setApiSecret(e.target.value); setTestStatus("idle"); }}
                  placeholder="Paste API secret" className={inp + " pr-9"} />
                <button onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Icon name={showSecret ? "EyeOff" : "Eye"} size={13} />
                </button>
              </div>
            </div>
            <button onClick={testConnection} disabled={!apiKey || testStatus === "testing"}
              className="w-full py-2 text-xs font-mono-trade border border-border rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
              {testStatus === "testing" && <Icon name="Loader" size={11} className="animate-spin" />}
              {testStatus === "testing" ? "Testing…" : "Test Connection"}
            </button>
            {testStatus === "ok" && <div className="flex items-center gap-1.5 text-xs font-mono-trade text-green"><Icon name="CheckCircle" size={12} /> Connected</div>}
            {testStatus === "fail" && <div className="flex items-center gap-1.5 text-xs font-mono-trade text-red"><Icon name="XCircle" size={12} /> Failed — check keys</div>}
          </div>
        </div>

        {/* Market */}
        <div className="panel p-4">
          <SectionTitle title="Market" />
          <div className="space-y-3">
            <div>
              <label className={lbl}>Trading Pair</label>
              <div className="grid grid-cols-3 gap-1.5">
                {PAIRS.map((p) => (
                  <button key={p} onClick={() => setPair(p)}
                    className={`py-1.5 text-xs font-mono-trade rounded border transition-colors ${pair === p ? "border-green bg-green/10 text-green" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={lbl}>Timeframe</label>
              <div className="grid grid-cols-5 gap-1.5">
                {["1m","5m","15m","1h","4h"].map((tf) => (
                  <button key={tf} onClick={() => setTimeframe(tf)}
                    className={`py-1.5 text-xs font-mono-trade rounded border transition-colors ${timeframe === tf ? "border-green bg-green/10 text-green" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={lbl}>Capital</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input value={capital} onChange={(e) => setCapital(e.target.value)} className={inp + " pr-14"} placeholder="1000" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono-trade text-muted-foreground">{capitalPct ? "%" : "USDT"}</span>
                </div>
                <button onClick={() => setCapitalPct(!capitalPct)}
                  className={`px-3 text-xs font-mono-trade border rounded transition-colors ${capitalPct ? "border-green bg-green/10 text-green" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  %
                </button>
              </div>
            </div>
            <div>
              <label className={lbl}>Direction</label>
              <div className="flex gap-2">
                {(["long","short","both"] as const).map((d) => (
                  <button key={d} onClick={() => setDirection(d)}
                    className={`flex-1 py-1.5 text-xs font-mono-trade rounded border capitalize transition-colors ${direction === d ? "border-green bg-green/10 text-green" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Candle Signal Setup */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle title="Candle Signal Setup" sub="Bot enters a trade when the selected pattern(s) are detected" />
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-mono-trade text-muted-foreground">Logic:</span>
            {(["AND","OR"] as const).map((l) => (
              <button key={l} onClick={() => setSignalLogic(l)}
                className={`px-3 py-1 text-xs font-mono-trade rounded border transition-colors ${signalLogic === l ? "border-green bg-green/10 text-green" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {l}
              </button>
            ))}
            <div className="ml-3">
              <label className={lbl + " mb-0 inline mr-2"}>Lookback candles</label>
              <input value={signalLookback} onChange={(e) => setSignalLookback(e.target.value)}
                className="w-14 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono-trade text-foreground focus:outline-none focus:border-green/50" />
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <CandleSlot label="Signal A — Primary" value={candleA} onChange={setCandleA} />
          <div className="flex flex-col items-center justify-center gap-1 shrink-0">
            <div className="w-px h-full bg-border" />
            <div className={`text-xs font-mono-trade font-bold px-2 py-1 rounded border ${signalLogic === "AND" ? "border-green/40 text-green bg-green/10" : "border-yellow-500/40 text-yellow-400 bg-yellow-500/10"}`}>{signalLogic}</div>
            <div className="w-px h-full bg-border" />
          </div>
          <CandleSlot label="Signal B — Confirmation" value={candleB} onChange={setCandleB} />
        </div>
        <div className="mt-3 p-3 bg-secondary/50 rounded flex items-center gap-2 text-[10px] font-mono-trade text-muted-foreground">
          <Icon name="Info" size={11} />
          Bot will enter when <span className="text-foreground mx-1">{CANDLE_PATTERNS.find(p=>p.id===candleA)?.label}</span>
          <span className="text-green font-semibold">{signalLogic}</span>
          <span className="text-foreground mx-1">{CANDLE_PATTERNS.find(p=>p.id===candleB)?.label}</span>
          detected within last <span className="text-foreground mx-1">{signalLookback}</span> candles on <span className="text-foreground ml-1">{pair} · {timeframe}</span>
        </div>
      </div>

      {/* Row 3: Bot Behavior */}
      <div className="grid grid-cols-2 gap-4">
        {/* Order Execution */}
        <div className="panel p-4">
          <SectionTitle title="Order Execution" />
          <div className="space-y-3">
            <div>
              <label className={lbl}>Order Type</label>
              <div className="flex gap-2">
                {(["market","limit"] as const).map((t) => (
                  <button key={t} onClick={() => setOrderType(t)}
                    className={`flex-1 py-2 text-xs font-mono-trade rounded border capitalize transition-colors ${orderType === t ? "border-green bg-green/10 text-green" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {orderType === "limit" && (
              <div>
                <label className={lbl}>Limit Offset (%)</label>
                <input value={limitOffset} onChange={(e) => setLimitOffset(e.target.value)} className={inp} placeholder="0.1" />
                <p className="text-[10px] text-muted-foreground font-mono-trade mt-1">Place limit order this % below market price</p>
              </div>
            )}
            <div>
              <label className={lbl}>Position Size (USDT)</label>
              <input value={positionSize} onChange={(e) => setPositionSize(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Max Open Trades</label>
              <input value={maxOpenTrades} onChange={(e) => setMaxOpenTrades(e.target.value)} className={inp} />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <div className="text-xs font-mono-trade text-foreground">Re-entry after close</div>
                <div className="text-[10px] text-muted-foreground font-mono-trade">Allow re-entering same pair</div>
              </div>
              <Toggle on={reentryEnabled} onToggle={() => setReentryEnabled(!reentryEnabled)} />
            </div>
            {reentryEnabled && (
              <div>
                <label className={lbl}>Re-entry Cooldown (min)</label>
                <input value={reentryCooldown} onChange={(e) => setReentryCooldown(e.target.value)} className={inp} />
              </div>
            )}
          </div>
        </div>

        {/* Risk Management */}
        <div className="panel p-4">
          <SectionTitle title="Risk Management" />
          <div className="space-y-3">
            <div>
              <label className={lbl}>Stop Loss (%)</label>
              <div className="relative">
                <input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className={inp + " pr-6"} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono-trade text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <label className={lbl}>Take Profit (%)</label>
              <div className="relative">
                <input value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} className={inp + " pr-6"} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono-trade text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <div className="text-xs font-mono-trade text-foreground">Trailing Stop Loss</div>
                <div className="text-[10px] text-muted-foreground font-mono-trade">Follows price upward automatically</div>
              </div>
              <Toggle on={trailingStop} onToggle={() => setTrailingStop(!trailingStop)} />
            </div>
            {trailingStop && (
              <div>
                <label className={lbl}>Trailing Distance (%)</label>
                <input value={trailingPct} onChange={(e) => setTrailingPct(e.target.value)} className={inp} />
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <div className="text-xs font-mono-trade text-foreground">Paper Mode</div>
                <div className="text-[10px] text-muted-foreground font-mono-trade">Simulate — no real orders placed</div>
              </div>
              <Toggle on={paperMode} onToggle={() => setPaperMode(!paperMode)} />
            </div>
            {!paperMode && (
              <div className="bg-red/5 border border-red/20 rounded p-3 text-[10px] font-mono-trade text-red">
                ⚠ LIVE — real funds will be used.
              </div>
            )}
            {paperMode && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded p-3 text-[10px] font-mono-trade text-yellow-400">
                Paper mode ON — safe for testing.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between p-4 panel border-green/20">
        <div className="flex gap-2 flex-wrap text-[10px] font-mono-trade">
          <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground">{exchange}</span>
          <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground">{pair} · {timeframe}</span>
          <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground">SL {stopLoss}% / TP {takeProfit}%</span>
          <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground capitalize">{direction}</span>
          {trailingStop && <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">Trailing Stop</span>}
          {paperMode && <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400">Paper</span>}
        </div>
        <button onClick={() => setSaved(true)}
          className="flex items-center gap-1.5 text-xs font-mono-trade bg-green text-black font-bold px-5 py-2 rounded hover:opacity-90 transition-opacity">
          <Icon name="Zap" size={12} /> Save & Apply
        </button>
      </div>
    </div>
  );
}

export default function Index() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { price: btcPrice, dir: btcDir } = useFakePrice(67420, 0.0008);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard btcPrice={btcPrice} btcDir={btcDir} />;
      case "charts": return <Charts btcPrice={btcPrice} btcDir={btcDir} />;
      case "trading": return <Trading btcPrice={btcPrice} btcDir={btcDir} />;
      case "portfolio": return <Portfolio />;
      case "alerts": return <Alerts />;
      case "history": return <History />;
      case "analytics": return <Analytics />;
      case "botsetup": return <BotSetup />;
      case "signals": return <BotSetup />;
      case "settings": return <Settings />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-12 border-b border-border flex items-center px-4 gap-4 shrink-0 bg-background/95">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-6 h-6 rounded bg-green flex items-center justify-center">
            <Icon name="Zap" size={12} className="text-black" />
          </div>
          <span className="text-sm font-mono-trade font-bold text-foreground tracking-tight">QUANTBOT</span>
        </div>
        <div className="flex items-center gap-6 flex-1 overflow-hidden">
          {[
            { pair: "BTC/USDT", price: btcPrice, chg: "+2.14%", up: true },
            { pair: "ETH/USDT", price: 3540.2, chg: "+0.87%", up: true },
            { pair: "SOL/USDT", price: 185.4, chg: "-1.23%", up: false },
            { pair: "BNB/USDT", price: 621.5, chg: "+0.44%", up: true },
          ].map((t) => (
            <div key={t.pair} className="flex items-center gap-2 text-xs font-mono-trade shrink-0">
              <span className="text-muted-foreground">{t.pair}</span>
              <span className={`font-medium ${t.up ? "text-green" : "text-red"}`}>
                {t.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-[10px] ${t.up ? "text-green" : "text-red"}`}>{t.chg}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 ml-auto shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-mono-trade text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            LIVE
          </div>
          <span className="text-xs font-mono-trade text-muted-foreground">
            {time.toLocaleTimeString("en-US", { hour12: false })} UTC
          </span>
          <div className="w-7 h-7 rounded bg-secondary flex items-center justify-center cursor-pointer hover:bg-accent transition-colors">
            <Icon name="User" size={14} className="text-muted-foreground" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <nav className="w-48 border-r border-border shrink-0 py-3 flex flex-col overflow-y-auto bg-background">
          <div className="space-y-0.5 px-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-mono-trade transition-all rounded border-l-2 ${
                  activeTab === item.id
                    ? "border-green bg-green/[0.08] text-green"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                }`}
              >
                <Icon name={item.icon} size={14} />
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-auto px-4 pt-4 pb-3 border-t border-border mx-3 mt-6">
            <div className="text-[10px] font-mono-trade text-muted-foreground mb-1 uppercase tracking-widest">Balance</div>
            <div className="text-sm font-mono-trade text-foreground font-semibold">$284,720</div>
            <div className="text-[10px] font-mono-trade text-green mt-0.5">+$6,512 today</div>
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto p-4 grid-pattern">
          <div className="mb-4 flex items-center gap-2">
            <h1 className="text-xs font-mono-trade text-muted-foreground uppercase tracking-widest">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
            </h1>
            <div className="h-px flex-1 bg-border" />
          </div>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}