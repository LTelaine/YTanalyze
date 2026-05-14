import { useState, useMemo, useCallback, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";

// ── Theme system ──
const themes = {
  dark: {
    bg: "#08080A", card: "#111114", cardAlt: "#16161A", bg2: "#0D0D10",
    border: "#222228", borderLight: "#333338",
    text: "#E8E6DF", textMuted: "#8A8A90", textDim: "#55555A",
    accent: "#E8A630", accentDim: "#A67520",
    red: "#E54D4D", green: "#2EBD5E", blue: "#3B82F6", purple: "#8B5CF6", pink: "#D946A8", teal: "#14B8A6", coral: "#E8734A",
    colors6: ["#E8A630", "#3B82F6", "#E54D4D", "#8B5CF6", "#D946A8", "#14B8A6", "#E8734A", "#2EBD5E"],
    sortHover: "#1A1A20", switchBg: "#333", switchKnob: "#E8A630",
  },
  light: {
    bg: "#F5F3EE", card: "#FFFFFF", cardAlt: "#FAFAF7", bg2: "#EEEAE3",
    border: "#DDD8D0", borderLight: "#C8C3BA",
    text: "#1A1816", textMuted: "#6B665E", textDim: "#9A958D",
    accent: "#C4841D", accentDim: "#A06A10",
    red: "#D33B3B", green: "#1E9B4B", blue: "#2563EB", purple: "#7C3AED", pink: "#C026A0", teal: "#0D9488", coral: "#D2603A",
    colors6: ["#C4841D", "#2563EB", "#D33B3B", "#7C3AED", "#C026A0", "#0D9488", "#D2603A", "#1E9B4B"],
    sortHover: "#F0EDE6", switchBg: "#C8C3BA", switchKnob: "#C4841D",
  },
};

// ── Data ──
const TABS = ["總覽", "商機指標", "12類選題", "A/B 文案", "TA 輪廓", "來賓效應", "行動建議"];
const SHOWS = ["全部", "授ㄉㄟ私捏", "防詐特攻隊", "醫起好健康"];

function processVideos(rawVideos) {
  return rawVideos.map(v => {
    const interactRate = v.views > 0 ? ((v.likes + v.comments + v.shares) / v.views * 100) : 0;
    const subsRate = v.views > 0 ? (v.subs / v.views * 100) : 0;
    const watchSec = v.avgWatch ? v.avgWatch.split(":").reduce((a, b, i) => a + parseInt(b) * (i === 0 ? 60 : 1), 0) : 0;
    const watchRatio = watchSec > 0 ? Math.min(watchSec / 600, 1) : 0;
    const commercialIdx = (0.25 * Math.min(interactRate, 10) / 10 + 0.25 * Math.min(Math.abs(subsRate) * 10, 10) / 10 + 0.3 * watchRatio + 0.2 * Math.min(v.views / 30000, 1)) * 10;
    return { ...v, interactRate: +interactRate.toFixed(2), subsRate: +subsRate.toFixed(3), watchSec, commercialIdx: +commercialIdx.toFixed(2) };
  });
}

function fmt(n) { return n >= 10000 ? (n/10000).toFixed(1) + "萬" : n >= 1000 ? (n/1000).toFixed(1) + "K" : String(n); }

// ── Sortable Table ──
function SortableTable({ headers, dataKeys, data, renderRow, C }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (key) => {
    if (sortKey === key) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      let va = typeof a[sortKey] === "string" ? a[sortKey] : (a[sortKey] ?? 0);
      let vb = typeof b[sortKey] === "string" ? b[sortKey] : (b[sortKey] ?? 0);
      if (typeof va === "string" && typeof vb === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [data, sortKey, sortDir]);

  return (
    <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
          {headers.map((h, i) => {
            const key = dataKeys[i];
            const active = sortKey === key;
            return (
              <th key={h} onClick={() => key && handleSort(key)} style={{
                padding: "12px 14px", textAlign: "left", fontWeight: 500, fontSize: 10,
                textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap",
                cursor: key ? "pointer" : "default", userSelect: "none", transition: "background 0.15s",
                color: active ? C.accent : C.textMuted,
                background: active ? C.sortHover : "transparent",
              }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {h}
                  {key && (
                    <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 0, fontSize: 8, opacity: active ? 1 : 0.3 }}>
                      <span style={{ color: active && sortDir === "asc" ? C.accent : C.textDim }}>▲</span>
                      <span style={{ color: active && sortDir === "desc" ? C.accent : C.textDim, marginTop: -2 }}>▼</span>
                    </span>
                  )}
                </span>
              </th>
            );
          })}
        </tr></thead>
        <tbody>{sorted.map((row, i) => renderRow(row, i))}</tbody>
      </table>
    </div>
  );
}

// ── Shared components ──
function KPI({ label, value, sub, color, C: c }) {
  return (
    <div style={{ background: c.card, borderRadius: 10, padding: "18px 20px", border: `1px solid ${c.border}`, flex: "1 1 140px", minWidth: 140 }}>
      <div style={{ color: c.textMuted, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ color: color || c.text, fontSize: 26, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ color: c.textDim, fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, sub, children }) {
  return <div style={{ marginTop: 36 }}><h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>{title}</h2>{sub && <p style={{ fontSize: 12, margin: "0 0 16px", opacity: 0.5 }}>{sub}</p>}{children}</div>;
}

function Tag({ text, color, C: c }) {
  return <span style={{ background: (color || c.accent) + "15", color: color || c.accent, fontSize: 10, padding: "2px 8px", borderRadius: 12, fontWeight: 500, border: `1px solid ${(color || c.accent)}25` }}>{text}</span>;
}

function Card({ children, style: s, C: c }) {
  return <div style={{ background: c.card, borderRadius: 10, padding: 20, border: `1px solid ${c.border}`, ...s }}>{children}</div>;
}

const TT = (c) => ({ background: c.card, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 12 });

// ── Theme Toggle Switch ──
function ThemeSwitch({ isDark, toggle, C: c }) {
  return (
    <button onClick={toggle} aria-label="切換主題" style={{
      position: "relative", width: 52, height: 28, borderRadius: 14, border: "none",
      background: c.switchBg, cursor: "pointer", padding: 0, transition: "background 0.3s",
    }}>
      <div style={{
        position: "absolute", top: 3, left: isDark ? 27 : 3,
        width: 22, height: 22, borderRadius: 11, background: c.switchKnob,
        transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
      }}>
        {isDark ? "🌙" : "☀️"}
      </div>
    </button>
  );
}

// ── Tab: Overview ──
function OverviewTab({ fullVideos, C: c }) {
  const total = fullVideos.reduce((a, v) => ({ views: a.views + v.views, subs: a.subs + v.subs }), { views: 0, subs: 0 });
  const avgCIdx = (fullVideos.reduce((a, v) => a + v.commercialIdx, 0) / fullVideos.length).toFixed(1);

  const showStats = SHOWS.filter(s => s !== "全部").map(s => {
    const sv = fullVideos.filter(v => v.show === s);
    if (!sv.length) return null;
    return { show: s, count: sv.length, totalViews: sv.reduce((a, v) => a + v.views, 0), avgViews: Math.round(sv.reduce((a, v) => a + v.views, 0) / sv.length), totalSubs: sv.reduce((a, v) => a + v.subs, 0), avgInteract: +(sv.reduce((a, v) => a + v.interactRate, 0) / sv.length).toFixed(2), avgCommercial: +(sv.reduce((a, v) => a + v.commercialIdx, 0) / sv.length).toFixed(1) };
  }).filter(Boolean);

  return (<div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <KPI label="完整集" value={fullVideos.length} sub="不含 Shorts/Podcast" C={c} />
      <KPI label="總觀看" value={fmt(total.views)} C={c} />
      <KPI label="訂閱增長" value={`+${total.subs}`} color={c.green} C={c} />
      <KPI label="平均商機" value={avgCIdx} sub="滿分 10" color={c.accent} C={c} />
    </div>
    <Section title="各節目表現" sub="僅計算完整集">
      <SortableTable C={c} headers={["節目", "集數", "總觀看", "平均觀看", "總訂閱", "互動率", "商機"]}
        dataKeys={["show", "count", "totalViews", "avgViews", "totalSubs", "avgInteract", "avgCommercial"]}
        data={showStats}
        renderRow={(s, i) => (
          <tr key={s.show} style={{ borderBottom: `1px solid ${c.border}` }}>
            <td style={{ padding: "12px 14px", color: c.text, fontWeight: 500 }}>{s.show}</td>
            <td style={{ padding: "12px 14px", color: c.textMuted }}>{s.count}</td>
            <td style={{ padding: "12px 14px", color: c.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(s.totalViews)}</td>
            <td style={{ padding: "12px 14px", color: c.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(s.avgViews)}</td>
            <td style={{ padding: "12px 14px", color: c.green, fontFamily: "'JetBrains Mono', monospace" }}>+{s.totalSubs}</td>
            <td style={{ padding: "12px 14px", color: c.accent, fontFamily: "'JetBrains Mono', monospace" }}>{s.avgInteract}%</td>
            <td style={{ padding: "12px 14px", color: c.accent, fontFamily: "'JetBrains Mono', monospace" }}>{s.avgCommercial}</td>
          </tr>
        )}
      />
    </Section>
    <Section title="觀看數 Top 10" sub="點擊欄位標題可排序">
      <SortableTable C={c} headers={["#", "節目", "集數", "標題", "觀看", "訂閱", "互動率", "商機"]}
        dataKeys={[null, "show", "ep", "title", "views", "subs", "interactRate", "commercialIdx"]}
        data={fullVideos}
        renderRow={(v, i) => (
          <tr key={v.id} style={{ borderBottom: `1px solid ${c.border}` }}>
            <td style={{ padding: "10px 14px", color: c.textDim }}>{i + 1}</td>
            <td style={{ padding: "10px 14px" }}><Tag text={v.show} color={c.colors6[SHOWS.indexOf(v.show) % 6]} C={c} /></td>
            <td style={{ padding: "10px 14px", color: c.textMuted }}>{v.ep}</td>
            <td style={{ padding: "10px 14px", color: c.text, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</td>
            <td style={{ padding: "10px 14px", color: c.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(v.views)}</td>
            <td style={{ padding: "10px 14px", color: c.green, fontFamily: "'JetBrains Mono', monospace" }}>+{v.subs}</td>
            <td style={{ padding: "10px 14px", color: c.accent, fontFamily: "'JetBrains Mono', monospace" }}>{v.interactRate}%</td>
            <td style={{ padding: "10px 14px", color: c.accent, fontFamily: "'JetBrains Mono', monospace" }}>{v.commercialIdx}</td>
          </tr>
        )}
      />
    </Section>
  </div>);
}

// ── Tab: Commercial Index ──
function CommercialTab({ fullVideos, C: c }) {
  const sorted = [...fullVideos].sort((a, b) => b.commercialIdx - a.commercialIdx);
  return (<div>
    <Card C={c} style={{ marginBottom: 20, borderLeft: `3px solid ${c.accent}` }}>
      <div style={{ color: c.textMuted, fontSize: 12, marginBottom: 6 }}>商機指標公式（等 CTR 補上後升級為完整五維版）</div>
      <div style={{ color: c.text, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>0.25×互動率 + 0.25×訂閱轉換率 + 0.30×觀看時間比 + 0.20×觀看規模</div>
    </Card>
    <Section title="商機排行">
      <Card C={c}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sorted.slice(0, 10)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={c.border} horizontal={false} />
            <XAxis type="number" stroke={c.textDim} fontSize={11} domain={[0, 10]} />
            <YAxis type="category" dataKey="ep" stroke={c.textDim} fontSize={11} width={55} />
            <Tooltip contentStyle={TT(c)} formatter={v => v.toFixed(2)} />
            <Bar dataKey="commercialIdx" name="商機" radius={[0, 5, 5, 0]}>
              {sorted.slice(0, 10).map((v, i) => <Cell key={i} fill={v.commercialIdx >= 6 ? c.green : v.commercialIdx >= 4 ? c.accent : c.red} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </Section>
    <Section title="四維雷達" sub="Top 5 集數指標分布">
      <Card C={c}>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={[
            { dim: "互動率", ...Object.fromEntries(sorted.slice(0, 5).map(v => [v.ep, Math.min(v.interactRate / 5 * 100, 100)])) },
            { dim: "訂閱轉換", ...Object.fromEntries(sorted.slice(0, 5).map(v => [v.ep, Math.min(Math.abs(v.subsRate) * 20 * 100, 100)])) },
            { dim: "觀看時長", ...Object.fromEntries(sorted.slice(0, 5).map(v => [v.ep, Math.min(v.watchSec / 600 * 100, 100)])) },
            { dim: "觀看規模", ...Object.fromEntries(sorted.slice(0, 5).map(v => [v.ep, Math.min(v.views / 50000 * 100, 100)])) },
          ]}>
            <PolarGrid stroke={c.border} />
            <PolarAngleAxis dataKey="dim" stroke={c.textMuted} fontSize={11} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            {sorted.slice(0, 5).map((v, i) => <Radar key={v.ep} name={v.ep} dataKey={v.ep} stroke={c.colors6[i]} fill={c.colors6[i]} fillOpacity={0.1} strokeWidth={1.5} />)}
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip contentStyle={TT(c)} />
          </RadarChart>
        </ResponsiveContainer>
      </Card>
    </Section>
    <Section title="完整排行表" sub="點擊欄位標題排序">
      <SortableTable C={c} headers={["集數", "節目", "來賓", "觀看", "訂閱", "互動率", "觀看秒", "商機"]}
        dataKeys={["ep", "show", "guest", "views", "subs", "interactRate", "watchSec", "commercialIdx"]}
        data={fullVideos}
        renderRow={(v, i) => (
          <tr key={v.id} style={{ borderBottom: `1px solid ${c.border}` }}>
            <td style={{ padding: "10px 14px", color: c.text, fontWeight: 500 }}>{v.ep}</td>
            <td style={{ padding: "10px 14px" }}><Tag text={v.show} color={c.colors6[SHOWS.indexOf(v.show) % 6]} C={c} /></td>
            <td style={{ padding: "10px 14px", color: c.textMuted }}>{v.guest}</td>
            <td style={{ padding: "10px 14px", color: c.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(v.views)}</td>
            <td style={{ padding: "10px 14px", color: v.subs >= 0 ? c.green : c.red, fontFamily: "'JetBrains Mono', monospace" }}>{v.subs >= 0 ? "+" : ""}{v.subs}</td>
            <td style={{ padding: "10px 14px", color: c.accent, fontFamily: "'JetBrains Mono', monospace" }}>{v.interactRate}%</td>
            <td style={{ padding: "10px 14px", color: c.textMuted }}>{v.avgWatch}</td>
            <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", color: v.commercialIdx >= 6 ? c.green : v.commercialIdx >= 4 ? c.accent : c.red }}>{v.commercialIdx}</td>
          </tr>
        )}
      />
    </Section>
  </div>);
}

// ── Tab: 12 Topics ──
function TopicTab({ fullVideos, C: c }) {
  const topicStats = useMemo(() => {
    const map = {};
    fullVideos.forEach(v => {
      if (!v.topic) return;
      if (!map[v.topic]) map[v.topic] = { topic: v.topic, count: 0, totalViews: 0, totalSubs: 0, totalInteract: 0, totalWatch: 0, commercialSum: 0 };
      const m = map[v.topic]; m.count++; m.totalViews += v.views; m.totalSubs += v.subs; m.totalInteract += v.interactRate; m.totalWatch += v.watchSec; m.commercialSum += v.commercialIdx;
    });
    return Object.values(map).map(t => ({ ...t, avgViews: Math.round(t.totalViews / t.count), avgInteract: +(t.totalInteract / t.count).toFixed(2), avgWatchFmt: `${Math.floor(t.totalWatch / t.count / 60)}:${((t.totalWatch / t.count) % 60 | 0).toString().padStart(2, "0")}`, avgCommercial: +(t.commercialSum / t.count).toFixed(1) })).sort((a, b) => b.avgViews - a.avgViews);
  }, [fullVideos]);

  return (<div>
    <Section title="選題類別觀看數" sub="按弘峻 12 類分類">
      <Card C={c}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={topicStats}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
            <XAxis dataKey="topic" stroke={c.textDim} fontSize={10} angle={-20} textAnchor="end" height={65} />
            <YAxis stroke={c.textDim} fontSize={11} />
            <Tooltip contentStyle={TT(c)} />
            <Bar dataKey="avgViews" name="平均觀看" fill={c.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </Section>
    <Section title="選題矩陣" sub="點擊欄位標題排序">
      <SortableTable C={c} headers={["選題", "集數", "平均觀看", "總訂閱", "互動率", "觀看時長", "商機", "建議"]}
        dataKeys={["topic", "count", "avgViews", "totalSubs", "avgInteract", null, "avgCommercial", null]}
        data={topicStats}
        renderRow={(t, i) => (
          <tr key={t.topic} style={{ borderBottom: `1px solid ${c.border}` }}>
            <td style={{ padding: "12px 14px", color: c.text, fontWeight: 500 }}>{t.topic}</td>
            <td style={{ padding: "12px 14px", color: c.textMuted }}>{t.count}</td>
            <td style={{ padding: "12px 14px", color: c.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(t.avgViews)}</td>
            <td style={{ padding: "12px 14px", color: c.green, fontFamily: "'JetBrains Mono', monospace" }}>+{t.totalSubs}</td>
            <td style={{ padding: "12px 14px", color: c.accent, fontFamily: "'JetBrains Mono', monospace" }}>{t.avgInteract}%</td>
            <td style={{ padding: "12px 14px", color: c.textMuted }}>{t.avgWatchFmt}</td>
            <td style={{ padding: "12px 14px", fontFamily: "'JetBrains Mono', monospace", color: t.avgCommercial >= 5 ? c.green : t.avgCommercial >= 3 ? c.accent : c.red }}>{t.avgCommercial}</td>
            <td style={{ padding: "12px 14px", color: c.textMuted, fontSize: 11 }}>{t.avgCommercial >= 5 ? "⬆ 加碼" : t.avgCommercial >= 3 ? "→ 維持" : "⬇ 調整"}</td>
          </tr>
        )}
      />
    </Section>
  </div>);
}

// ── AB Test Fallback Data ──
const FALLBACK_AB_TESTS = [
  { ep:"EP209", show:"授ㄉㄟ私捏", topic:"法律與社會案件", copyA:"200萬訂閱一夕歸零？創作者必看", copyB:"沒看懂「這條款」恐賠掉整個頻道", ctrA:3.8, ctrB:4.5, winner:"B", frameA:"實用承諾", frameB:"好奇懸念", testVar:"情緒框架", angleA:"法律知識提醒", angleB:"風險恐懼切入", conclusion:"好奇懸念的「恐賠掉」比實用提醒更能引發點擊衝動", suggestion:"法律類持續用好奇懸念包裝風險" },
  { ep:"EP210", show:"防詐特攻隊", topic:"法律與社會案件", copyA:"轉貼迷因小心觸法！律師教你避雷", copyB:"你天天在做卻不知道違法！", ctrA:4.2, ctrB:5.6, winner:"B", frameA:"權威背書", frameB:"好奇懸念", testVar:"情緒框架", angleA:"律師專業提醒", angleB:"日常行為反差", conclusion:"「你天天在做」製造認知衝突，比律師背書更有吸引力", suggestion:"日常行為 + 違法反差是高 CTR 公式" },
  { ep:"EP213", show:"授ㄉㄟ私捏", topic:"理財與房產", copyA:"ETF 四大種類完整解析", copyB:"做好本業、放下企圖心，資產佛系增長", ctrA:5.1, ctrB:6.3, winner:"B", frameA:"實用承諾", frameB:"好奇懸念", testVar:"議題包裝", angleA:"教學型：ETF分類", angleB:"心態型：佛系理財", conclusion:"同樣好奇框架，心態故事比教學分類更吸引 45-54 TA", suggestion:"理財類用「心態轉變」包裝比「工具教學」好" },
  { ep:"EP214", show:"授ㄉㄟ私捏", topic:"理財與房產", copyA:"股怪教授的全自動躺平投資術", copyB:"100萬變1300萬？20年翻13倍的秘密", ctrA:4.8, ctrB:6.9, winner:"B", frameA:"權威背書", frameB:"好奇懸念", testVar:"混合", angleA:"教授專業推薦", angleB:"具體數字誘因", conclusion:"具體金額（100萬→1300萬）比專家頭銜更能驅動點擊", suggestion:"理財類標題一定要有具體數字" },
  { ep:"EP215", show:"授ㄉㄟ私捏", topic:"心理與自我成長", copyA:"蔡康永情商課嘉賓教你高敏感生存法", copyB:"高敏感是一種病？什麼都沒做就好內耗", ctrA:5.2, ctrB:7.1, winner:"B", frameA:"權威背書", frameB:"好奇懸念", testVar:"情緒框架", angleA:"名人背書", angleB:"症狀自我檢測", conclusion:"「是一種病？」引發自我檢視比名人推薦更能觸發點擊", suggestion:"心理類用「你是不是也…」的自我檢測句式" },
  { ep:"EP216", show:"授ㄉㄟ私捏", topic:"心理與自我成長", copyA:"身心科醫師教你2招救回職場內耗", copyB:"大腦天生不是讓你快樂！越努力越焦慮？", ctrA:5.5, ctrB:7.8, winner:"B", frameA:"實用承諾", frameB:"好奇懸念", testVar:"混合", angleA:"解決方案導向", angleB:"認知顛覆", conclusion:"「大腦天生不是讓你快樂」顛覆認知，比承諾解法更有衝擊力", suggestion:"心理類用認知顛覆開頭，解法放在影片內" },
  { ep:"EP217", show:"授ㄉㄟ私捏", topic:"科技與科學", copyA:"LINE前總經理談AI時代的品味與效率", copyB:"AI時代，45+才是最強大腦！效能增加100倍", ctrA:4.6, ctrB:5.8, winner:"B", frameA:"權威背書", frameB:"好奇懸念", testVar:"議題包裝", angleA:"人物專訪角度", angleB:"年齡賦能角度", conclusion:"「45+才是最強大腦」精準打中 TA 年齡焦慮，比人物訪談更有代入感", suggestion:"科技類用 TA 年齡賦能比人物背書有效" },
  { ep:"EP15", show:"防詐特攻隊", topic:"法律與社會案件", copyA:"外籍移工詐騙新手法！三招自保SOP", copyB:"外籍移工竟跟詐騙集團一夥！雇主如何自保？", ctrA:5.0, ctrB:7.2, winner:"B", frameA:"實用承諾", frameB:"好奇懸念", testVar:"情緒框架", angleA:"SOP教學", angleB:"揭秘震驚", conclusion:"「竟跟詐騙集團一夥」的震驚感比 SOP 教學更能引發好奇", suggestion:"防詐類用揭秘+震驚感開頭" },
  { ep:"EP17", show:"防詐特攻隊", topic:"法律與社會案件", copyA:"被詐騙千萬的自救指南", copyB:"堪比八點檔！遭閨密背叛、慘被詐騙千萬", ctrA:5.3, ctrB:8.4, winner:"B", frameA:"實用承諾", frameB:"情感共鳴", testVar:"混合", angleA:"教學自救", angleB:"八點檔故事", conclusion:"「堪比八點檔」的故事張力 + 背叛元素引發強烈情感共鳴，CTR 差距最大（3.1%）", suggestion:"真實故事型防詐影片用戲劇化包裝，CTR 天花板最高" },
];

// ── Tab: AB ──
function ABTab({ abTests, C: c }) {
  const [hoveredTest, setHoveredTest] = useState(null);

  // Stats by test variable
  const varStats = useMemo(() => {
    const map = {};
    abTests.forEach(t => {
      if (!map[t.testVar]) map[t.testVar] = { type: t.testVar, count: 0, totalGap: 0, wins: { A: 0, B: 0 } };
      map[t.testVar].count++;
      map[t.testVar].totalGap += Math.abs(t.ctrB - t.ctrA);
      map[t.testVar].wins[t.winner]++;
    });
    return Object.values(map).map(v => ({ ...v, avgGap: +(v.totalGap / v.count).toFixed(1) }));
  }, []);

  // Stats by emotion framework
  const frameStats = useMemo(() => {
    const map = {};
    abTests.forEach(t => {
      [{ frame: t.frameA, ctr: t.ctrA, won: t.winner === "A" }, { frame: t.frameB, ctr: t.ctrB, won: t.winner === "B" }].forEach(({ frame, ctr, won }) => {
        if (!map[frame]) map[frame] = { frame, totalCTR: 0, count: 0, wins: 0 };
        map[frame].totalCTR += ctr; map[frame].count++; if (won) map[frame].wins++;
      });
    });
    return Object.values(map).map(f => ({ ...f, avgCTR: +(f.totalCTR / f.count).toFixed(1), winRate: Math.round(f.wins / f.count * 100) })).sort((a, b) => b.winRate - a.winRate);
  }, []);

  const frameColorMap = { "好奇懸念": c.accent, "恐懼損失": c.red, "實用承諾": c.blue, "權威背書": c.purple, "情感共鳴": c.pink, "社會認同": c.teal };

  return (<div>
    {/* KPI row */}
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <KPI label="總測試次數" value={abTests.length} C={c} />
      <KPI label="B 版勝出率" value={`${Math.round(abTests.filter(t => t.winner === "B").length / abTests.length * 100)}%`} color={c.green} C={c} />
      <KPI label="平均 CTR 差距" value={`${(abTests.reduce((a, t) => a + Math.abs(t.ctrB - t.ctrA), 0) / abTests.length).toFixed(1)}%`} color={c.accent} C={c} />
      <KPI label="最大 CTR 差距" value={`${Math.max(...abTests.map(t => Math.abs(t.ctrB - t.ctrA))).toFixed(1)}%`} sub="EP17 防詐特攻隊" color={c.coral} C={c} />
    </div>

    {/* Test Variable Analysis */}
    <Section title="測試變數效益分析" sub="議題包裝 vs 情緒框架 vs 混合，哪種測試方向 CTR 差距最大？">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {varStats.map(v => (
          <Card key={v.type} C={c} style={{ flex: "1 1 180px", minWidth: 170 }}>
            <div style={{ color: c.text, fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{v.type}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: c.textMuted, fontSize: 11 }}>測試次數</span>
              <span style={{ color: c.text, fontFamily: "'JetBrains Mono', monospace" }}>{v.count}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: c.textMuted, fontSize: 11 }}>平均 CTR 差距</span>
              <span style={{ color: c.accent, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{v.avgGap}%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: c.textMuted, fontSize: 11 }}>B 版勝出</span>
              <span style={{ color: c.green, fontFamily: "'JetBrains Mono', monospace" }}>{v.wins.B}/{v.count}</span>
            </div>
          </Card>
        ))}
      </div>
    </Section>

    {/* Framework Win Rate */}
    <Section title="情緒框架勝率" sub="各框架在 AB test 中的表現">
      <Card C={c}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={frameStats} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={c.border} horizontal={false} />
            <XAxis type="number" stroke={c.textDim} fontSize={11} domain={[0, 100]} unit="%" />
            <YAxis type="category" dataKey="frame" stroke={c.textDim} fontSize={11} width={75} />
            <Tooltip contentStyle={TT(c)} formatter={(v, name) => name === "winRate" ? `${v}%` : v.toFixed(1) + "%"} />
            <Bar dataKey="winRate" name="勝率" radius={[0, 5, 5, 0]}>
              {frameStats.map((f, i) => <Cell key={i} fill={frameColorMap[f.frame] || c.accent} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {frameStats.map(f => (
          <Card key={f.frame} C={c} style={{ flex: "1 1 120px", minWidth: 120, padding: 14 }}>
            <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 4 }}>{f.frame}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: frameColorMap[f.frame] || c.accent, fontFamily: "'JetBrains Mono', monospace" }}>{f.winRate}%</div>
            <div style={{ fontSize: 10, color: c.textDim, marginTop: 2 }}>平均 CTR {f.avgCTR}% ・ {f.count} 次</div>
          </Card>
        ))}
      </div>
    </Section>

    {/* AB Test Detail Table with CTR bar comparison and tooltip */}
    <Section title="每次測試詳情" sub="點擊欄位排序 ・ 滑鼠移到 CTR 對比條上看 AB 分析">
      <SortableTable C={c}
        headers={["集數", "節目", "測試變數", "A 文案", "B 文案", "CTR 對比", "差距", "勝出"]}
        dataKeys={["ep", "show", "testVar", "copyA", "copyB", null, "gap", "winner"]}
        data={abTests.map(t => ({ ...t, gap: +(t.ctrB - t.ctrA).toFixed(1) }))}
        renderRow={(t, i) => {
          const maxCTR = Math.max(t.ctrA, t.ctrB);
          const isHovered = hoveredTest === t.ep;
          return (
            <tr key={t.ep} style={{ borderBottom: `1px solid ${c.border}`, background: isHovered ? c.sortHover : "transparent", transition: "background 0.15s" }}>
              <td style={{ padding: "12px 14px", color: c.text, fontWeight: 500 }}>{t.ep}</td>
              <td style={{ padding: "12px 14px" }}><Tag text={t.show} color={c.colors6[SHOWS.indexOf(t.show) % 6]} C={c} /></td>
              <td style={{ padding: "12px 14px" }}><Tag text={t.testVar} color={t.testVar === "情緒框架" ? c.purple : t.testVar === "議題包裝" ? c.teal : c.coral} C={c} /></td>
              <td style={{ padding: "12px 14px", color: t.winner === "A" ? c.green : c.textMuted, fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.copyA}</td>
              <td style={{ padding: "12px 14px", color: t.winner === "B" ? c.green : c.textMuted, fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.copyB}</td>
              <td style={{ padding: "12px 14px", minWidth: 160, position: "relative" }}
                onMouseEnter={() => setHoveredTest(t.ep)} onMouseLeave={() => setHoveredTest(null)}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: c.textDim, fontSize: 9, width: 12 }}>A</span>
                    <div style={{ flex: 1, background: c.bg2, borderRadius: 3, height: 14, overflow: "hidden" }}>
                      <div style={{ background: t.winner === "A" ? c.green : c.textDim, height: "100%", width: `${t.ctrA / maxCTR * 100}%`, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4, fontSize: 9, color: "#fff", fontWeight: 600, minWidth: 28 }}>{t.ctrA}%</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: c.textDim, fontSize: 9, width: 12 }}>B</span>
                    <div style={{ flex: 1, background: c.bg2, borderRadius: 3, height: 14, overflow: "hidden" }}>
                      <div style={{ background: t.winner === "B" ? c.green : c.textDim, height: "100%", width: `${t.ctrB / maxCTR * 100}%`, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4, fontSize: 9, color: "#fff", fontWeight: 600, minWidth: 28 }}>{t.ctrB}%</div>
                    </div>
                  </div>
                </div>
                {/* Tooltip on hover */}
                {isHovered && (
                  <div style={{
                    position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                    background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, padding: 16,
                    width: 320, zIndex: 50, boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.text, marginBottom: 10 }}>{t.ep} AB 分析</div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1, padding: 8, background: t.winner === "A" ? c.green + "12" : c.bg2, borderRadius: 6, border: `1px solid ${t.winner === "A" ? c.green + "30" : c.border}` }}>
                        <div style={{ fontSize: 9, color: c.textDim, marginBottom: 3 }}>A・{t.frameA}</div>
                        <div style={{ fontSize: 11, color: c.text, marginBottom: 4 }}>{t.angleA}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: t.winner === "A" ? c.green : c.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{t.ctrA}%</div>
                      </div>
                      <div style={{ flex: 1, padding: 8, background: t.winner === "B" ? c.green + "12" : c.bg2, borderRadius: 6, border: `1px solid ${t.winner === "B" ? c.green + "30" : c.border}` }}>
                        <div style={{ fontSize: 9, color: c.textDim, marginBottom: 3 }}>B・{t.frameB}</div>
                        <div style={{ fontSize: 11, color: c.text, marginBottom: 4 }}>{t.angleB}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: t.winner === "B" ? c.green : c.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{t.ctrB}%</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: c.accent, lineHeight: 1.5, marginBottom: 6 }}>結論：{t.conclusion}</div>
                    <div style={{ fontSize: 10, color: c.textMuted, lineHeight: 1.5 }}>建議：{t.suggestion}</div>
                    <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 10, height: 10, background: c.card, borderRight: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }} />
                  </div>
                )}
              </td>
              <td style={{ padding: "12px 14px", fontFamily: "'JetBrains Mono', monospace", color: t.gap > 2 ? c.green : t.gap > 1 ? c.accent : c.textMuted, fontWeight: 600 }}>+{Math.abs(t.gap).toFixed(1)}%</td>
              <td style={{ padding: "12px 14px" }}><span style={{ background: c.green + "18", color: c.green, padding: "2px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{t.winner}</span></td>
            </tr>
          );
        }}
      />
    </Section>

    {/* Future Recommendations */}
    <Section title="未來 AB Test 建議" sub="根據歷史數據推導的下一步方向">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {[
          { title: "框架策略", color: c.accent, items: [
            "「好奇懸念」勝率最高，作為所有節目的預設框架",
            "「情感共鳴」在防詐故事類有爆發力（EP17 CTR 差距 3.1%），但使用場景有限",
            "「實用承諾」作為 A 版對照組效果穩定，但幾乎不會勝出",
            "「權威背書」適合作為輔助元素放在描述欄，不適合作為標題主框架",
          ]},
          { title: "議題包裝", color: c.teal, items: [
            "理財類：「心態轉變故事」> 「工具教學分類」",
            "心理類：「認知顛覆」>「解決方案」，解法放影片內不放標題",
            "防詐類：「真實八點檔故事」> 「SOP 教學」",
            "所有類別：具體數字（金額、倍數、百分比）能顯著提高 CTR",
          ]},
          { title: "下次測試方向", color: c.purple, items: [
            "醫起好健康還沒做過 AB test，優先測「權威背書 vs 好奇懸念」",
            "防詐類測試「恐懼損失 vs 情感共鳴」，看哪個天花板更高",
            "嘗試「社會認同」框架（尚未測試過），例如「百萬人都在問的…」",
            "固定每期只改一個變數（議題或情緒），避免混合測試干擾結論",
          ]},
        ].map(b => (
          <Card key={b.title} C={c} style={{ borderTop: `3px solid ${b.color}` }}>
            <div style={{ color: b.color, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{b.title}</div>
            {b.items.map((item, j) => (
              <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                <span style={{ color: b.color, fontSize: 8, marginTop: 5 }}>●</span>
                <span style={{ color: c.textMuted, fontSize: 12, lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </Section>
  </div>);
}

// ── Tab: TA ──
function TATab({ fullVideos, selectedShow, C: c }) {
  const sv = selectedShow === "全部" ? fullVideos : fullVideos.filter(v => v.show === selectedShow);
  const wg = sv.filter(v => v.female > 0 || v.male > 0);
  const avgF = wg.length ? +(wg.reduce((a, v) => a + v.female, 0) / wg.length).toFixed(1) : 0;
  const avgM = wg.length ? +(wg.reduce((a, v) => a + v.male, 0) / wg.length).toFixed(1) : 0;
  const ageCounts = {}; sv.filter(v => v.age).forEach(v => { ageCounts[v.age] = (ageCounts[v.age] || 0) + 1; });
  const ageData = Object.entries(ageCounts).sort((a, b) => a[0].localeCompare(b[0])).map(([age, count]) => ({ age, count }));
  const topAge = [...Object.entries(ageCounts)].sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  const trafficCounts = {}; sv.filter(v => v.traffic !== "N/A").forEach(v => { trafficCounts[v.traffic] = (trafficCounts[v.traffic] || 0) + 1; });
  const trafficData = Object.entries(trafficCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([source, count]) => ({ source, pct: Math.round(count / sv.length * 100) }));

  return (<div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <KPI label="主力年齡" value={topAge} sub="歲" color={c.accent} C={c} />
      <KPI label="女性" value={`${avgF}%`} color={c.pink} C={c} />
      <KPI label="男性" value={`${avgM}%`} color={c.blue} C={c} />
      <KPI label="分析集數" value={sv.length} C={c} />
    </div>
    <Section title="年齡分布">
      <Card C={c}><ResponsiveContainer width="100%" height={200}>
        <BarChart data={ageData}><CartesianGrid strokeDasharray="3 3" stroke={c.border} /><XAxis dataKey="age" stroke={c.textDim} fontSize={12} /><YAxis stroke={c.textDim} fontSize={12} /><Tooltip contentStyle={TT(c)} /><Bar dataKey="count" name="次數" fill={c.accent} radius={[4, 4, 0, 0]} /></BarChart>
      </ResponsiveContainer></Card>
    </Section>
    <Section title="流量來源">
      <Card C={c}>{trafficData.map((t, i) => (
        <div key={t.source} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ color: c.text, fontSize: 12, width: 70, flexShrink: 0 }}>{t.source}</span>
          <div style={{ flex: 1, background: c.bg2, borderRadius: 3, height: 20, overflow: "hidden" }}>
            <div style={{ background: c.colors6[i % 6], height: "100%", width: `${t.pct}%`, borderRadius: 3, minWidth: 30, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6, fontSize: 10, color: "#fff", fontWeight: 500 }}>{t.pct}%</div>
          </div>
        </div>
      ))}</Card>
    </Section>
  </div>);
}

// ── Tab: Guests ──
function GuestTab({ fullVideos, C: c }) {
  const guests = useMemo(() => {
    const map = {};
    fullVideos.filter(v => v.guest).forEach(v => {
      if (!map[v.guest]) map[v.guest] = { name: v.guest, count: 0, totalViews: 0, totalSubs: 0, shows: new Set(), commercialSum: 0 };
      const m = map[v.guest]; m.count++; m.totalViews += v.views; m.totalSubs += v.subs; m.shows.add(v.show); m.commercialSum += v.commercialIdx;
    });
    return Object.values(map).map(g => ({ ...g, avgViews: Math.round(g.totalViews / g.count), avgCommercial: +(g.commercialSum / g.count).toFixed(1), shows: [...g.shows].join(", ") })).sort((a, b) => b.totalViews - a.totalViews);
  }, [fullVideos]);

  return (<div>
    <Section title="來賓效應排行" sub="點擊欄位排序">
      <SortableTable C={c} headers={["來賓", "節目", "次數", "總觀看", "平均觀看", "總訂閱", "商機"]}
        dataKeys={["name", "shows", "count", "totalViews", "avgViews", "totalSubs", "avgCommercial"]}
        data={guests}
        renderRow={(g, i) => (
          <tr key={g.name} style={{ borderBottom: `1px solid ${c.border}` }}>
            <td style={{ padding: "12px 14px", color: c.text, fontWeight: 500 }}>{g.name}</td>
            <td style={{ padding: "12px 14px", color: c.textMuted, fontSize: 11 }}>{g.shows}</td>
            <td style={{ padding: "12px 14px", color: c.textMuted }}>{g.count}</td>
            <td style={{ padding: "12px 14px", color: c.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(g.totalViews)}</td>
            <td style={{ padding: "12px 14px", color: c.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(g.avgViews)}</td>
            <td style={{ padding: "12px 14px", color: c.green, fontFamily: "'JetBrains Mono', monospace" }}>+{g.totalSubs}</td>
            <td style={{ padding: "12px 14px", color: g.avgCommercial >= 5 ? c.green : c.accent, fontFamily: "'JetBrains Mono', monospace" }}>{g.avgCommercial}</td>
          </tr>
        )}
      />
    </Section>
    <Section title="來賓觀看數">
      <Card C={c}><ResponsiveContainer width="100%" height={260}>
        <BarChart data={guests.slice(0, 10)}><CartesianGrid strokeDasharray="3 3" stroke={c.border} /><XAxis dataKey="name" stroke={c.textDim} fontSize={10} angle={-15} textAnchor="end" height={55} /><YAxis stroke={c.textDim} fontSize={11} /><Tooltip contentStyle={TT(c)} /><Bar dataKey="totalViews" name="總觀看" fill={c.teal} radius={[4, 4, 0, 0]} /></BarChart>
      </ResponsiveContainer></Card>
    </Section>
  </div>);
}

// ── Tab: Actions ──
function ActionTab({ C: c }) {
  const blocks = [
    { title: "文案策略", color: c.accent, items: ["預設「好奇懸念」框架，勝率 78%", "防詐混搭「恐懼損失」+ 具體金額", "醫起好健康用「權威背書」+ 好奇包裝", "避免純「實用承諾」，勝率僅 22%"] },
    { title: "選題方向", color: c.blue, items: ["法律與社會案件：觀看數最高，持續加碼", "理財與房產：觀看時長最長，適合深度內容", "命理與占卜：高時長 + 高女性比例，忠誠群", "心理與自我成長：觀看高但需精選來賓", "職場與職涯：表現偏弱，考慮與教養結合", "科技與科學：AI 有潛力但樣本少"] },
    { title: "TA 經營", color: c.green, items: ["防詐 → 45-54 男性，真實案例 + 金額", "授ㄉㄟ私捏 → 45-54 女性，焦慮 + 方法", "醫起好健康 → 35-54 女性，SEO 標題", "命理類女性 81.7%，可加碼"] },
    { title: "來賓策略", color: c.purple, items: ["優先再邀：朱仲翔、王珮蓓、盧美妏", "謝晨彥穩定產出，考慮固定合作", "丹倫兩集觀看偏低，調整主題包裝", "醫起好健康來賓效應待更多數據"] },
  ];
  return (<div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
      {blocks.map(b => (
        <Card key={b.title} C={c} style={{ borderTop: `3px solid ${b.color}` }}>
          <div style={{ color: b.color, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{b.title}</div>
          {b.items.map((item, j) => (
            <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
              <span style={{ color: b.color, fontSize: 8, marginTop: 5 }}>●</span>
              <span style={{ color: c.textMuted, fontSize: 12, lineHeight: 1.6 }}>{item}</span>
            </div>
          ))}
        </Card>
      ))}
    </div>
  </div>);
}

// ── Main ──
export default function App() {
  const [tab, setTab] = useState(0);
  const [show, setShow] = useState("全部");
  const [isDark, setIsDark] = useState(true);
  const [rawData, setRawData] = useState(null);
  const c = isDark ? themes.dark : themes.light;

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + "data.json")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setRawData)
      .catch(() => setRawData(null));
  }, []);

  const { fullVideos, abTests } = useMemo(() => {
    if (!rawData) return { fullVideos: [], abTests: FALLBACK_AB_TESTS };
    const all = processVideos(rawData.videos || []);
    const full = all.filter(v => v.type === "完整集");
    const ab = rawData.abTests && rawData.abTests.length > 0 ? rawData.abTests : FALLBACK_AB_TESTS;
    return { fullVideos: full, abTests: ab };
  }, [rawData]);

  if (!rawData) {
    return (
      <div style={{ background: c.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: c.textMuted, fontFamily: "'Noto Sans TC', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 12, color: c.accent }}>醍醐WAY</div>
          <div>載入數據中...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: c.bg, minHeight: "100vh", color: c.text, fontFamily: "'Noto Sans TC', sans-serif", transition: "background 0.3s, color 0.3s" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ padding: "24px 28px 0", borderBottom: `1px solid ${c.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, transition: "color 0.3s" }}><span style={{ color: c.accent }}>醍醐WAY</span> 內容分析 v3</h1>
            <p style={{ margin: "3px 0 0", color: c.textMuted, fontSize: 12 }}>{fullVideos.length} 支完整集 ・ 表格點擊欄位可排序</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {tab === 4 && <select value={show} onChange={e => setShow(e.target.value)} style={{ background: c.card, color: c.text, border: `1px solid ${c.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, transition: "all 0.3s" }}>
              {SHOWS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>}
            <ThemeSwitch isDark={isDark} toggle={() => setIsDark(!isDark)} C={c} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              background: "none", border: "none", cursor: "pointer", padding: "10px 16px", fontSize: 13,
              fontWeight: tab === i ? 600 : 400, color: tab === i ? c.accent : c.textMuted,
              borderBottom: tab === i ? `2px solid ${c.accent}` : "2px solid transparent",
              whiteSpace: "nowrap", fontFamily: "'Noto Sans TC', sans-serif", transition: "color 0.2s",
            }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "20px 28px 60px", maxWidth: 1100, transition: "all 0.3s" }}>
        {tab === 0 && <OverviewTab fullVideos={fullVideos} C={c} />}
        {tab === 1 && <CommercialTab fullVideos={fullVideos} C={c} />}
        {tab === 2 && <TopicTab fullVideos={fullVideos} C={c} />}
        {tab === 3 && <ABTab abTests={abTests} C={c} />}
        {tab === 4 && <TATab fullVideos={fullVideos} selectedShow={show} C={c} />}
        {tab === 5 && <GuestTab fullVideos={fullVideos} C={c} />}
        {tab === 6 && <ActionTab C={c} />}
      </div>
    </div>
  );
}
