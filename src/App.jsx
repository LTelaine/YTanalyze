import { useState, useMemo, useCallback, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, ComposedChart } from "recharts";

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
const SHEET_ID = "10Eh6MhCHdcDFi-d1WHbYJS_sbsSUkxNctDNcc3kum9Y";
const TABS = ["總覽", "商機指標", "12類選題", "A/B 文案", "TA 輪廓", "來賓效應", "收益", "TA 議題", "行動建議"];
const SHOWS = ["全部", "授ㄉㄟ私捏", "防詐特攻隊", "醫起好健康"];

function parseCSV(text) {
  const rows = [];
  let current = "", inQuote = false, row = [];
  for (let i = 0; i <= text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') { current += '"'; i++; }
      else inQuote = !inQuote;
    } else if ((ch === ',' && !inQuote) || (ch === '\n' && !inQuote) || ch === undefined) {
      row.push(current); current = "";
      if (ch !== ',') { if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
    } else if (ch === '\n' && inQuote) { current += '\n';
    } else if (ch !== '\r') { current += ch; }
  }
  return rows;
}

function csvToObjects(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
    return obj;
  });
}

function parsePct(v) {
  if (!v) return 0;
  const s = String(v).trim();
  if (s.endsWith('%')) return parseFloat(s) || 0;
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return n > 0 && n < 1 ? +(n * 100).toFixed(2) : +n.toFixed(2);
}

async function loadFromSheets() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("影片數據")}&headers=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  const rows = parseCSV(await res.text());
  if (rows.length < 3) throw new Error("empty");

  const H = rows[0];
  const col = (name) => H.indexOf(name);
  const dataRows = rows.slice(2);

  const videos = [], abTests = [];
  for (const r of dataRows) {
    const id = r[col("影片 ID")];
    if (!id) continue;
    videos.push({
      id, show: r[col("節目名稱")] || "", title: r[col("影片標題")] || "",
      date: r[col("上架時間")] || "",
      views: +r[col("觀看次數")] || 0, watchMin: +r[col("預估觀看分鐘")] || 0,
      subs: +r[col("訂閱增減")] || 0, likes: +r[col("按讚數")] || 0,
      comments: +r[col("留言數")] || 0, shares: +r[col("分享數")] || 0,
      avgWatch: r[col("平均觀看時長")] || "0:00",
      age: r[col("主要年齡層")] || "", female: +r[col("女性比例 %")] || 0,
      male: +r[col("男性比例 %")] || 0, traffic: r[col("主要流量來源")] || "N/A",
      type: r[col("影片類型")] || "完整集", guest: r[col("來賓姓名")] || "",
      topic: r[col("選題大類")] || r[col("選題類別")] || "未分類",
      ep: r[col("集數")] || "",
      trafficDetail: r[col("流量來源明細")] || "",
      estimatedRevenue: +r[col("預估收益")] || 0,
      estimatedAdRevenue: +r[col("預估廣告收益")] || 0,
      redPartnerRevenue: +r[col("Red夥伴收益")] || 0,
      grossRevenue: +r[col("總收益")] || 0,
      cpm: +r[col("CPM")] || 0,
      playbackCpm: +r[col("播放CPM")] || 0,
      subscribedViews: +r[col("訂閱者觀看次數")] || 0,
      subscribedMinutes: +r[col("訂閱者觀看分鐘")] || 0,
      unsubscribedViews: +r[col("非訂閱者觀看次數")] || 0,
      unsubscribedMinutes: +r[col("非訂閱者觀看分鐘")] || 0,
      searchTerms: r[col("搜尋關鍵字 Top10")] || "",
      impressions: +r[col("曝光次數")] || 0,
      ctrPct: +r[col("CTR 點閱率 %")] || 0,
    });

    const copyA = r[col("縮圖文案 A")], copyB = r[col("縮圖文案 B")];
    if (copyA && copyB) {
      abTests.push({
        ep: r[col("集數")] || "", show: r[col("節目名稱")] || "", date: r[col("上架時間")] || "",
        topic: r[col("選題類別")] || r[col("選題大類")] || "",
        copyA, copyB,
        ctrA: parsePct(r[col("A 點擊率")]), ctrB: parsePct(r[col("B 點擊率")]),
        winner: r[col("勝出版本")] || "",
        frameA: r[col("A 情緒框架")] || "", frameB: r[col("B 情緒框架")] || "",
        testVar: r[col("測試變數")] || "",
        angleA: r[col("A 設計脈絡")] || "", angleB: r[col("B 設計脈絡")] || "",
        topicAngleA: r[col("A 議題角度")] || "", topicAngleB: r[col("B 議題角度")] || "",
        conclusion: r[col("AB 結論")] || "", suggestion: r[col("未來建議")] || "",
      });
    }
  }
  let abSuggestions = [];
  try {
    const suggUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("AB建議")}&headers=1`;
    const suggRes = await fetch(suggUrl);
    if (suggRes.ok) {
      const suggRows = parseCSV(await suggRes.text());
      if (suggRows.length >= 2) {
        const sh = suggRows[0];
        const bCol = sh.indexOf("區塊"), iCol = sh.indexOf("建議內容");
        if (bCol !== -1 && iCol !== -1) {
          suggRows.slice(1).forEach(r => {
            const block = r[bCol], item = r[iCol];
            if (block && item) abSuggestions.push({ block, item });
          });
        }
      }
    }
  } catch (e) {}

  let formulaConfig = {};
  try {
    const cfgUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("公式設定")}&headers=1`;
    const cfgRes = await fetch(cfgUrl);
    if (cfgRes.ok) {
      const cfgRows = parseCSV(await cfgRes.text());
      if (cfgRows.length >= 2) {
        const ch = cfgRows[0];
        const pCol = ch.indexOf("參數"), vCol = ch.indexOf("數值");
        if (pCol !== -1 && vCol !== -1) {
          cfgRows.slice(1).forEach(r => {
            const param = r[pCol], val = r[vCol];
            if (param && val !== "") formulaConfig[param] = isNaN(+val) ? val : +val;
          });
        }
      }
    }
  } catch (e) {}

  const recordTime = videos.length > 0 ? (videos[0].date ? videos.reduce((latest, v) => {
    const rt = dataRows.find(r => r[col("影片 ID")] === v.id)?.[col("紀錄時間")] || "";
    return rt > latest ? rt : latest;
  }, "") : "") : "";

  return { videos, abTests, abSuggestions, formulaConfig, recordTime };
}

function processVideos(rawVideos, cfg = {}) {
  const w1 = +(cfg["互動率權重"] ?? 0.25);
  const w2 = +(cfg["訂閱轉換率權重"] ?? 0.25);
  const w3 = +(cfg["觀看時長比權重"] ?? 0.30);
  const w4 = +(cfg["觀看規模權重"] ?? 0.20);
  const iMax = +(cfg["互動率滿分%"] ?? 10);
  const vMax = +(cfg["觀看規模基準"] ?? 30000);
  return rawVideos.map(v => {
    const interactRate = v.views > 0 ? ((v.likes + v.comments + v.shares) / v.views * 100) : 0;
    const subsRate = v.views > 0 ? (v.subs / v.views * 100) : 0;
    const watchSec = v.avgWatch ? v.avgWatch.split(":").reduce((a, b, i) => a + parseInt(b) * (i === 0 ? 60 : 1), 0) : 0;
    const watchRatio = watchSec > 0 ? Math.min(watchSec / 600, 1) : 0;
    const commercialIdx = (w1 * Math.min(interactRate, iMax) / iMax + w2 * Math.min(Math.abs(subsRate) * 10, 10) / 10 + w3 * watchRatio + w4 * Math.min(v.views / vMax, 1)) * 10;
    return { ...v, interactRate: +interactRate.toFixed(2), subsRate: +subsRate.toFixed(3), watchSec, commercialIdx: +commercialIdx.toFixed(2) };
  });
}

function fmt(n) { return n >= 10000 ? (n/10000).toFixed(1) + "萬" : n >= 1000 ? (n/1000).toFixed(1) + "K" : String(n); }

// ── Sortable Table ──
function SortableTable({ headers, dataKeys, data, renderRow, C, defaultSortKey, defaultSortDir = "desc", maxHeight }) {
  const [sortKey, setSortKey] = useState(defaultSortKey || null);
  const [sortDir, setSortDir] = useState(defaultSortDir);

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
    <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "auto", maxHeight: maxHeight || "none" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr style={{ borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 2 }}>
          {headers.map((h, i) => {
            const key = dataKeys[i];
            const active = sortKey === key;
            return (
              <th key={h} onClick={() => key && handleSort(key)} style={{
                padding: "12px 14px", textAlign: "left", fontWeight: 500, fontSize: 10,
                textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap",
                cursor: key ? "pointer" : "default", userSelect: "none", transition: "background 0.15s",
                color: active ? C.accent : C.textMuted,
                background: active ? C.sortHover : C.card,
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
function KPI({ label, value, sub, color, C: c, title }) {
  return (
    <div title={title} style={{ background: c.card, borderRadius: 10, padding: "18px 20px", border: `1px solid ${c.border}`, flex: "1 1 140px", minWidth: 140, cursor: title ? "help" : "default" }}>
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

function VideoTitleCell({ v, C: c }) {
  const [pos, setPos] = useState(null);
  const handleEnter = (e) => setPos({ x: e.clientX, y: e.clientY });
  const handleLeave = () => setPos(null);
  return (
    <td style={{ padding: "10px 14px" }}>
      <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer"
        onMouseEnter={handleEnter} onMouseMove={handleEnter} onMouseLeave={handleLeave}
        style={{ color: c.text, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", textDecoration: pos ? "underline" : "none", cursor: "pointer" }}>
        {v.title}
      </a>
      {pos && (
        <div style={{ position: "fixed", left: pos.x + 12, top: Math.max(pos.y - 180, 10), zIndex: 9999, background: c.card, border: `1px solid ${c.border}`, borderRadius: 8, padding: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", pointerEvents: "none" }}>
          <img src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} alt="" style={{ width: 240, borderRadius: 4, display: "block" }} />
          <div style={{ fontSize: 11, color: c.textMuted, marginTop: 4, maxWidth: 240, whiteSpace: "normal" }}>{v.title}</div>
        </div>
      )}
    </td>
  );
}

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

// ── Font Size Control ──
function FontSizeControl({ value, onChange, C: c }) {
  const opts = [{ key: "small", label: "A", fs: 10 }, { key: "medium", label: "A", fs: 13 }, { key: "large", label: "A", fs: 16 }];
  return (
    <div style={{ display: "flex", alignItems: "center", border: `1px solid ${c.border}`, borderRadius: 6, overflow: "hidden" }}>
      {opts.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{
          background: value === o.key ? c.accent + "20" : "none", border: "none",
          borderRight: `1px solid ${c.border}`, color: value === o.key ? c.accent : c.textMuted,
          padding: "4px 8px", cursor: "pointer", fontWeight: 700, fontFamily: "serif",
          fontSize: o.fs, lineHeight: 1, transition: "all 0.15s",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

// ── Width Switch ──
function WidthSwitch({ isFullWidth, toggle, C: c }) {
  return (
    <button onClick={toggle} title={isFullWidth ? "切換為置中版面" : "切換為滿版"} style={{
      display: "flex", alignItems: "center", gap: 5,
      background: isFullWidth ? c.accent + "18" : "none",
      border: `1px solid ${isFullWidth ? c.accent : c.border}`,
      borderRadius: 6, color: isFullWidth ? c.accent : c.textMuted,
      padding: "4px 10px", cursor: "pointer", fontSize: 11,
      fontFamily: "'Noto Sans TC', sans-serif", transition: "all 0.2s", whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 14, lineHeight: 1 }}>{isFullWidth ? "⊡" : "⊞"}</span>
      <span>{isFullWidth ? "滿版" : "置中"}</span>
    </button>
  );
}

// ── Channel Funnel ──
function ChannelFunnel({ fullVideos, C: c }) {
  const totalViews = fullVideos.reduce((a, v) => a + v.views, 0);
  const totalSubs = Math.max(fullVideos.reduce((a, v) => a + v.subs, 0), 0);
  const hasImpressions = false;
  const layers = hasImpressions
    ? [{ label: "曝光次數", value: 0, color: c.blue }, { label: "觀看次數", value: totalViews, color: c.accent }, { label: "訂閱增長", value: totalSubs, color: c.green }]
    : [{ label: "觀看次數", value: totalViews, color: c.accent }, { label: "訂閱增長", value: totalSubs, color: c.green }];
  const maxVal = layers[0].value || 1;

  return (
    <Section title="頻道成效漏斗" sub={hasImpressions ? "曝光 → 觀看 → 訂閱" : "觀看 → 訂閱（曝光數據需 Reach Report）"}>
      <Card C={c}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, padding: "20px 0" }}>
          {layers.map((layer, i) => {
            const widthPct = Math.max((layer.value / maxVal) * 100, 15);
            const nextVal = layers[i + 1]?.value;
            const convRate = nextVal != null && layer.value > 0 ? (nextVal / layer.value * 100).toFixed(2) : null;
            return (
              <div key={layer.label} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  width: `${widthPct}%`, minWidth: 120, padding: "16px 20px",
                  background: layer.color + "18", border: `1px solid ${layer.color}40`,
                  borderRadius: 8, textAlign: "center", position: "relative",
                }}>
                  <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 4 }}>{layer.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: layer.color, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(layer.value)}</div>
                </div>
                {convRate && (
                  <div style={{ padding: "6px 0", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: c.textDim, fontSize: 16 }}>↓</span>
                    <span style={{ color: c.accent, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{convRate}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!hasImpressions && (
          <div style={{ textAlign: "center", padding: "8px 0 4px", color: c.textDim, fontSize: 11 }}>
            曝光次數與 CTR 需設定 Reach Report 後才會顯示完整三層漏斗
          </div>
        )}
      </Card>
    </Section>
  );
}

// ── Monthly Trend ──
function MonthlyTrend({ fullVideos, C: c }) {
  const monthlyData = useMemo(() => {
    const map = {};
    fullVideos.forEach(v => {
      if (!v.date) return;
      const month = v.date.substring(0, 7);
      if (!map[month]) map[month] = { month, watchHours: 0, count: 0 };
      map[month].watchHours += v.watchMin / 60;
      map[month].count++;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({ ...m, watchHours: +m.watchHours.toFixed(1) }));
  }, [fullVideos]);

  if (monthlyData.length < 2) return null;

  return (
    <Section title="月趨勢" sub="觀看時數（面積）+ 發布影片數（長條）">
      <Card C={c}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
            <XAxis dataKey="month" stroke={c.textDim} fontSize={11} />
            <YAxis yAxisId="left" stroke={c.accent} fontSize={11} label={{ value: "觀看時數", angle: -90, position: "insideLeft", fill: c.textMuted, fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke={c.blue} fontSize={11} allowDecimals={false} label={{ value: "影片數", angle: 90, position: "insideRight", fill: c.textMuted, fontSize: 11 }} />
            <Tooltip contentStyle={TT(c)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area yAxisId="left" type="monotone" dataKey="watchHours" name="觀看時數" fill={c.accent + "30"} stroke={c.accent} strokeWidth={2} />
            <Bar yAxisId="right" dataKey="count" name="發布影片數" fill={c.blue} radius={[4, 4, 0, 0]} barSize={30} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </Section>
  );
}

// ── Tab: Overview ──
function OverviewTab({ fullVideos, C: c }) {
  const total = fullVideos.reduce((a, v) => ({ views: a.views + v.views, subs: a.subs + v.subs }), { views: 0, subs: 0 });
  const avgCIdx = (fullVideos.reduce((a, v) => a + v.commercialIdx, 0) / fullVideos.length).toFixed(1);

  const showStats = [...new Set(fullVideos.map(v => v.show).filter(Boolean))].map(s => {
    const sv = fullVideos.filter(v => v.show === s);
    if (!sv.length) return null;
    return { show: s, count: sv.length, totalViews: sv.reduce((a, v) => a + v.views, 0), avgViews: Math.round(sv.reduce((a, v) => a + v.views, 0) / sv.length), totalSubs: sv.reduce((a, v) => a + v.subs, 0), avgInteract: +(sv.reduce((a, v) => a + v.interactRate, 0) / sv.length).toFixed(2), avgCommercial: +(sv.reduce((a, v) => a + v.commercialIdx, 0) / sv.length).toFixed(1) };
  }).filter(Boolean).sort((a, b) => b.totalViews - a.totalViews);

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
    <Section title="觀看數 Top 10" sub="點擊欄位標題可排序 ・ 滑鼠移到標題可看完整文字">
      <SortableTable C={c} headers={["#", "節目", "集數", "標題", "流量來源", "觀看", "訂閱", "互動率", "商機"]}
        dataKeys={[null, "show", "ep", "title", "traffic", "views", "subs", "interactRate", "commercialIdx"]}
        data={fullVideos} defaultSortKey="views" maxHeight={520}
        renderRow={(v, i) => (
          <tr key={v.id} style={{ borderBottom: `1px solid ${c.border}` }}>
            <td style={{ padding: "10px 14px", color: c.textDim }}>{i + 1}</td>
            <td style={{ padding: "10px 14px" }}><Tag text={v.show} color={c.colors6[SHOWS.indexOf(v.show) % 6]} C={c} /></td>
            <td title={v.date} style={{ padding: "10px 14px", color: c.textMuted, cursor: "help" }}>{v.ep}</td>
            <VideoTitleCell v={v} C={c} />
            <td style={{ padding: "10px 14px", color: c.textMuted, fontSize: 11, whiteSpace: "nowrap" }}>{v.traffic}</td>
            <td style={{ padding: "10px 14px", color: c.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(v.views)}</td>
            <td style={{ padding: "10px 14px", color: v.subs > 0 ? c.green : v.subs < 0 ? c.red : c.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{v.subs > 0 ? `+${v.subs}` : v.subs}</td>
            <td style={{ padding: "10px 14px", color: c.accent, fontFamily: "'JetBrains Mono', monospace" }}>{v.interactRate}%</td>
            <td style={{ padding: "10px 14px", color: c.accent, fontFamily: "'JetBrains Mono', monospace" }}>{v.commercialIdx}</td>
          </tr>
        )}
      />
    </Section>
    <ChannelFunnel fullVideos={fullVideos} C={c} />
    <MonthlyTrend fullVideos={fullVideos} C={c} />
  </div>);
}

// ── Tab: Commercial Index ──
function CommercialTab({ fullVideos, formulaConfig: cfg = {}, C: c }) {
  const w1 = +(cfg["互動率權重"] ?? 0.25);
  const w2 = +(cfg["訂閱轉換率權重"] ?? 0.25);
  const w3 = +(cfg["觀看時長比權重"] ?? 0.30);
  const w4 = +(cfg["觀看規模權重"] ?? 0.20);
  const iMax = +(cfg["互動率滿分%"] ?? 10);
  const vMax = +(cfg["觀看規模基準"] ?? 30000);
  const sorted = [...fullVideos].sort((a, b) => b.commercialIdx - a.commercialIdx);
  return (<div>
    <Card C={c} style={{ marginBottom: 20, borderLeft: `3px solid ${c.accent}` }}>
      <div style={{ color: c.textMuted, fontSize: 12, marginBottom: 6 }}>商機指標公式 ・ 權重可在 Google Sheet「公式設定」tab 調整</div>
      <div style={{ color: c.text, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
        {w1}×互動率 + {w2}×訂閱轉換率 + {w3}×觀看時長比 + {w4}×觀看規模
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { label: "互動率滿分基準", value: `${iMax}%`, hint: "(按讚+留言+分享)÷觀看" },
          { label: "觀看規模基準", value: `${vMax.toLocaleString()} 次`, hint: "達此觀看數視為滿分" },
        ].map(({ label, value, hint }) => (
          <div key={label} style={{ fontSize: 11, color: c.textDim }}>
            <span style={{ color: c.textMuted }}>{label}：</span>
            <span style={{ color: c.accent, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
            <span style={{ marginLeft: 6 }}>({hint})</span>
          </div>
        ))}
      </div>
    </Card>
    <Section title="商機排行">
      <Card C={c}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sorted.slice(0, 10)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={c.border} horizontal={false} />
            <XAxis type="number" stroke={c.textDim} fontSize={11} domain={[0, 10]} />
            <YAxis type="category" dataKey="ep" stroke={c.textDim} fontSize={11} width={55} />
            <Tooltip contentStyle={TT(c)} content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return <div style={{ ...TT(c), padding: "8px 12px" }}><div style={{ fontWeight: 600, marginBottom: 2 }}>{d.show} {d.ep}</div><div style={{ fontSize: 11, color: c.textMuted, marginBottom: 4, maxWidth: 220 }}>{d.title}</div><div>商機：{d.commercialIdx.toFixed(2)}</div></div>;
            }} />
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
            {sorted.slice(0, 5).map((v, i) => <Radar key={v.ep} name={`${v.ep} ${v.show}`} dataKey={v.ep} stroke={c.colors6[i]} fill={c.colors6[i]} fillOpacity={0.1} strokeWidth={1.5} />)}
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
            <td title={v.date} style={{ padding: "10px 14px", color: c.text, fontWeight: 500, cursor: "help" }}>{v.ep}</td>
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

// ── Old vs New Traffic ──
function OldVsNewTraffic({ fullVideos, C: c }) {
  const { oldVideos, newVideos, oldViews, newViews, oldPct, newPct } = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const old = [], nw = [];
    fullVideos.forEach(v => {
      if (!v.date) return;
      const d = new Date(v.date.replace(/\//g, "-"));
      if (d < cutoff) old.push(v); else nw.push(v);
    });
    const ov = old.reduce((a, v) => a + v.views, 0);
    const nv = nw.reduce((a, v) => a + v.views, 0);
    const total = ov + nv || 1;
    return { oldVideos: old, newVideos: nw, oldViews: ov, newViews: nv, oldPct: +(ov / total * 100).toFixed(1), newPct: +(nv / total * 100).toFixed(1) };
  }, [fullVideos]);

  const top3Old = [...oldVideos].sort((a, b) => b.views - a.views).slice(0, 3);
  const top3New = [...newVideos].sort((a, b) => b.views - a.views).slice(0, 3);
  const pieData = [{ name: `新片 (≤90天)`, value: newViews }, { name: `舊片 (>90天)`, value: oldViews }];
  const pieColors = [c.accent, c.blue];

  return (
    <Section title="舊片 vs 新片流量佔比" sub="以 90 天為分界">
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card C={c} style={{ flex: "1 1 280px", minWidth: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                </Pie>
                <Tooltip contentStyle={TT(c)} formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c.accent }} />
                <span style={{ color: c.text, fontSize: 13 }}>新片</span>
                <span style={{ color: c.accent, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{newPct}%</span>
                <span style={{ color: c.textDim, fontSize: 11 }}>({newVideos.length} 支)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c.blue }} />
                <span style={{ color: c.text, fontSize: 13 }}>舊片</span>
                <span style={{ color: c.blue, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{oldPct}%</span>
                <span style={{ color: c.textDim, fontSize: 11 }}>({oldVideos.length} 支)</span>
              </div>
            </div>
          </div>
        </Card>
        <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 10, minWidth: 260 }}>
          <Card C={c} style={{ borderLeft: `3px solid ${c.accent}` }}>
            <div style={{ fontSize: 12, color: c.accent, fontWeight: 600, marginBottom: 8 }}>新片 Top 3</div>
            {top3New.map((v, i) => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span title={v.title} style={{ color: c.text, fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i + 1}. {v.title}</span>
                <span style={{ color: c.accent, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, marginLeft: 8 }}>{fmt(v.views)}</span>
              </div>
            ))}
          </Card>
          <Card C={c} style={{ borderLeft: `3px solid ${c.blue}` }}>
            <div style={{ fontSize: 12, color: c.blue, fontWeight: 600, marginBottom: 8 }}>舊片 Top 3</div>
            {top3Old.map((v, i) => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span title={v.title} style={{ color: c.text, fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i + 1}. {v.title}</span>
                <span style={{ color: c.blue, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, marginLeft: 8 }}>{fmt(v.views)}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </Section>
  );
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
    <OldVsNewTraffic fullVideos={fullVideos} C={c} />
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
function ABTab({ abTests, abSuggestions, C: c }) {
  const BLOCK_COLORS = { "框架策略": c.accent, "議題包裝": c.teal, "下次測試方向": c.purple };
  const suggBlocks = useMemo(() => {
    const map = {};
    (abSuggestions || []).forEach(({ block, item }) => {
      if (!map[block]) map[block] = [];
      map[block].push(item);
    });
    return Object.entries(map).map(([title, items]) => ({ title, items, color: BLOCK_COLORS[title] || c.accent }));
  }, [abSuggestions]);
  const [expandedRow, setExpandedRow] = useState(null);

  // Stats by test variable
  const varStats = useMemo(() => {
    const map = {};
    abTests.forEach(t => {
      if (!map[t.testVar]) map[t.testVar] = { type: t.testVar, count: 0, totalGap: 0, wins: { A: 0, B: 0 }, eps: [] };
      map[t.testVar].count++;
      map[t.testVar].totalGap += Math.abs(t.ctrB - t.ctrA);
      map[t.testVar].wins[t.winner]++;
      map[t.testVar].eps.push(`${t.show} ${t.ep}`);
    });
    return Object.values(map).map(v => ({ ...v, avgGap: +(v.totalGap / v.count).toFixed(1) }));
  }, []);

  // Stats by emotion framework
  const frameStats = useMemo(() => {
    const map = {};
    abTests.forEach(t => {
      [{ frame: t.frameA, ctr: t.ctrA, won: t.winner === "A", ep: t.ep, show: t.show }, { frame: t.frameB, ctr: t.ctrB, won: t.winner === "B", ep: t.ep, show: t.show }].forEach(({ frame, ctr, won, ep, show }) => {
        if (!map[frame]) map[frame] = { frame, totalCTR: 0, count: 0, wins: 0, eps: [] };
        map[frame].totalCTR += ctr; map[frame].count++; if (won) map[frame].wins++;
        map[frame].eps.push(`${show} ${ep}`);
      });
    });
    return Object.values(map).map(f => ({ ...f, avgCTR: +(f.totalCTR / f.count).toFixed(1), winRate: Math.round(f.wins / f.count * 100) })).sort((a, b) => b.winRate - a.winRate);
  }, []);

  const frameColorMap = { "好奇懸念": c.accent, "恐懼損失": c.red, "實用承諾": c.blue, "權威背書": c.purple, "情感共鳴": c.pink, "社會認同": c.teal };

  return (<div>
    {/* KPI row */}
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <KPI label="總測試次數" value={abTests.length} C={c} title={abTests.map(t => `${t.show} ${t.ep}`).join("\n")} />
      <KPI label="B 版勝出率" value={`${Math.round(abTests.filter(t => t.winner === "B").length / abTests.length * 100)}%`} color={c.green} C={c} title={`B 勝出：\n${abTests.filter(t => t.winner === "B").map(t => `${t.show} ${t.ep}`).join("\n")}`} />
      <KPI label="平均 CTR 差距" value={`${(abTests.reduce((a, t) => a + Math.abs(t.ctrB - t.ctrA), 0) / abTests.length).toFixed(1)}%`} color={c.accent} C={c} title={abTests.map(t => `${t.show} ${t.ep}: ${Math.abs(t.ctrB - t.ctrA).toFixed(1)}%`).join("\n")} />
      <KPI label="最大 CTR 差距" value={`${Math.max(...abTests.map(t => Math.abs(t.ctrB - t.ctrA))).toFixed(1)}%`} sub={(() => { const t = abTests.reduce((a, b) => Math.abs(b.ctrB - b.ctrA) > Math.abs(a.ctrB - a.ctrA) ? b : a); return `${t.show} ${t.ep}`; })()} color={c.coral} C={c} />
    </div>

    {/* Test Variable Analysis */}
    <Section title="測試變數效益分析" sub="議題包裝 vs 情緒框架 vs 混合，哪種測試方向 CTR 差距最大？">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {varStats.map(v => (
          <Card key={v.type} C={c} style={{ flex: "1 1 180px", minWidth: 170, cursor: "help" }}>
            <div title={v.eps.join("\n")} style={{ color: c.text, fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{v.type}</div>
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
          <Card key={f.frame} C={c} style={{ flex: "1 1 120px", minWidth: 120, padding: 14, cursor: "default" }}>
            <div title={f.eps.join("\n")} style={{ fontSize: 11, color: c.textMuted, marginBottom: 4 }}>{f.frame}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: frameColorMap[f.frame] || c.accent, fontFamily: "'JetBrains Mono', monospace" }}>{f.winRate}%</div>
            <div title={f.eps.join("、")} style={{ fontSize: 10, color: c.textDim, marginTop: 2, cursor: "help" }}>平均 CTR {f.avgCTR}% ・ {f.count} 次</div>
          </Card>
        ))}
      </div>
    </Section>

    {/* AB Test Detail Table */}
    <Section title="每次測試詳情" sub="點擊欄位標題排序 ・ 點「更多分析」展開詳細說明">
      <SortableTable C={c}
        headers={["集數", "節目", "測試變數", "A 文案", "B 文案", "CTR 對比", "差距", "勝出", ""]}
        dataKeys={["ep", "show", "testVar", "copyA", "copyB", null, "gap", "winner", null]}
        data={abTests.map(t => ({ ...t, gap: +(t.ctrB - t.ctrA).toFixed(1) }))}
        renderRow={(t, i) => {
          const maxCTR = Math.max(t.ctrA, t.ctrB) || 1;
          const isExpanded = expandedRow === t.ep;
          return [
            <tr key={t.ep} style={{ borderBottom: isExpanded ? "none" : `1px solid ${c.border}`, background: isExpanded ? c.sortHover : "transparent", transition: "background 0.15s" }}>
              <td title={t.date} style={{ padding: "12px 14px", color: c.text, fontWeight: 500, cursor: "help" }}>{t.ep}</td>
              <td style={{ padding: "12px 14px" }}><Tag text={t.show} color={c.colors6[SHOWS.indexOf(t.show) % 6]} C={c} /></td>
              <td title={`A: ${t.topicAngleA || t.angleA || t.frameA}\nB: ${t.topicAngleB || t.angleB || t.frameB}`} style={{ padding: "12px 14px", cursor: "help" }}><Tag text={t.testVar} color={t.testVar === "情緒框架" ? c.purple : t.testVar === "議題包裝" ? c.teal : c.coral} C={c} /></td>
              <td title={t.copyA} style={{ padding: "12px 14px", color: t.winner === "A" ? c.green : c.textMuted, fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "default" }}>{t.copyA}</td>
              <td title={t.copyB} style={{ padding: "12px 14px", color: t.winner === "B" ? c.green : c.textMuted, fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "default" }}>{t.copyB}</td>
              <td style={{ padding: "12px 14px", minWidth: 160 }}>
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
              </td>
              <td style={{ padding: "12px 14px", fontFamily: "'JetBrains Mono', monospace", color: t.gap > 2 ? c.green : t.gap > 1 ? c.accent : c.textMuted, fontWeight: 600 }}>+{Math.abs(t.gap).toFixed(1)}%</td>
              <td style={{ padding: "12px 14px" }}><span style={{ background: c.green + "18", color: c.green, padding: "2px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{t.winner}</span></td>
              <td style={{ padding: "12px 14px" }}>
                <button onClick={() => setExpandedRow(isExpanded ? null : t.ep)} style={{
                  background: isExpanded ? c.accent + "18" : "none",
                  border: `1px solid ${isExpanded ? c.accent : c.border}`,
                  borderRadius: 6, color: isExpanded ? c.accent : c.textMuted,
                  cursor: "pointer", padding: "4px 10px", fontSize: 11,
                  fontFamily: "'Noto Sans TC', sans-serif", whiteSpace: "nowrap", transition: "all 0.15s",
                }}>
                  {isExpanded ? "▲ 收起" : "更多分析 ▼"}
                </button>
              </td>
            </tr>,
            isExpanded && (
              <tr key={`${t.ep}-detail`} style={{ borderBottom: `1px solid ${c.border}` }}>
                <td colSpan={9} style={{ padding: 0 }}>
                  <div style={{ padding: 20, background: c.cardAlt, borderTop: `1px solid ${c.border}` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.text, marginBottom: 14 }}>{t.ep} AB 分析</div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                      <div style={{ flex: "1 1 200px", padding: 12, background: t.winner === "A" ? c.green + "12" : c.card, borderRadius: 8, border: `1px solid ${t.winner === "A" ? c.green + "40" : c.border}` }}>
                        <div style={{ fontSize: 10, color: c.textDim, marginBottom: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span>版本 A・{t.frameA}</span>
                          {t.topicAngleA && <span style={{ color: c.accent, background: c.accent + "15", padding: "1px 6px", borderRadius: 4 }}>{t.topicAngleA}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: c.text, marginBottom: 8, lineHeight: 1.5 }}>{t.copyA}</div>
                        {t.angleA && <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>設計脈絡：{t.angleA}</div>}
                        <div style={{ fontSize: 18, fontWeight: 700, color: t.winner === "A" ? c.green : c.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{t.ctrA}%</div>
                      </div>
                      <div style={{ flex: "1 1 200px", padding: 12, background: t.winner === "B" ? c.green + "12" : c.card, borderRadius: 8, border: `1px solid ${t.winner === "B" ? c.green + "40" : c.border}` }}>
                        <div style={{ fontSize: 10, color: c.textDim, marginBottom: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span>版本 B・{t.frameB}</span>
                          {t.topicAngleB && <span style={{ color: c.accent, background: c.accent + "15", padding: "1px 6px", borderRadius: 4 }}>{t.topicAngleB}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: c.text, marginBottom: 8, lineHeight: 1.5 }}>{t.copyB}</div>
                        {t.angleB && <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>設計脈絡：{t.angleB}</div>}
                        <div style={{ fontSize: 18, fontWeight: 700, color: t.winner === "B" ? c.green : c.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{t.ctrB}%</div>
                      </div>
                    </div>
                    {t.conclusion && <div style={{ fontSize: 12, color: c.accent, lineHeight: 1.6, marginBottom: 8, padding: "8px 12px", background: c.accent + "10", borderRadius: 6, borderLeft: `3px solid ${c.accent}` }}>結論：{t.conclusion}</div>}
                    {t.suggestion && <div style={{ fontSize: 11, color: c.textMuted, lineHeight: 1.6, padding: "8px 12px", background: c.card, borderRadius: 6, border: `1px solid ${c.border}` }}>未來建議：{t.suggestion}</div>}
                  </div>
                </td>
              </tr>
            ),
          ];
        }}
      />
    </Section>

    {suggBlocks.length > 0 && (
      <Section title="未來 AB Test 建議" sub="根據歷史數據推導的下一步方向">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {suggBlocks.map(b => (
            <Card key={b.title} C={c} style={{ borderTop: `3px solid ${b.color}` }}>
              <div style={{ color: b.color, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{b.title}</div>
              {b.items.map((item, j) => (
                <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: b.color, fontSize: 8, marginTop: 5 }}>●</span>
                  <span style={{ color: c.textMuted, fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item}</span>
                </div>
              ))}
            </Card>
          ))}
        </div>
      </Section>
    )}
  </div>);
}

// ── Subscriber Analysis ──
function SubscriberAnalysis({ videos, C: c }) {
  const hasData = videos.some(v => v.subscribedViews > 0 || v.unsubscribedViews > 0);
  if (!hasData) {
    return (
      <Section title="訂閱者 vs 非訂閱者" sub="觀看行為比較">
        <Card C={c}><div style={{ textAlign: "center", padding: 30, color: c.textDim, fontSize: 13 }}>待腳本更新後填入數據</div></Card>
      </Section>
    );
  }
  const totalSubViews = videos.reduce((a, v) => a + v.subscribedViews, 0);
  const totalUnsubViews = videos.reduce((a, v) => a + v.unsubscribedViews, 0);
  const totalSubMin = videos.reduce((a, v) => a + v.subscribedMinutes, 0);
  const totalUnsubMin = videos.reduce((a, v) => a + v.unsubscribedMinutes, 0);
  const totalMin = totalSubMin + totalUnsubMin || 1;
  const subMinPct = +(totalSubMin / totalMin * 100).toFixed(1);
  const unsubMinPct = +(totalUnsubMin / totalMin * 100).toFixed(1);
  const subAvgWatch = totalSubViews > 0 ? +(totalSubMin / totalSubViews).toFixed(1) : 0;
  const unsubAvgWatch = totalUnsubViews > 0 ? +(totalUnsubMin / totalUnsubViews).toFixed(1) : 0;

  const pieData = [{ name: "訂閱者", value: totalSubMin }, { name: "非訂閱者", value: totalUnsubMin }];
  const colors = [c.green, c.blue];

  return (
    <Section title="訂閱者 vs 非訂閱者" sub="觀看行為比較">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card C={c} style={{ flex: "1 1 260px", minWidth: 240 }}>
          <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 12 }}>觀看時間佔比</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={colors[i]} />)}
                </Pie>
                <Tooltip contentStyle={TT(c)} formatter={v => `${(v / 60).toFixed(0)} hr`} />
              </PieChart>
            </ResponsiveContainer>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c.green }} />
                <span style={{ color: c.text, fontSize: 12 }}>訂閱者</span>
                <span style={{ color: c.green, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{subMinPct}%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c.blue }} />
                <span style={{ color: c.text, fontSize: 12 }}>非訂閱者</span>
                <span style={{ color: c.blue, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{unsubMinPct}%</span>
              </div>
            </div>
          </div>
        </Card>
        <Card C={c} style={{ flex: "1 1 260px", minWidth: 240 }}>
          <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 12 }}>平均觀看時長比較（分鐘/次）</div>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-end", padding: "20px 0" }}>
            {[{ label: "訂閱者", val: subAvgWatch, color: c.green }, { label: "非訂閱者", val: unsubAvgWatch, color: c.blue }].map(b => (
              <div key={b.label} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                  <div style={{ width: 50, background: b.color + "30", border: `1px solid ${b.color}`, borderRadius: "6px 6px 0 0", height: `${Math.max((b.val / Math.max(subAvgWatch, unsubAvgWatch, 1)) * 80, 10)}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: b.color, fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{b.val}</span>
                  </div>
                </div>
                <div style={{ color: c.textMuted, fontSize: 11, marginTop: 6 }}>{b.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Section>
  );
}

// ── Search Terms ──
function SearchTermsChart({ videos, C: c }) {
  const termsData = useMemo(() => {
    const map = {};
    videos.forEach(v => {
      if (!v.searchTerms) return;
      v.searchTerms.split(", ").forEach(s => {
        const match = s.match(/^(.+)\s*\((\d+)\)$/);
        if (match) {
          const term = match[1].trim(), views = +match[2];
          map[term] = (map[term] || 0) + views;
        }
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([term, views]) => ({ term, views }));
  }, [videos]);

  if (!termsData.length) {
    return (
      <Section title="熱門搜尋字詞" sub="前 10 個搜尋關鍵字">
        <Card C={c}><div style={{ textAlign: "center", padding: 30, color: c.textDim, fontSize: 13 }}>待腳本更新後填入數據</div></Card>
      </Section>
    );
  }

  return (
    <Section title="熱門搜尋字詞" sub="前 10 個搜尋關鍵字（依觀看數排序）">
      <Card C={c}>
        <ResponsiveContainer width="100%" height={Math.max(termsData.length * 36, 180)}>
          <BarChart data={termsData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.border} horizontal={false} />
            <XAxis type="number" stroke={c.textDim} fontSize={11} />
            <YAxis type="category" dataKey="term" stroke={c.textDim} fontSize={11} width={120} tick={{ fill: c.text }} />
            <Tooltip contentStyle={TT(c)} />
            <Bar dataKey="views" name="觀看次數" fill={c.teal} radius={[0, 5, 5, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </Section>
  );
}

// ── Competitor Channels ──
const COMPETITOR_CHANNELS = [
  { cat: "財經理財", name: "游庭皓的財經皓角", subs: "65.0萬", url: "https://www.youtube.com/@yutinghao" },
  { cat: "財經理財", name: "鈔錢部署－華視優選", subs: "68.8萬", url: "https://www.youtube.com/@moneysmartctstv" },
  { cat: "財經理財", name: "TVBS財經", subs: "59.7萬", url: "https://www.youtube.com/@tvbsmoney" },
  { cat: "財經理財", name: "玩股網楚狂人", subs: "11.0萬", url: "https://www.youtube.com/@wantgoo" },
  { cat: "財經理財", name: "自由女神邱沁宜", subs: "26.6萬", url: "https://www.youtube.com/@ladylibertytw" },
  { cat: "財經理財", name: "哈佛商業評論", subs: "10.2萬", url: "https://www.youtube.com/@haborhbr" },
  { cat: "財經理財", name: "李永年", subs: "16.7萬", url: "https://www.youtube.com/@leon888" },
  { cat: "新聞談話", name: "新聞挖挖哇！", subs: "135.0萬", url: "https://www.youtube.com/@newswawawa" },
  { cat: "新聞談話", name: "風傳媒 The Storm Media", subs: "246.0萬", url: "https://www.youtube.com/@stormmedia" },
  { cat: "新聞談話", name: "關我什麼事", subs: "49.7萬", url: "https://www.youtube.com/@gwsms" },
  { cat: "新聞談話", name: "震震有詞", subs: "3.3萬", url: "https://www.youtube.com/@zzyzshow" },
  { cat: "心理成長", name: "Sherry's Notes 雪力的心理學筆記", subs: "52.8萬", url: "https://www.youtube.com/@sherrynotes" },
  { cat: "商業創業", name: "陳修平的師父商學院", subs: "8.2萬", url: "https://www.youtube.com/@joeychen-shifu" },
  { cat: "綜合知識", name: "小宇宙大爆發", subs: "48.0萬", url: "https://www.youtube.com/@bigbanguniverse" },
  { cat: "綜合知識", name: "天天都有新鮮事", subs: "9.8萬", url: "https://www.youtube.com/@dailyfresh" },
];

const CAT_COLORS = { "財經理財": "#E8A630", "新聞談話": "#3B82F6", "心理成長": "#D946A8", "商業創業": "#14B8A6", "綜合知識": "#8B5CF6" };

function CompetitorChannels({ C: c }) {
  const grouped = useMemo(() => {
    const map = {};
    COMPETITOR_CHANNELS.forEach(ch => {
      if (!map[ch.cat]) map[ch.cat] = [];
      map[ch.cat].push(ch);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, []);

  return (
    <Section title="觀眾也在看的頻道" sub="YouTube Studio → 觀眾 → 觀眾觀賞的頻道">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {grouped.map(([cat, channels]) => {
          const color = CAT_COLORS[cat] || c.accent;
          return (
            <Card key={cat} C={c} style={{ borderTop: `3px solid ${color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ color, fontSize: 14, fontWeight: 700 }}>{cat}</span>
                <span style={{ color: c.textDim, fontSize: 11 }}>{channels.length} 個頻道</span>
              </div>
              {channels.map(ch => (
                <div key={ch.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${c.border}` }}>
                  <a href={ch.url} target="_blank" rel="noopener noreferrer"
                    style={{ color: c.text, fontSize: 12, textDecoration: "none", cursor: "pointer" }}
                    onMouseEnter={e => e.target.style.textDecoration = "underline"}
                    onMouseLeave={e => e.target.style.textDecoration = "none"}>
                    {ch.name}
                  </a>
                  <span style={{ color: c.textMuted, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, marginLeft: 8 }}>{ch.subs}</span>
                </div>
              ))}
              {cat === "財經理財" && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: color + "12", borderRadius: 6, fontSize: 11, color: c.textMuted, lineHeight: 1.6 }}>
                  <span style={{ color, fontWeight: 600 }}>洞察：</span>觀眾高度重疊財經類頻道，財務安全感是最強 TA 驅動力
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: 10, color: c.textDim, textAlign: "center" }}>
        資料來源：YouTube Studio → 觀眾 → 觀眾觀賞的頻道 ・ 最後更新：2026/05/15
      </div>
    </Section>
  );
}

// ── Activity Heatmap ──
const ACTIVITY_DATA = {
  hours: ["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23"],
  days: ["週日","週一","週二","週三","週四","週五","週六"],
  data: [
    [3,2,1,1,0,0,1,2,4,5,5,6,7,7,6,6,6,7,8,9,9,8,6,4],
    [3,2,1,1,0,0,1,3,5,6,6,6,6,6,6,6,7,8,9,10,10,9,7,5],
    [3,2,1,1,0,0,1,3,5,6,6,6,6,6,6,6,7,8,9,10,10,9,7,5],
    [3,2,1,1,0,0,1,3,5,6,6,6,6,6,6,6,7,8,9,10,10,9,7,5],
    [3,2,1,1,0,0,1,3,5,6,6,6,6,6,6,6,7,8,9,10,10,9,7,5],
    [3,2,1,1,0,0,1,3,5,6,6,7,7,7,6,6,7,8,9,10,9,8,7,5],
    [4,3,2,1,1,0,1,2,4,5,6,7,8,7,7,7,7,8,9,9,9,8,7,5],
  ],
};

function ActivityHeatmap({ C: c }) {
  const [tip, setTip] = useState(null);
  const isDark = c.bg === "#08080A";
  const purple = isDark ? [139, 92, 246] : [124, 58, 237];

  const cellColor = (val) => {
    const t = val / 10;
    if (isDark) {
      const a = Math.max(t * 0.9 + 0.1, 0.08);
      return `rgba(${purple[0]},${purple[1]},${purple[2]},${a.toFixed(2)})`;
    }
    const r = Math.round(245 - t * (245 - purple[0]));
    const g = Math.round(243 - t * (243 - purple[1]));
    const b = Math.round(238 - t * (238 - purple[2]));
    return `rgb(${r},${g},${b})`;
  };

  return (
    <Section title="觀眾活躍時段" sub="最近 28 天 ・ GMT+0800">
      <Card C={c}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "inline-grid", gridTemplateColumns: `40px repeat(24, 20px)`, gridTemplateRows: `repeat(7, 20px) 20px`, gap: 3, alignItems: "center" }}>
            {ACTIVITY_DATA.days.map((day, di) => (
              [
                <div key={`l-${di}`} style={{ fontSize: 10, color: c.textMuted, textAlign: "right", paddingRight: 6, whiteSpace: "nowrap" }}>{day}</div>,
                ...ACTIVITY_DATA.hours.map((hr, hi) => {
                  const val = ACTIVITY_DATA.data[di][hi];
                  return (
                    <div key={`${di}-${hi}`}
                      onMouseEnter={(e) => setTip({ day, hr, val, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTip(null)}
                      style={{ width: 20, height: 20, borderRadius: 3, background: cellColor(val), cursor: "default", transition: "transform 0.1s" }}
                      onMouseOver={e => e.currentTarget.style.transform = "scale(1.3)"}
                      onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                    />
                  );
                }),
              ]
            ))}
            {/* X-axis labels row */}
            <div />
            {ACTIVITY_DATA.hours.map((hr, i) => (
              <div key={`x-${i}`} style={{ fontSize: 9, color: c.textDim, textAlign: "center" }}>{i % 3 === 0 ? hr : ""}</div>
            ))}
          </div>
        </div>

        {tip && (
          <div style={{ position: "fixed", left: tip.x + 10, top: tip.y - 40, zIndex: 9999, background: c.card, border: `1px solid ${c.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 11, color: c.text, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", pointerEvents: "none", whiteSpace: "nowrap" }}>
            {tip.day} {tip.hr}:00　活躍度 <strong style={{ color: c.purple }}>{tip.val}</strong>/10
          </div>
        )}

        <div style={{ marginTop: 14, padding: "8px 12px", background: c.purple + "12", borderRadius: 6, borderLeft: `3px solid ${c.purple}`, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
          <span style={{ color: c.purple, fontWeight: 600 }}>最佳上架時段：</span>平日 17:00-18:00，讓影片在觀眾最活躍的 19:00-22:00 累積初始曝光
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 10, fontSize: 10, color: c.textDim }}>
          <span>低</span>
          {[0, 2.5, 5, 7.5, 10].map(v => (
            <div key={v} style={{ width: 14, height: 14, borderRadius: 2, background: cellColor(v) }} />
          ))}
          <span>高</span>
        </div>
      </Card>
    </Section>
  );
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
    <SubscriberAnalysis videos={sv} C={c} />
    <SearchTermsChart videos={sv} C={c} />
    <ActivityHeatmap C={c} />
    <CompetitorChannels C={c} />
  </div>);
}

// ── Tab: Revenue ──
function RevenueTab({ fullVideos, C: c }) {
  const hasRevenue = fullVideos.some(v => v.estimatedRevenue > 0);

  if (!hasRevenue) {
    return (
      <div>
        <Card C={c} style={{ textAlign: "center", padding: 50 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>$</div>
          <div style={{ fontSize: 16, color: c.text, fontWeight: 600, marginBottom: 8 }}>收益數據尚未填入</div>
          <div style={{ fontSize: 13, color: c.textMuted, lineHeight: 1.8 }}>
            待腳本更新後填入<br />
            需要在 Google Cloud Console 啟用 YouTube Analytics (Monetary) API<br />
            並確認頻道已開啟營利功能
          </div>
        </Card>
      </div>
    );
  }

  const totalRevenue = fullVideos.reduce((a, v) => a + v.estimatedRevenue, 0);
  const totalViews = fullVideos.reduce((a, v) => a + v.views, 0);
  const avgRPM = totalViews > 0 ? +(totalRevenue / totalViews * 1000).toFixed(2) : 0;

  const showRevenue = useMemo(() => {
    const map = {};
    fullVideos.forEach(v => {
      if (!v.show || v.estimatedRevenue <= 0) return;
      if (!map[v.show]) map[v.show] = { show: v.show, revenue: 0, views: 0, count: 0 };
      map[v.show].revenue += v.estimatedRevenue;
      map[v.show].views += v.views;
      map[v.show].count++;
    });
    return Object.values(map).map(s => ({
      ...s, rpm: s.views > 0 ? +(s.revenue / s.views * 1000).toFixed(2) : 0,
      avgRevenue: +(s.revenue / s.count).toFixed(2),
    })).sort((a, b) => b.revenue - a.revenue);
  }, [fullVideos]);

  const topEarners = [...fullVideos].filter(v => v.estimatedRevenue > 0).sort((a, b) => b.estimatedRevenue - a.estimatedRevenue).slice(0, 10);

  return (<div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <KPI label="總預估收益" value={`$${totalRevenue.toFixed(0)}`} color={c.green} C={c} />
      <KPI label="平均 RPM" value={`$${avgRPM}`} sub="每千次觀看收益" color={c.accent} C={c} />
      <KPI label="有收益影片" value={fullVideos.filter(v => v.estimatedRevenue > 0).length} sub={`共 ${fullVideos.length} 支`} C={c} />
    </div>

    <Section title="各節目 RPM 比較">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {showRevenue.map(s => (
          <Card key={s.show} C={c} style={{ flex: "1 1 200px", minWidth: 180 }}>
            <div style={{ color: c.text, fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{s.show}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: c.textMuted, fontSize: 11 }}>總收益</span>
              <span style={{ color: c.green, fontFamily: "'JetBrains Mono', monospace" }}>${s.revenue.toFixed(0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: c.textMuted, fontSize: 11 }}>RPM</span>
              <span style={{ color: c.accent, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>${s.rpm}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: c.textMuted, fontSize: 11 }}>平均每集收益</span>
              <span style={{ color: c.text, fontFamily: "'JetBrains Mono', monospace" }}>${s.avgRevenue}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: c.textMuted, fontSize: 11 }}>集數</span>
              <span style={{ color: c.textMuted }}>{s.count}</span>
            </div>
          </Card>
        ))}
      </div>
    </Section>

    {showRevenue.length > 1 && (
      <Section title="節目 RPM 分布">
        <Card C={c}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={showRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
              <XAxis dataKey="show" stroke={c.textDim} fontSize={11} />
              <YAxis stroke={c.textDim} fontSize={11} />
              <Tooltip contentStyle={TT(c)} formatter={v => `$${v}`} />
              <Bar dataKey="rpm" name="RPM" fill={c.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Section>
    )}

    <Section title="收益 Top 10" sub="依預估收益排序">
      <SortableTable C={c} headers={["集數", "節目", "標題", "觀看", "預估收益", "CPM", "播放CPM"]}
        dataKeys={["ep", "show", "title", "views", "estimatedRevenue", "cpm", "playbackCpm"]}
        data={topEarners}
        renderRow={(v, i) => (
          <tr key={v.id} style={{ borderBottom: `1px solid ${c.border}` }}>
            <td style={{ padding: "10px 14px", color: c.text, fontWeight: 500 }}>{v.ep}</td>
            <td style={{ padding: "10px 14px" }}><Tag text={v.show} color={c.colors6[SHOWS.indexOf(v.show) % 6]} C={c} /></td>
            <td title={v.title} style={{ padding: "10px 14px", color: c.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</td>
            <td style={{ padding: "10px 14px", color: c.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(v.views)}</td>
            <td style={{ padding: "10px 14px", color: c.green, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>${v.estimatedRevenue.toFixed(2)}</td>
            <td style={{ padding: "10px 14px", color: c.accent, fontFamily: "'JetBrains Mono', monospace" }}>${v.cpm.toFixed(2)}</td>
            <td style={{ padding: "10px 14px", color: c.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>${v.playbackCpm.toFixed(2)}</td>
          </tr>
        )}
      />
    </Section>

    <Section title="各市場觀看與 CPM 比較">
      <Card C={c}>
        <div style={{ textAlign: "center", padding: 30, color: c.textDim, fontSize: 13 }}>
          待腳本新增國家/地區維度後填入（TW, US, HK 等）
        </div>
      </Card>
    </Section>
  </div>);
}

// ── Show color helper ──
const SHOW_COLORS = (c) => ({ "授ㄉㄟ私捏": c.green, "防詐特攻隊": c.coral, "醫起好健康": c.blue });
const SHOW_SHORT = { "授ㄉㄟ私捏": "授", "防詐特攻隊": "詐", "醫起好健康": "醫" };
function fmtDateShort(dateStr) {
  if (!dateStr) return "";
  const m = dateStr.match(/(\d+)\/(\d+)\/(\d+)/);
  return m ? `${+m[2]}/${+m[3]}` : dateStr.substring(5, 10);
}

// ── Tab: TA Topic Analysis ──
function TATopicTab({ fullVideos, C: c }) {
  const sc = SHOW_COLORS(c);
  const showNames = ["授ㄉㄟ私捏", "防詐特攻隊", "醫起好健康"];
  const mono = "'JetBrains Mono', monospace";

  // ─── 1. Data Highlights KPI ───
  const highlights = useMemo(() => {
    if (!fullVideos.length) return [];
    const topViews = [...fullVideos].sort((a, b) => b.views - a.views)[0];
    const topImpressions = [...fullVideos].filter(v => v.impressions > 0).sort((a, b) => b.impressions - a.impressions)[0];
    const topWatch = [...fullVideos].sort((a, b) => b.watchSec - a.watchSec)[0];
    const items = [
      { label: "最高觀看", value: fmt(topViews.views), sub: topViews.ep || topViews.title.substring(0, 15), color: c.accent },
    ];
    if (topImpressions) items.push({ label: "最高曝光", value: fmt(topImpressions.impressions), sub: topImpressions.ep || topImpressions.title.substring(0, 15), color: c.blue });
    items.push({ label: "最長均長", value: topWatch.avgWatch, sub: topWatch.ep || topWatch.title.substring(0, 15), color: c.green });
    showNames.forEach(s => {
      const sv = fullVideos.filter(v => v.show === s);
      if (!sv.length) return;
      const latest = sv.sort((a, b) => b.date.localeCompare(a.date))[0];
      items.push({ label: `${SHOW_SHORT[s]}最新`, value: fmt(latest.views), sub: latest.ep || fmtDateShort(latest.date), color: sc[s] });
    });
    return items;
  }, [fullVideos]);

  // ─── 2. Chart data (sorted by date) ───
  const chartData = useMemo(() =>
    [...fullVideos].sort((a, b) => a.date.localeCompare(b.date)).map(v => ({
      ...v,
      label: `${SHOW_SHORT[v.show] || "?"}${fmtDateShort(v.date)}`,
      fill: sc[v.show] || c.textDim,
    }))
  , [fullVideos]);
  const hasImpressions = fullVideos.some(v => v.impressions > 0);

  // ─── 3. Retention data ───
  const retentionData = useMemo(() =>
    [...fullVideos].sort((a, b) => b.watchSec - a.watchSec).slice(0, 15).map(v => ({
      label: `${SHOW_SHORT[v.show] || ""}${v.ep || fmtDateShort(v.date)}`,
      watchSec: v.watchSec,
      avgWatch: v.avgWatch,
      fill: sc[v.show] || c.textDim,
    }))
  , [fullVideos]);

  // ─── 4. TA Topic Preference per show ───
  const showTopics = useMemo(() => {
    return showNames.map(s => {
      const sv = fullVideos.filter(v => v.show === s);
      if (!sv.length) return null;
      const avgViews = sv.reduce((a, v) => a + v.views, 0) / sv.length;
      const topics = sv.map(v => {
        const tier = v.views > avgViews * 2 ? "爆" : v.views < avgViews * 0.5 ? "低" : "穩";
        return { ...v, tier, avgViews };
      }).sort((a, b) => b.views - a.views);

      const topicMap = {};
      sv.forEach(v => {
        const t = v.topic || "未分類";
        if (!topicMap[t]) topicMap[t] = { views: 0, count: 0 };
        topicMap[t].views += v.views; topicMap[t].count++;
      });
      const sorted = Object.entries(topicMap).sort((a, b) => b[1].views / b[1].count - a[1].views / a[1].count);
      const best = sorted[0]?.[0] || "";
      const worst = sorted[sorted.length - 1]?.[0] || "";
      const bestAvg = sorted[0] ? Math.round(sorted[0][1].views / sorted[0][1].count) : 0;
      const worstAvg = sorted.length > 1 ? Math.round(sorted[sorted.length - 1][1].views / sorted[sorted.length - 1][1].count) : 0;
      let insight = "";
      if (best && worst && best !== worst) {
        insight = `「${best}」平均觀看 ${fmt(bestAvg)} 為最強選題，「${worst}」僅 ${fmt(worstAvg)}，建議調整包裝或縮減比例。`;
      } else if (best) {
        insight = `「${best}」是表現最穩的選題方向，平均 ${fmt(bestAvg)} 觀看。`;
      }
      return { show: s, color: sc[s], topics, avgViews, insight, count: sv.length };
    }).filter(Boolean);
  }, [fullVideos]);

  // ─── 5. Cross-show insights ───
  const crossInsights = useMemo(() => {
    const ins = [];
    const topicAll = {};
    fullVideos.forEach(v => {
      const t = v.topic || "未分類";
      if (!topicAll[t]) topicAll[t] = { views: 0, count: 0, watchSec: 0 };
      topicAll[t].views += v.views; topicAll[t].count++; topicAll[t].watchSec += v.watchSec;
    });
    const topicArr = Object.entries(topicAll).map(([t, d]) => ({ topic: t, avgViews: Math.round(d.views / d.count), avgWatch: Math.round(d.watchSec / d.count), total: d.views, count: d.count }));
    const bestTopic = topicArr.sort((a, b) => b.avgViews - a.avgViews)[0];
    if (bestTopic) ins.push({ num: "01", title: "最強選題類別", text: `「${bestTopic.topic}」跨節目平均觀看 ${fmt(bestTopic.avgViews)}，共 ${bestTopic.count} 集，是受眾最買單的內容方向。` });

    const concrete = fullVideos.filter(v => /理財|法律|詐騙|健康|醫/.test(v.topic));
    const abstract = fullVideos.filter(v => /心理|自我|命理|職場/.test(v.topic));
    if (concrete.length && abstract.length) {
      const cAvg = Math.round(concrete.reduce((a, v) => a + v.views, 0) / concrete.length);
      const aAvg = Math.round(abstract.reduce((a, v) => a + v.views, 0) / abstract.length);
      ins.push({ num: "02", title: "具體 vs 抽象議題", text: `具體議題（理財/法律/健康）平均 ${fmt(cAvg)}，抽象議題（心理/命理/職場）平均 ${fmt(aAvg)}。${cAvg > aAvg ? "具體痛點類內容更容易引發點擊。" : "抽象心理類反而更吸引受眾好奇心。"}` });
    }

    const longestTopic = [...topicArr].sort((a, b) => b.avgWatch - a.avgWatch)[0];
    if (longestTopic) {
      const mm = Math.floor(longestTopic.avgWatch / 60);
      const ss = longestTopic.avgWatch % 60;
      ins.push({ num: "03", title: "留存最強選題", text: `「${longestTopic.topic}」平均觀看 ${mm}:${String(ss).padStart(2, "0")}，留存率領先，適合做深度長片或系列企劃。` });
    }

    const showAvg = showNames.map(s => {
      const sv = fullVideos.filter(v => v.show === s);
      return sv.length ? { show: s, avg: Math.round(sv.reduce((a, v) => a + v.views, 0) / sv.length), count: sv.length } : null;
    }).filter(Boolean);
    const weakest = showAvg.sort((a, b) => a.avg - b.avg)[0];
    if (weakest) ins.push({ num: "04", title: `${weakest.show} 瓶頸分析`, text: `「${weakest.show}」平均觀看 ${fmt(weakest.avg)}（${weakest.count} 集），為三節目中最低。建議強化縮圖文案的好奇懸念框架，並測試不同選題包裝。` });

    return ins;
  }, [fullVideos]);

  // ─── 6. Weakest show recommendations ───
  const recommendations = useMemo(() => {
    const showAvg = showNames.map(s => {
      const sv = fullVideos.filter(v => v.show === s);
      return sv.length ? { show: s, avg: Math.round(sv.reduce((a, v) => a + v.views, 0) / sv.length) } : null;
    }).filter(Boolean);
    const w = showAvg.sort((a, b) => a.avg - b.avg)[0];
    if (!w) return { show: "", items: [] };
    return {
      show: w.show,
      items: [
        { tag: "縮圖策略", color: c.red, items: [`${w.show} 目前 CTR 偏低，建議採用「好奇懸念」框架`, "加入具體數字或反差語句提升點擊衝動"] },
        { tag: "分發策略", color: c.blue, items: ["發布後 2 小時內分享到相關社群與 LINE 群組", "善用 Shorts 為完整集導流"] },
        { tag: "選題策略", color: c.green, items: ["優先挑選已驗證的高觀看選題類別", "嘗試與其他節目的熱門選題交叉"] },
        { tag: "測試流程", color: c.purple, items: ["每集都做 A/B 縮圖測試，累積數據", "測試 48 小時後切換為勝出版本"] },
      ],
    };
  }, [fullVideos]);

  const tierColor = { "爆": c.red, "穩": c.coral, "低": c.textDim };
  const tierBg = { "爆": c.red + "18", "穩": c.coral + "18", "低": c.textDim + "15" };

  return (<div>
    {/* 1. KPI Highlights */}
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {highlights.map((h, i) => <KPI key={i} label={h.label} value={h.value} sub={h.sub} color={h.color} C={c} />)}
    </div>

    {/* 2. Views & Impressions dual chart */}
    <Section title="觀看次數（按上架日期）" sub="各集觀看數，依節目顏色區分">
      <Card C={c}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
            <XAxis dataKey="label" stroke={c.textDim} fontSize={9} angle={-35} textAnchor="end" height={55} interval={0} />
            <YAxis stroke={c.textDim} fontSize={11} />
            <Tooltip contentStyle={TT(c)} labelFormatter={(_, payload) => payload[0]?.payload?.title || ""} formatter={v => fmt(v)} />
            <Bar dataKey="views" name="觀看次數" radius={[3, 3, 0, 0]}>
              {chartData.map((v, i) => <Cell key={i} fill={v.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </Section>
    <Section title="曝光次數（按上架日期）" sub={hasImpressions ? "各集縮圖曝光數" : "待 Reach Report 填入"}>
      <Card C={c}>
        {hasImpressions ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
              <XAxis dataKey="label" stroke={c.textDim} fontSize={9} angle={-35} textAnchor="end" height={55} interval={0} />
              <YAxis stroke={c.textDim} fontSize={11} />
              <Tooltip contentStyle={TT(c)} labelFormatter={(_, payload) => payload[0]?.payload?.title || ""} formatter={v => fmt(v)} />
              <Bar dataKey="impressions" name="曝光次數" radius={[3, 3, 0, 0]}>
                {chartData.map((v, i) => <Cell key={i} fill={v.fill + "99"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: c.textDim, fontSize: 13 }}>待 Reach Report 資料填入後顯示</div>
        )}
      </Card>
    </Section>

    {/* 3. Retention analysis */}
    <Section title="留存分析：平均觀看時長排行" sub="Top 15，標注最長與最短">
      <Card C={c}>
        <ResponsiveContainer width="100%" height={Math.max(retentionData.length * 30, 200)}>
          <BarChart data={retentionData} layout="vertical" margin={{ left: 5, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.border} horizontal={false} />
            <XAxis type="number" stroke={c.textDim} fontSize={11} unit="s" />
            <YAxis type="category" dataKey="label" stroke={c.textDim} fontSize={10} width={65} />
            <Tooltip contentStyle={TT(c)} formatter={(v, _, p) => [`${p.payload.avgWatch}`, "觀看時長"]} />
            <Bar dataKey="watchSec" name="觀看秒數" radius={[0, 4, 4, 0]}>
              {retentionData.map((v, i) => <Cell key={i} fill={i === 0 ? c.green : i === retentionData.length - 1 ? c.red : v.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", padding: "8px 0 0", fontSize: 11, color: c.textMuted }}>
          <span><span style={{ color: c.green }}>■</span> 最長</span>
          <span><span style={{ color: c.red }}>■</span> 最短</span>
        </div>
      </Card>
    </Section>

    {/* 4. TA Topic Preference per show */}
    <Section title="TA 議題偏好" sub="各節目選題表現：爆＝觀看 > 2x 平均 / 穩＝0.5x-2x / 低＝ < 0.5x">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        {showTopics.map(st => (
          <Card key={st.show} C={c} style={{ borderTop: `4px solid ${st.color}`, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ color: st.color, fontSize: 15, fontWeight: 700 }}>{st.show}</span>
                <span style={{ color: c.textDim, fontSize: 11 }}>{st.count} 集 ・ 平均 {fmt(Math.round(st.avgViews))}</span>
              </div>
              {st.topics.map((v, i) => (
                <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < st.topics.length - 1 ? `1px solid ${c.border}` : "none" }}>
                  <span style={{ background: tierBg[v.tier], color: tierColor[v.tier], fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, minWidth: 24, textAlign: "center" }}>{v.tier}</span>
                  <span style={{ color: c.textMuted, fontSize: 10, minWidth: 38 }}>{fmtDateShort(v.date)}</span>
                  <span title={v.title} style={{ color: c.text, fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.topic || v.title.substring(0, 20)}</span>
                  <span style={{ color: c.text, fontSize: 11, fontFamily: mono, minWidth: 45, textAlign: "right" }}>{fmt(v.views)}</span>
                  <span style={{ color: c.textDim, fontSize: 10, minWidth: 35, textAlign: "right" }}>{v.avgWatch}</span>
                </div>
              ))}
            </div>
            {st.insight && (
              <div style={{ padding: "10px 18px", background: st.color + "10", borderTop: `1px solid ${st.color}25`, fontSize: 11, color: c.textMuted, lineHeight: 1.6 }}>
                <span style={{ color: st.color, fontWeight: 600 }}>洞察：</span>{st.insight}
              </div>
            )}
          </Card>
        ))}
      </div>
    </Section>

    {/* 5. Cross-show insights */}
    {crossInsights.length > 0 && (
      <Section title="跨節目 TA 偏好規律" sub="從數據中自動提取的洞察">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {crossInsights.map(ins => (
            <Card key={ins.num} C={c} style={{ borderLeft: `3px solid ${c.accent}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ background: c.accent + "18", color: c.accent, fontSize: 16, fontWeight: 800, fontFamily: mono, padding: "4px 10px", borderRadius: 6 }}>{ins.num}</span>
                <span style={{ color: c.text, fontSize: 14, fontWeight: 600 }}>{ins.title}</span>
              </div>
              <div style={{ color: c.textMuted, fontSize: 12, lineHeight: 1.7 }}>{ins.text}</div>
            </Card>
          ))}
        </div>
      </Section>
    )}

    {/* 6. Recommendations for weakest show */}
    {recommendations.show && (
      <Section title={`下一步建議：${recommendations.show}`} sub="針對觀看數平均最低的節目">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {recommendations.items.map(r => (
            <Card key={r.tag} C={c} style={{ borderTop: `3px solid ${r.color}` }}>
              <div style={{ color: r.color, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{r.tag}</div>
              {r.items.map((item, j) => (
                <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: r.color, fontSize: 8, marginTop: 5 }}>●</span>
                  <span style={{ color: c.textMuted, fontSize: 12, lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </Card>
          ))}
        </div>
      </Section>
    )}
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
function ActionTab({ fullVideos, abTests, abSuggestions, C: c }) {
  const mono = "'JetBrains Mono', monospace";
  const showNames = [...new Set(fullVideos.map(v => v.show).filter(Boolean))];

  // ── Period highlights ──
  const highlights = useMemo(() => {
    if (!fullVideos.length) return {};
    const sorted = [...fullVideos].sort((a, b) => b.views - a.views);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const totalViews = fullVideos.reduce((a, v) => a + v.views, 0);
    const totalSubs = fullVideos.reduce((a, v) => a + v.subs, 0);
    const avgViews = Math.round(totalViews / fullVideos.length);

    const showAvgs = showNames.map(s => {
      const sv = fullVideos.filter(v => v.show === s);
      return { show: s, avg: sv.length ? Math.round(sv.reduce((a, v) => a + v.views, 0) / sv.length) : 0, count: sv.length };
    }).sort((a, b) => a.avg - b.avg);
    const weakShow = showAvgs[0];
    const strongShow = showAvgs[showAvgs.length - 1];

    return { best, worst, totalViews, totalSubs, avgViews, weakShow, strongShow, count: fullVideos.length };
  }, [fullVideos]);

  // ── AB insights ──
  const abInsights = useMemo(() => {
    if (!abTests.length) return { topFrame: "", topFrameRate: 0, worstFrame: "", formulas: [] };
    const frameMap = {};
    abTests.forEach(t => {
      [{ f: t.frameA, won: t.winner === "A" }, { f: t.frameB, won: t.winner === "B" }].forEach(({ f, won }) => {
        if (!frameMap[f]) frameMap[f] = { wins: 0, total: 0 };
        frameMap[f].total++; if (won) frameMap[f].wins++;
      });
    });
    const frames = Object.entries(frameMap).map(([f, d]) => ({ frame: f, rate: Math.round(d.wins / d.total * 100), ...d })).sort((a, b) => b.rate - a.rate);
    const topFrame = frames[0];
    const worstFrame = frames[frames.length - 1];
    return { topFrame: topFrame?.frame || "", topFrameRate: topFrame?.rate || 0, worstFrame: worstFrame?.frame || "", worstFrameRate: worstFrame?.rate || 0 };
  }, [abTests]);

  // ── Show-specific recommendations ──
  const showCards = useMemo(() => {
    return showNames.map(s => {
      const sv = fullVideos.filter(v => v.show === s);
      if (!sv.length) return null;
      const avgViews = Math.round(sv.reduce((a, v) => a + v.views, 0) / sv.length);
      const totalSubs = sv.reduce((a, v) => a + v.subs, 0);
      const avgInteract = +(sv.reduce((a, v) => a + v.interactRate, 0) / sv.length).toFixed(2);
      const bestVid = [...sv].sort((a, b) => b.views - a.views)[0];
      const worstVid = [...sv].sort((a, b) => a.views - b.views)[0];
      const topAge = (() => { const m = {}; sv.filter(v => v.age).forEach(v => { m[v.age] = (m[v.age] || 0) + 1; }); const e = Object.entries(m).sort((a, b) => b[1] - a[1]); return e[0]?.[0] || "N/A"; })();
      const fPct = sv.filter(v => v.female > 0).length ? +(sv.filter(v => v.female > 0).reduce((a, v) => a + v.female, 0) / sv.filter(v => v.female > 0).length).toFixed(0) : 0;

      const strengths = [];
      const actions = [];
      if (avgViews > (highlights.avgViews || 0)) strengths.push(`平均觀看 ${fmt(avgViews)} 高於頻道均值 ${fmt(highlights.avgViews || 0)}`);
      else actions.push(`平均觀看 ${fmt(avgViews)} 低於頻道均值 ${fmt(highlights.avgViews || 0)}，需強化縮圖文案`);
      if (totalSubs > 0) strengths.push(`帶來 +${totalSubs} 訂閱`);
      if (avgInteract > 3) strengths.push(`互動率 ${avgInteract}% 表現佳`);
      else actions.push(`互動率 ${avgInteract}%，考慮在影片中加入更多 CTA`);
      if (fPct > 60) strengths.push(`女性 ${fPct}%，可深耕女性議題`);
      actions.push(`最強集：${bestVid.ep || bestVid.title.substring(0, 12)}（${fmt(bestVid.views)}），複製其選題模式`);
      if (worstVid.id !== bestVid.id) actions.push(`最弱集：${worstVid.ep || worstVid.title.substring(0, 12)}（${fmt(worstVid.views)}），分析掉量原因`);

      return { show: s, count: sv.length, avgViews, topAge, fPct, strengths, actions };
    }).filter(Boolean).sort((a, b) => b.avgViews - a.avgViews);
  }, [fullVideos, highlights]);

  // ── Guest insights ──
  const guestInsight = useMemo(() => {
    const map = {};
    fullVideos.filter(v => v.guest).forEach(v => {
      if (!map[v.guest]) map[v.guest] = { name: v.guest, views: 0, count: 0 };
      map[v.guest].views += v.views; map[v.guest].count++;
    });
    const arr = Object.values(map).sort((a, b) => b.views / b.count - a.views / a.count);
    return { top: arr.slice(0, 3), bottom: arr.filter(g => g.count >= 1).slice(-2) };
  }, [fullVideos]);

  // ── AB suggestion blocks from Sheet ──
  const suggBlocks = useMemo(() => {
    const map = {};
    (abSuggestions || []).forEach(({ block, item }) => {
      if (!map[block]) map[block] = [];
      map[block].push(item);
    });
    return map;
  }, [abSuggestions]);

  const priorityColors = { "now": c.red, "month": c.accent, "long": c.blue };

  return (<div>
    {/* ── Period KPIs ── */}
    {highlights.best && (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <KPI label="最佳表現" value={fmt(highlights.best.views)} sub={`${highlights.best.ep || ""} ${highlights.best.show}`} color={c.green} C={c} />
        <KPI label="需關注" value={fmt(highlights.worst.views)} sub={`${highlights.worst.ep || ""} ${highlights.worst.show}`} color={c.red} C={c} />
        <KPI label="頻道均值" value={fmt(highlights.avgViews)} sub={`${highlights.count} 支影片`} C={c} />
        <KPI label="訂閱增長" value={highlights.totalSubs > 0 ? `+${highlights.totalSubs}` : String(highlights.totalSubs)} color={highlights.totalSubs > 0 ? c.green : c.red} C={c} />
        {abInsights.topFrame && <KPI label="最強框架" value={abInsights.topFrame} sub={`勝率 ${abInsights.topFrameRate}%（${abTests.length} 次測試）`} color={c.accent} C={c} />}
      </div>
    )}

    {/* ── Priority Actions ── */}
    <Section title="優先行動" sub="按緊急程度排序">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          highlights.weakShow && { pri: "now", label: "立即", text: `「${highlights.weakShow.show}」平均觀看 ${fmt(highlights.weakShow.avg)} 為最低，建議本週檢討縮圖/標題策略`, detail: `${highlights.weakShow.count} 集・低於頻道均值 ${fmt(highlights.avgViews || 0)}` },
          abInsights.worstFrame && { pri: "now", label: "立即", text: `停止使用「${abInsights.worstFrame}」作為標題主框架（勝率 ${abInsights.worstFrameRate}%），改用「${abInsights.topFrame}」`, detail: "基於 AB test 數據" },
          { pri: "month", label: "本月", text: "每集都做 A/B 縮圖測試，固定用「好奇懸念」框架，每次只測一個議題包裝變數", detail: "累積 5 次以上才有統計意義" },
          highlights.strongShow && { pri: "month", label: "本月", text: `分析「${highlights.strongShow.show}」的成功模式（平均 ${fmt(highlights.strongShow.avg)}），嘗試複製到其他節目`, detail: `${highlights.strongShow.count} 集` },
          guestInsight.top.length > 0 && { pri: "month", label: "本月", text: `優先再邀來賓：${guestInsight.top.map(g => g.name).join("、")}`, detail: "根據來賓觀看數排名" },
          { pri: "long", label: "長期", text: "建立「選題 → 框架 → 包裝公式」的 SOP，讓每集選題時有數據依據", detail: "持續填寫 Google Sheet 選題類別欄位" },
          { pri: "long", label: "長期", text: "觀眾高度重疊財經類頻道，可規劃「理財 × 防詐」跨節目聯合企劃", detail: "根據競品頻道分析" },
        ].filter(Boolean).map((a, i) => (
          <Card key={i} C={c} style={{ padding: "14px 18px", borderLeft: `3px solid ${priorityColors[a.pri]}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: priorityColors[a.pri] + "18", color: priorityColors[a.pri], fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, flexShrink: 0 }}>{a.label}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: c.text, fontSize: 13, lineHeight: 1.6 }}>{a.text}</div>
                {a.detail && <div style={{ color: c.textDim, fontSize: 11, marginTop: 2 }}>{a.detail}</div>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Section>

    {/* ── Show-specific cards ── */}
    <Section title="節目專屬建議" sub="根據各節目數據自動生成">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        {showCards.map(sc => {
          const color = (SHOW_COLORS(c))[sc.show] || c.accent;
          return (
            <Card key={sc.show} C={c} style={{ borderTop: `4px solid ${color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ color, fontSize: 15, fontWeight: 700 }}>{sc.show}</span>
                <span style={{ color: c.textDim, fontSize: 11 }}>{sc.count} 集・{sc.topAge} 歲{sc.fPct > 0 ? `・女 ${sc.fPct}%` : ""}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: mono, marginBottom: 14 }}>{fmt(sc.avgViews)} <span style={{ fontSize: 11, fontWeight: 400, color: c.textDim }}>平均觀看</span></div>
              {sc.strengths.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: c.green, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>強項</div>
                  {sc.strengths.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                      <span style={{ color: c.green, fontSize: 8, marginTop: 4 }}>▲</span>
                      <span style={{ color: c.textMuted, fontSize: 12, lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <div style={{ fontSize: 10, color: c.accent, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>行動</div>
                {sc.actions.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                    <span style={{ color: c.accent, fontSize: 8, marginTop: 4 }}>→</span>
                    <span style={{ color: c.textMuted, fontSize: 12, lineHeight: 1.5 }}>{a}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </Section>

    {/* ── AB Test Playbook (from Sheet) ── */}
    {Object.keys(suggBlocks).length > 0 && (
      <Section title="AB Test 策略手冊" sub="從 Google Sheet「AB建議」自動讀取">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
          {Object.entries(suggBlocks).slice(0, 4).map(([title, items]) => {
            const bColor = title === "框架策略" ? c.accent : title === "議題包裝" ? c.teal : title === "下次測試方向" ? c.purple : c.blue;
            return (
              <Card key={title} C={c} style={{ borderTop: `3px solid ${bColor}` }}>
                <div style={{ color: bColor, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{title}</div>
                {items.map((item, j) => {
                  const lines = item.split("\n");
                  const headline = lines[0];
                  const rest = lines.slice(1).join("\n").trim();
                  return (
                    <div key={j} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ color: bColor, fontSize: 8, marginTop: 5, flexShrink: 0 }}>●</span>
                        <span style={{ color: c.text, fontSize: 12, lineHeight: 1.6, fontWeight: 500 }}>{headline}</span>
                      </div>
                      {rest && <div style={{ color: c.textDim, fontSize: 11, lineHeight: 1.6, marginLeft: 16, marginTop: 4, whiteSpace: "pre-wrap" }}>{rest}</div>}
                    </div>
                  );
                })}
              </Card>
            );
          })}
        </div>
      </Section>
    )}
  </div>);
}

// ── Main ──
export default function App() {
  const [tab, setTab] = useState(0);
  const [show, setShow] = useState("全部");
  const [isDark, setIsDark] = useState(false);
  const [fontSize, setFontSize] = useState("medium");
  const [isFullWidth, setIsFullWidth] = useState(false);
  const zoomMap = { small: 0.88, medium: 1, large: 1.12 };
  const [rawData, setRawData] = useState(null);
  const [dateRange, setDateRange] = useState("all");
  const c = isDark ? themes.dark : themes.light;

  useEffect(() => {
    loadFromSheets()
      .then(setRawData)
      .catch(() =>
        fetch(import.meta.env.BASE_URL + "data.json")
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(setRawData)
          .catch(() => setRawData(null))
      );
  }, []);

  const { fullVideos, abTests, abSuggestions, formulaConfig, recordTime } = useMemo(() => {
    if (!rawData) return { fullVideos: [], abTests: [], abSuggestions: [], formulaConfig: {}, recordTime: "" };
    const cfg = rawData.formulaConfig || {};
    const all = processVideos(rawData.videos || [], cfg);
    const full = all.filter(v => v.type === "完整集");
    return { fullVideos: full, abTests: rawData.abTests || [], abSuggestions: rawData.abSuggestions || [], formulaConfig: cfg, recordTime: rawData.recordTime || "" };
  }, [rawData]);

  const filteredVideos = useMemo(() => {
    if (dateRange === "all") return fullVideos;
    const days = dateRange === "30d" ? 30 : 90;
    const cutoff = new Date(Date.now() - days * 86400000);
    return fullVideos.filter(v => {
      if (!v.date) return false;
      return new Date(v.date.replace(/\//g, "-")) >= cutoff;
    });
  }, [fullVideos, dateRange]);

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
    <div style={{ background: c.bg, minHeight: "100vh", color: c.text, fontFamily: "'Noto Sans TC', sans-serif", transition: "background 0.3s, color 0.3s", zoom: zoomMap[fontSize] }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ borderBottom: `1px solid ${c.border}`, position: "sticky", top: 0, zIndex: 100, background: c.bg, transition: "background 0.3s" }}>
      <div style={{ maxWidth: isFullWidth ? "none" : 1100, margin: isFullWidth ? 0 : "0 auto", padding: "24px 28px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, transition: "color 0.3s" }}><span style={{ color: c.accent }}>醍醐WAY</span> 內容分析</h1>
            <p style={{ margin: "3px 0 0", color: c.textMuted, fontSize: 12 }}>共 {filteredVideos.length} 支影片{dateRange !== "all" ? ` (篩選自 ${fullVideos.length} 支)` : ""} · 點擊欄位標題可排序{recordTime ? ` · 資料更新：${recordTime}` : ""}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {tab === 4 && <select value={show} onChange={e => setShow(e.target.value)} style={{ background: c.card, color: c.text, border: `1px solid ${c.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, transition: "all 0.3s" }}>
              {SHOWS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>}
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ background: c.card, color: c.text, border: `1px solid ${c.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, transition: "all 0.3s" }}>
              <option value="all">全部時間</option>
              <option value="30d">近 30 天</option>
              <option value="90d">近 3 個月</option>
            </select>
            <FontSizeControl value={fontSize} onChange={setFontSize} C={c} />
            <WidthSwitch isFullWidth={isFullWidth} toggle={() => setIsFullWidth(!isFullWidth)} C={c} />
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
      </div>
      <div style={{ padding: "20px 28px 60px", maxWidth: isFullWidth ? "none" : 1100, margin: isFullWidth ? 0 : "0 auto", transition: "all 0.3s" }}>
        {tab === 0 && <OverviewTab fullVideos={filteredVideos} C={c} />}
        {tab === 1 && <CommercialTab fullVideos={filteredVideos} formulaConfig={formulaConfig} C={c} />}
        {tab === 2 && <TopicTab fullVideos={filteredVideos} C={c} />}
        {tab === 3 && <ABTab abTests={abTests} abSuggestions={abSuggestions} C={c} />}
        {tab === 4 && <TATab fullVideos={filteredVideos} selectedShow={show} C={c} />}
        {tab === 5 && <GuestTab fullVideos={filteredVideos} C={c} />}
        {tab === 6 && <RevenueTab fullVideos={filteredVideos} C={c} />}
        {tab === 7 && <TATopicTab fullVideos={filteredVideos} C={c} />}
        {tab === 8 && <ActionTab fullVideos={filteredVideos} abTests={abTests} abSuggestions={abSuggestions} C={c} />}
      </div>
    </div>
  );
}
