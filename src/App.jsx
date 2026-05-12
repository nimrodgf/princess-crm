import React, { useState, useEffect, useCallback, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ═══ Supabase ═══
const SB_URL = "https://lbqscxwfttiduofjjmyt.supabase.co";
const SB_KEY = "sb_publishable_44zO_IqCNg-J5cuEsnIvMQ_NFaEbSoV";
const CAL_URL = "https://script.google.com/macros/s/AKfycbyFyUmXAmlQCuZHgtAKu_0Zc_b3eEDf_u32oCYdNqLAK6t3ktlNktf2tJ-hPhvXgq8N9w/exec";
const sb = (table) => `${SB_URL}/rest/v1/${table}`;
const hdrs = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
async function q(table, opts = {}) {
  const { method = "GET", body, params = "" } = opts;
  const r = await fetch(`${sb(table)}?${params}`, { method, headers: { ...hdrs, ...(method === "PATCH" || method === "DELETE" ? { Prefer: "return=representation" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!r.ok) throw new Error(await r.text());
  return method === "DELETE" ? null : r.json();
}

// ═══ Constants ═══
const STATUSES = [
  { id: "new", label: "חדש", color: "#3B82F6", emoji: "🆕" },
  { id: "in_progress", label: "בתהליך", color: "#F59E0B", emoji: "🔄" },
  { id: "closed", label: "נסגר", color: "#10B981", emoji: "✅" },
  { id: "lost", label: "לא נסגר", color: "#EF4444", emoji: "❌" },
];
const SERVICES = ["פודקאסט — פרק ניסיון","פודקאסט — חבילה","פודקאסט — פרק בודד","הקלטות","הפקה מוזיקלית","מיקס","לייב בסלון","לייב בשדה","בית ריק","מסיימות","השכרת חלל","צילום קורס","אחר"];
const SOURCES = ["פרסום ממומן","אורגני ברשתות","פה לאוזן","גוגל","מכיר אישית","אחר"];
const TASK_TYPES = [
  { id: "followup", label: "פולואפ", emoji: "📞" },
  { id: "call", label: "שיחה", emoji: "📱" },
  { id: "prep", label: "הכנה", emoji: "📋" },
  { id: "export", label: "ייצוא", emoji: "📤" },
  { id: "other", label: "אחר", emoji: "📌" },
];
const INTER_TYPES = [
  { id: "call", label: "שיחה", emoji: "📞" },
  { id: "followup", label: "פולואפ", emoji: "🔄" },
  { id: "meeting", label: "פגישה", emoji: "🤝" },
  { id: "quote", label: "הצעת מחיר", emoji: "💰" },
  { id: "note", label: "הערה", emoji: "📝" },
];
const TEMPS = [
  { id: "hot", label: "חם", emoji: "🔥", border: "#EF4444" },
  { id: "warm", label: "פושר", emoji: "🌤", border: "#F59E0B" },
  { id: "cold", label: "קר", emoji: "❄️", border: "#3B82F6" },
];
const EXPENSE_CATS = ["שכירות","חשמל","מים","ארנונה","ביטוח","תקשורת","שיווק","ציוד","תחזוקה","הובלות","רואה חשבון","מיסים","הלוואות","מנויים","אוכל","דלק","ביגוד","רפואה","טיפול","חינוך","בילויים","אחר"];
const INCOME_CATS = ["אולפן","בית ריק","הפקה","פודקאסטים","בקליין","הופעות","מיקס","לייב סשן","השכרה","אחר"];
const CHART_COLORS = ["#8B5CF6","#3B82F6","#10B981","#F59E0B","#EF4444","#EC4899","#06B6D4","#84CC16","#F97316","#6366F1","#14B8A6","#A855F7"];

// ═══ Styles ═══
const S = {
  app: { maxWidth: 480, margin: "0 auto", minHeight: "100dvh", background: "#0F172A", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", position: "relative" },
  header: { padding: "12px 16px", background: "#1E293B", borderBottom: "1px solid #334155", position: "sticky", top: 0, zIndex: 50 },
  addBtn: { background: "#8B5CF6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 },
  iconBtn: { background: "none", border: "none", color: "#94A3B8", cursor: "pointer", padding: 6, borderRadius: 8 },
  searchBox: { display: "flex", alignItems: "center", gap: 6, background: "#1E293B", border: "1px solid #334155", borderRadius: 8, padding: "6px 10px", flex: 1, minWidth: 100 },
  searchInp: { background: "none", border: "none", color: "#E2E8F0", outline: "none", fontSize: 13, width: "100%" },
  tabs: { display: "flex", gap: 2, background: "#1E293B", borderRadius: 8, padding: 2 },
  tabOn: { background: "#8B5CF6", color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  tabOff: { background: "none", color: "#94A3B8", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" },
  filterOn: { background: "#334155", color: "#E2E8F0", border: "1px solid #475569", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  filterOff: { background: "none", color: "#64748B", border: "1px solid #1E293B", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" },
  card: { background: "#1E293B", borderRadius: 10, padding: 12, cursor: "pointer", border: "1px solid #334155", transition: "border-color 0.2s" },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, padding: 0 },
  modalInner: { background: "#1E293B", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, maxHeight: "90dvh", overflow: "auto", padding: 20 },
  input: { width: "100%", background: "#0F172A", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#E2E8F0", fontSize: 14, outline: "none" },
  select: { width: "100%", background: "#0F172A", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#E2E8F0", fontSize: 14, outline: "none", appearance: "none" },
  label: { fontSize: 12, color: "#94A3B8", fontWeight: 600, marginBottom: 4, display: "block" },
  saveBtn: { width: "100%", background: "#8B5CF6", color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 8 },
  delBtn: { background: "#7F1D1D", color: "#FCA5A5", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600 },
  badge: { display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 },
  section: { padding: "12px 16px" },
};

// ═══ Icons (SVG) ═══
const I = {
  plus: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
  back: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>,
  search: <svg width="14" height="14" fill="none" stroke="#64748B" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  bell: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>,
  edit: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  check: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>,
  phone: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  wa: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  cal: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
};

// ═══ Toast ═══
function Toast({ msg, type }) {
  if (!msg) return null;
  return <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: type === "error" ? "#7F1D1D" : "#065F46", color: "#fff", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>{msg}</div>;
}
function useToast() {
  const [toast, setToast] = useState({ msg: "", type: "" });
  const show = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast({ msg: "", type: "" }), 2500); };
  return [toast, show];
}

// ═══ Helpers ═══
const fmtDate = (d) => { if (!d) return ""; const dt = new Date(d); return dt.toLocaleDateString("he-IL"); };
const fmtMoney = (n) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n || 0);
const daysAgo = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
const toDateInput = (d) => { if (!d) return ""; return new Date(d).toISOString().slice(0, 10); };
const monthName = (m) => ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"][m];

// ═══ Lead Detail ═══
function LeadDetail({ lead, interactions, tasks, sessions, onBack, onUpdate, onDelete, onAddInteraction, onUpdateInteraction, onDeleteInteraction, onAddTask, onUpdateTask, onToggleTask, onDeleteTask, onAddSession, onUpdateSession, onDeleteSession, showToast }) {
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [editInterText, setEditInterText] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskText, setEditTaskText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState("followup");
  const [taskDue, setTaskDue] = useState("");
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ date: "", guest: "", exported: false, notes: "" });

  const leadInter = interactions.filter(i => i.lead_id === lead.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const leadTasks = tasks.filter(t => t.lead_id === lead.id).sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0) || new Date(a.due_date) - new Date(b.due_date));
  const leadSessions = sessions.filter(s => s.lead_id === lead.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const statusObj = STATUSES.find(s => s.id === lead.status);
  const isPodcast = lead.service?.includes("פודקאסט");
  const isClient = lead.status === "closed";

  const startEdit = () => { setEditing(true); setEditForm({ ...lead }); };
  const saveEdit = () => { onUpdate(lead.id, editForm); setEditing(false); };

  const addInteraction = () => {
    if (!noteText.trim()) return;
    onAddInteraction({ lead_id: lead.id, text: noteText, type: noteType, date: new Date().toISOString() });
    setNoteText(""); setNoteType("note");
  };
  const addTask = () => {
    if (!taskTitle.trim()) return;
    onAddTask({ lead_id: lead.id, title: taskTitle, type: taskType, due_date: taskDue || new Date(Date.now() + 172800000).toISOString() });
    setTaskTitle(""); setTaskType("followup"); setTaskDue(""); setShowTaskForm(false);
  };
  const addToCalendar = (task) => {
    fetch(CAL_URL, { method: "POST", body: JSON.stringify({ title: `${task.title} — ${lead.name}`, start: task.due_date, duration: 30, description: `ליד: ${lead.name}\nטלפון: ${lead.phone || ""}` }) }).then(() => showToast("נוסף ליומן")).catch(() => showToast("שגיאה ביומן", "error"));
  };
  const addSession = () => {
    if (!sessionForm.date) return;
    onAddSession({ lead_id: lead.id, ...sessionForm });
    setSessionForm({ date: "", guest: "", exported: false, notes: "" }); setShowSessionForm(false);
  };

  return (
    <div style={S.app}>
      <div style={{ ...S.header, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={S.iconBtn} onClick={onBack}>{I.back}</button>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{lead.name}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={S.iconBtn} onClick={startEdit}>{I.edit}</button>
          <button style={{ ...S.iconBtn, color: "#EF4444" }} onClick={() => { if (confirm("למחוק ליד?")) { onDelete(lead.id); onBack(); } }}>{I.trash}</button>
        </div>
      </div>

      <div style={S.section}>
        {/* Status & Info */}
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input style={S.input} value={editForm.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="שם" />
            <input style={S.input} value={editForm.phone || ""} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="טלפון" />
            <input style={S.input} value={editForm.email || ""} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="אימייל" />
            <input style={S.input} value={editForm.instagram || ""} onChange={e => setEditForm({ ...editForm, instagram: e.target.value })} placeholder="אינסטגרם" />
            <select style={S.select} value={editForm.service || ""} onChange={e => setEditForm({ ...editForm, service: e.target.value })}>
              <option value="">בחר שירות</option>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select style={S.select} value={editForm.source || ""} onChange={e => setEditForm({ ...editForm, source: e.target.value })}>
              <option value="">מקור</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select style={S.select} value={editForm.status || ""} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
              {STATUSES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
            </select>
            {editForm.status === "in_progress" && (
              <div style={{ display: "flex", gap: 6 }}>
                {TEMPS.map(t => <button key={t.id} style={editForm.temperature === t.id ? { ...S.filterOn, borderColor: t.border } : S.filterOff} onClick={() => setEditForm({ ...editForm, temperature: t.id })}>{t.emoji} {t.label}</button>)}
              </div>
            )}
            <input style={S.input} type="number" value={editForm.amount || ""} onChange={e => setEditForm({ ...editForm, amount: parseInt(e.target.value) || 0 })} placeholder="סכום" />
            <textarea style={{ ...S.input, minHeight: 60 }} value={editForm.notes || ""} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="הערות" />
            <button style={S.saveBtn} onClick={saveEdit}>שמור</button>
            <button style={{ ...S.saveBtn, background: "#334155" }} onClick={() => setEditing(false)}>ביטול</button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ ...S.badge, background: statusObj?.color + "33", color: statusObj?.color }}>{statusObj?.emoji} {statusObj?.label}</span>
              {lead.service && <span style={{ ...S.badge, background: "#1E293B", color: "#94A3B8" }}>{lead.service}</span>}
              {lead.temperature && lead.status === "in_progress" && <span>{TEMPS.find(t => t.id === lead.temperature)?.emoji}</span>}
              {lead.amount > 0 && <span style={{ fontSize: 13, color: "#10B981", fontWeight: 700 }}>{fmtMoney(lead.amount)}</span>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {lead.phone && <a href={`https://wa.me/972${lead.phone.replace(/^0/, "")}`} target="_blank" style={{ ...S.filterOn, background: "#065F46", color: "#34D399", borderColor: "#059669", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>{I.wa} WhatsApp</a>}
              {lead.phone && <a href={`tel:${lead.phone}`} style={{ ...S.filterOn, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>{I.phone} {lead.phone}</a>}
              {lead.email && <a href={`mailto:${lead.email}`} style={{ ...S.filterOn, textDecoration: "none" }}>📧 {lead.email}</a>}
              {lead.instagram && <a href={`https://instagram.com/${lead.instagram.replace("@", "")}`} target="_blank" style={{ ...S.filterOn, textDecoration: "none", background: "#4C1D95", borderColor: "#7C3AED", color: "#C4B5FD" }}>📸 {lead.instagram}</a>}
            </div>
            {lead.source && <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>מקור: {lead.source}</div>}
            {lead.notes && <div style={{ fontSize: 13, color: "#CBD5E1", background: "#0F172A", borderRadius: 8, padding: 10, marginBottom: 8 }}>{lead.notes}</div>}
            <div style={{ fontSize: 11, color: "#475569" }}>נוצר: {fmtDate(lead.created_at)}</div>
          </div>
        )}
      </div>

      {/* Interactions */}
      <div style={S.section}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>אינטראקציות</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {INTER_TYPES.map(t => <button key={t.id} style={noteType === t.id ? S.filterOn : S.filterOff} onClick={() => setNoteType(t.id)}>{t.emoji}</button>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input style={{ ...S.input, flex: 1 }} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="הוסף אינטראקציה..." onKeyDown={e => e.key === "Enter" && addInteraction()} />
          <button style={{ ...S.addBtn, padding: "8px 12px" }} onClick={addInteraction}>{I.plus}</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {leadInter.map(inter => {
            const tt = INTER_TYPES.find(x => x.id === inter.type);
            const isEditing = editingInteraction === inter.id;
            return (
              <div key={inter.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#0F172A", borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ fontSize: 16 }}>{tt?.emoji || "📝"}</span>
                <div style={{ flex: 1 }}>
                  {isEditing ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <input style={{ ...S.input, fontSize: 12, padding: "4px 8px" }} value={editInterText} onChange={e => setEditInterText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { onUpdateInteraction(inter.id, { text: editInterText }); setEditingInteraction(null); } }} autoFocus />
                      <button style={{ ...S.iconBtn, color: "#10B981" }} onClick={() => { onUpdateInteraction(inter.id, { text: editInterText }); setEditingInteraction(null); }}>{I.check}</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "#CBD5E1" }}>{inter.text}</div>
                  )}
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{fmtDate(inter.date)}</div>
                </div>
                {!isEditing && (
                  <div style={{ display: "flex", gap: 2 }}>
                    <button style={S.iconBtn} onClick={() => { setEditingInteraction(inter.id); setEditInterText(inter.text); }}>{I.edit}</button>
                    <button style={{ ...S.iconBtn, color: "#EF4444" }} onClick={() => onDeleteInteraction(inter.id)}>{I.trash}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tasks */}
      <div style={S.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>משימות</span>
          <button style={{ ...S.filterOn, background: "#8B5CF6", borderColor: "#8B5CF6" }} onClick={() => setShowTaskForm(!showTaskForm)}>{I.plus} חדשה</button>
        </div>
        {showTaskForm && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8, background: "#0F172A", borderRadius: 8, padding: 10 }}>
            <input style={S.input} value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="תיאור משימה" />
            <div style={{ display: "flex", gap: 6 }}>
              <select style={{ ...S.select, flex: 1 }} value={taskType} onChange={e => setTaskType(e.target.value)}>
                {TASK_TYPES.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
              </select>
              <input style={{ ...S.input, flex: 1 }} type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} />
            </div>
            <button style={S.saveBtn} onClick={addTask}>הוסף</button>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {leadTasks.map(t => {
            const tt = TASK_TYPES.find(x => x.id === t.type);
            const overdue = !t.completed && new Date(t.due_date) < new Date();
            const isEditingT = editingTask === t.id;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0F172A", borderRadius: 8, padding: "8px 12px", opacity: t.completed ? 0.5 : 1, borderRight: overdue ? "3px solid #EF4444" : "3px solid transparent" }}>
                <button style={{ ...S.iconBtn, color: t.completed ? "#10B981" : "#475569" }} onClick={() => onToggleTask(t.id, t.completed)}>
                  {t.completed ? I.check : <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #475569", borderRadius: 4 }} />}
                </button>
                <span style={{ fontSize: 14 }}>{tt?.emoji}</span>
                <div style={{ flex: 1 }}>
                  {isEditingT ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <input style={{ ...S.input, fontSize: 12, padding: "4px 8px" }} value={editTaskText} onChange={e => setEditTaskText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { onUpdateTask(t.id, { title: editTaskText }); setEditingTask(null); } }} autoFocus />
                      <button style={{ ...S.iconBtn, color: "#10B981" }} onClick={() => { onUpdateTask(t.id, { title: editTaskText }); setEditingTask(null); }}>{I.check}</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "#CBD5E1", textDecoration: t.completed ? "line-through" : "none" }}>{t.title}</div>
                  )}
                  <div style={{ fontSize: 10, color: overdue ? "#EF4444" : "#475569" }}>{fmtDate(t.due_date)}{overdue && " ⚠️"}</div>
                </div>
                {!isEditingT && (
                  <div style={{ display: "flex", gap: 2 }}>
                    <button style={S.iconBtn} onClick={() => addToCalendar(t)}>{I.cal}</button>
                    <button style={S.iconBtn} onClick={() => { setEditingTask(t.id); setEditTaskText(t.title); }}>{I.edit}</button>
                    <button style={{ ...S.iconBtn, color: "#EF4444" }} onClick={() => onDeleteTask(t.id)}>{I.trash}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Podcast Sessions */}
      {isPodcast && isClient && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>🎙️ סשנים</span>
            <button style={{ ...S.filterOn, background: "#8B5CF6", borderColor: "#8B5CF6" }} onClick={() => setShowSessionForm(!showSessionForm)}>{I.plus} סשן</button>
          </div>
          {showSessionForm && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8, background: "#0F172A", borderRadius: 8, padding: 10 }}>
              <input style={S.input} type="date" value={sessionForm.date} onChange={e => setSessionForm({ ...sessionForm, date: e.target.value })} />
              <input style={S.input} value={sessionForm.guest} onChange={e => setSessionForm({ ...sessionForm, guest: e.target.value })} placeholder="אורח" />
              <input style={S.input} value={sessionForm.notes} onChange={e => setSessionForm({ ...sessionForm, notes: e.target.value })} placeholder="הערות" />
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#94A3B8", fontSize: 13 }}>
                <input type="checkbox" checked={sessionForm.exported} onChange={e => setSessionForm({ ...sessionForm, exported: e.target.checked })} /> יוצא
              </label>
              <button style={S.saveBtn} onClick={addSession}>הוסף סשן</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {leadSessions.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0F172A", borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ fontSize: 14 }}>{s.exported ? "✅" : "⏳"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#CBD5E1" }}>{s.guest || "ללא אורח"}</div>
                  <div style={{ fontSize: 10, color: "#475569" }}>{fmtDate(s.date)} {s.notes && `· ${s.notes}`}</div>
                </div>
                <button style={{ ...S.iconBtn, color: s.exported ? "#475569" : "#10B981" }} onClick={() => onUpdateSession(s.id, { exported: !s.exported })}>{s.exported ? "↩️" : "📤"}</button>
                <button style={{ ...S.iconBtn, color: "#EF4444" }} onClick={() => onDeleteSession(s.id)}>{I.trash}</button>
              </div>
            ))}
            {leadSessions.length === 0 && <div style={{ fontSize: 12, color: "#475569", textAlign: "center", padding: 12 }}>אין סשנים עדיין</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ Finance Module ═══
function FinanceView({ manualTx, recurringTx, leads, onAddManual, onUpdateManual, onDeleteManual, onAddRecurring, onUpdateRecurring, onDeleteRecurring, showToast }) {
  const [finView, setFinView] = useState("dashboard");
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddRec, setShowAddRec] = useState(false);
  const [txForm, setTxForm] = useState({ date: toDateInput(new Date()), description: "", amount: "", type: "expense", domain: "business", category: "", linked_lead_id: "", status: "planned", notes: "" });
  const [recForm, setRecForm] = useState({ description: "", amount: "", type: "expense", domain: "business", category: "", day_of_month: 1, is_active: true });
  const [editingTx, setEditingTx] = useState(null);
  const [editingRec, setEditingRec] = useState(null);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth());

  // Generate projected transactions (recurring + manual) through end of year
  const projectedData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const allTx = [];

    // Add manual transactions
    manualTx.forEach(tx => {
      allTx.push({ ...tx, amount: parseFloat(tx.amount), source: "manual" });
    });

    // Generate recurring for rest of year
    recurringTx.filter(r => r.is_active).forEach(rec => {
      for (let m = 0; m < 12; m++) {
        const d = new Date(year, m, rec.day_of_month);
        if (d > new Date(year, 11, 31)) break;
        // Check if already matched by manual entry
        const alreadyExists = manualTx.some(tx => tx.matched_unique_id === `rec_${rec.id}_${m}`);
        if (!alreadyExists) {
          allTx.push({
            id: `rec_${rec.id}_${m}`,
            date: d.toISOString().slice(0, 10),
            description: rec.description,
            amount: parseFloat(rec.amount),
            type: rec.type,
            domain: rec.domain,
            category: rec.category,
            status: d < now ? "expected" : "projected",
            source: "recurring",
            recurring_id: rec.id,
          });
        }
      }
    });

    allTx.sort((a, b) => new Date(a.date) - new Date(b.date));
    return allTx;
  }, [manualTx, recurringTx]);

  // Cumulative cash flow
  const cashFlowData = useMemo(() => {
    let cumulative = 0;
    const monthly = {};
    projectedData.forEach(tx => {
      const m = new Date(tx.date).getMonth();
      const val = tx.type === "income" ? tx.amount : -tx.amount;
      cumulative += val;
      if (!monthly[m]) monthly[m] = { month: monthName(m), income: 0, expense: 0, cumulative: 0 };
      if (tx.type === "income") monthly[m].income += tx.amount;
      else monthly[m].expense += tx.amount;
    });
    cumulative = 0;
    return Object.values(monthly).map(m => {
      cumulative += m.income - m.expense;
      return { ...m, cumulative, net: m.income - m.expense };
    });
  }, [projectedData]);

  // Category breakdown for selected month
  const monthBreakdown = useMemo(() => {
    const filtered = projectedData.filter(tx => new Date(tx.date).getMonth() === monthFilter);
    const byCat = {};
    filtered.filter(tx => tx.type === "expense").forEach(tx => {
      const cat = tx.category || "אחר";
      byCat[cat] = (byCat[cat] || 0) + tx.amount;
    });
    return Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [projectedData, monthFilter]);

  const incomeBreakdown = useMemo(() => {
    const filtered = projectedData.filter(tx => new Date(tx.date).getMonth() === monthFilter);
    const byCat = {};
    filtered.filter(tx => tx.type === "income").forEach(tx => {
      const cat = tx.category || "אחר";
      byCat[cat] = (byCat[cat] || 0) + tx.amount;
    });
    return Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [projectedData, monthFilter]);

  const monthTx = projectedData.filter(tx => new Date(tx.date).getMonth() === monthFilter);
  const monthIncome = monthTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const submitTx = () => {
    if (!txForm.description || !txForm.amount) return;
    if (editingTx) {
      onUpdateManual(editingTx, { ...txForm, amount: parseFloat(txForm.amount) });
      setEditingTx(null);
    } else {
      onAddManual({ ...txForm, amount: parseFloat(txForm.amount) });
    }
    setTxForm({ date: toDateInput(new Date()), description: "", amount: "", type: "expense", domain: "business", category: "", linked_lead_id: "", status: "planned", notes: "" });
    setShowAddTx(false);
  };

  const submitRec = () => {
    if (!recForm.description || !recForm.amount) return;
    if (editingRec) {
      onUpdateRecurring(editingRec, { ...recForm, amount: parseFloat(recForm.amount) });
      setEditingRec(null);
    } else {
      onAddRecurring({ ...recForm, amount: parseFloat(recForm.amount) });
    }
    setRecForm({ description: "", amount: "", type: "expense", domain: "business", category: "", day_of_month: 1, is_active: true });
    setShowAddRec(false);
  };

  const confirmMatch = (tx) => {
    if (tx.source === "recurring") {
      onAddManual({ date: tx.date, description: tx.description, amount: tx.amount, type: tx.type, domain: tx.domain, category: tx.category, status: "confirmed", matched_unique_id: tx.id, notes: "אושר מתנועה חוזרת" });
      showToast("תנועה אושרה");
    } else if (tx.source === "manual") {
      onUpdateManual(tx.id, { status: "confirmed" });
      showToast("תנועה אושרה");
    }
  };

  return (
    <div>
      {/* Finance sub-nav */}
      <div style={{ display: "flex", gap: 4, padding: "8px 16px", flexWrap: "wrap" }}>
        <button style={finView === "dashboard" ? S.filterOn : S.filterOff} onClick={() => setFinView("dashboard")}>📊 דאשבורד</button>
        <button style={finView === "transactions" ? S.filterOn : S.filterOff} onClick={() => setFinView("transactions")}>📋 תנועות</button>
        <button style={finView === "recurring" ? S.filterOn : S.filterOff} onClick={() => setFinView("recurring")}>🔄 קבועות</button>
      </div>

      {/* Dashboard */}
      {finView === "dashboard" && (
        <div style={S.section}>
          {/* Month selector */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
            {Array.from({ length: 12 }, (_, i) => (
              <button key={i} style={monthFilter === i ? S.filterOn : S.filterOff} onClick={() => setMonthFilter(i)}>{monthName(i).slice(0, 3)}</button>
            ))}
          </div>

          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            <div style={{ background: "#064E3B", borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#6EE7B7" }}>הכנסות</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#10B981" }}>{fmtMoney(monthIncome)}</div>
            </div>
            <div style={{ background: "#7F1D1D", borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#FCA5A5" }}>הוצאות</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#EF4444" }}>{fmtMoney(monthExpense)}</div>
            </div>
            <div style={{ background: monthIncome - monthExpense >= 0 ? "#064E3B" : "#7F1D1D", borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>נטו</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: monthIncome - monthExpense >= 0 ? "#10B981" : "#EF4444" }}>{fmtMoney(monthIncome - monthExpense)}</div>
            </div>
          </div>

          {/* Cumulative chart */}
          <div style={{ background: "#1E293B", borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>תזרים מצטבר — שנתי</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#E2E8F0", fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
                <Line type="monotone" dataKey="cumulative" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: "#8B5CF6", r: 3 }} name="מצטבר" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Income vs Expense bar chart */}
          <div style={{ background: "#1E293B", borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>הכנסות מול הוצאות</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#E2E8F0", fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
                <Bar dataKey="income" fill="#10B981" name="הכנסות" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#EF4444" name="הוצאות" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Expense pie */}
          {monthBreakdown.length > 0 && (
            <div style={{ background: "#1E293B", borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>התפלגות הוצאות — {monthName(monthFilter)}</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={monthBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {monthBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#E2E8F0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Income pie */}
          {incomeBreakdown.length > 0 && (
            <div style={{ background: "#1E293B", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>התפלגות הכנסות — {monthName(monthFilter)}</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={incomeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {incomeBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#E2E8F0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Transactions list */}
      {finView === "transactions" && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>תנועות — {monthName(monthFilter)}</span>
            <button style={S.addBtn} onClick={() => { setEditingTx(null); setShowAddTx(true); }}>{I.plus} תנועה</button>
          </div>
          {/* Month selector */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
            {Array.from({ length: 12 }, (_, i) => (
              <button key={i} style={monthFilter === i ? S.filterOn : S.filterOff} onClick={() => setMonthFilter(i)}>{monthName(i).slice(0, 3)}</button>
            ))}
          </div>

          {/* Transaction rows */}
          {monthTx.map(tx => {
            const isIncome = tx.type === "income";
            const statusColor = tx.status === "confirmed" ? "#10B981" : tx.status === "planned" ? "#F59E0B" : tx.status === "expected" ? "#3B82F6" : "#8B5CF6";
            const statusLabel = tx.status === "confirmed" ? "מאושר" : tx.status === "planned" ? "מתוכנן" : tx.status === "expected" ? "צפוי" : tx.status === "matched" ? "מותאם" : "חזוי";
            return (
              <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#1E293B", borderRadius: 8, padding: "8px 12px", marginBottom: 4, borderRight: `3px solid ${isIncome ? "#10B981" : "#EF4444"}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 600 }}>{tx.description}</div>
                  <div style={{ fontSize: 10, color: "#64748B", display: "flex", gap: 8, marginTop: 2 }}>
                    <span>{fmtDate(tx.date)}</span>
                    {tx.domain && <span style={{ color: tx.domain === "business" ? "#8B5CF6" : "#06B6D4" }}>{tx.domain === "business" ? "עסק" : "בית"}</span>}
                    {tx.category && <span>{tx.category}</span>}
                    <span style={{ color: statusColor }}>{statusLabel}</span>
                    {tx.source === "recurring" && <span>🔄</span>}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isIncome ? "#10B981" : "#EF4444" }}>{isIncome ? "+" : "-"}{fmtMoney(tx.amount)}</div>
                <div style={{ display: "flex", gap: 2 }}>
                  {(tx.status === "planned" || tx.status === "expected") && (
                    <button style={{ ...S.iconBtn, color: "#10B981" }} onClick={() => confirmMatch(tx)} title="אשר תנועה">{I.check}</button>
                  )}
                  {tx.source === "manual" && (
                    <>
                      <button style={S.iconBtn} onClick={() => { setEditingTx(tx.id); setTxForm({ date: toDateInput(tx.date), description: tx.description, amount: tx.amount, type: tx.type, domain: tx.domain || "business", category: tx.category || "", linked_lead_id: tx.linked_lead_id || "", status: tx.status || "planned", notes: tx.notes || "" }); setShowAddTx(true); }}>{I.edit}</button>
                      <button style={{ ...S.iconBtn, color: "#EF4444" }} onClick={() => { onDeleteManual(tx.id); }}>{I.trash}</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {monthTx.length === 0 && <div style={{ textAlign: "center", color: "#475569", padding: 20, fontSize: 13 }}>אין תנועות בחודש הזה</div>}
        </div>
      )}

      {/* Recurring transactions */}
      {finView === "recurring" && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>🔄 תנועות קבועות</span>
            <button style={S.addBtn} onClick={() => { setEditingRec(null); setShowAddRec(true); }}>{I.plus} חדשה</button>
          </div>
          {recurringTx.map(rec => (
            <div key={rec.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#1E293B", borderRadius: 8, padding: "10px 12px", marginBottom: 4, opacity: rec.is_active ? 1 : 0.5, borderRight: `3px solid ${rec.type === "income" ? "#10B981" : "#EF4444"}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 600 }}>{rec.description}</div>
                <div style={{ fontSize: 10, color: "#64748B" }}>
                  כל {rec.day_of_month} בחודש · {rec.domain === "business" ? "עסק" : "בית"} · {rec.category || "ללא קטגוריה"} · {rec.is_active ? "פעיל" : "מושבת"}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: rec.type === "income" ? "#10B981" : "#EF4444" }}>{fmtMoney(rec.amount)}</div>
              <div style={{ display: "flex", gap: 2 }}>
                <button style={S.iconBtn} onClick={() => onUpdateRecurring(rec.id, { is_active: !rec.is_active })}>{rec.is_active ? "⏸" : "▶️"}</button>
                <button style={S.iconBtn} onClick={() => { setEditingRec(rec.id); setRecForm({ description: rec.description, amount: rec.amount, type: rec.type, domain: rec.domain || "business", category: rec.category || "", day_of_month: rec.day_of_month, is_active: rec.is_active }); setShowAddRec(true); }}>{I.edit}</button>
                <button style={{ ...S.iconBtn, color: "#EF4444" }} onClick={() => { if (confirm("למחוק?")) onDeleteRecurring(rec.id); }}>{I.trash}</button>
              </div>
            </div>
          ))}
          {recurringTx.length === 0 && <div style={{ textAlign: "center", color: "#475569", padding: 20, fontSize: 13 }}>אין תנועות קבועות</div>}
        </div>
      )}

      {/* Add/Edit Transaction Modal */}
      {showAddTx && (
        <div style={S.modal} onClick={() => setShowAddTx(false)}>
          <div style={S.modalInner} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{editingTx ? "עריכת תנועה" : "תנועה חדשה"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input style={S.input} type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} />
              <input style={S.input} value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} placeholder="תיאור" />
              <input style={S.input} type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} placeholder="סכום" />
              <div style={{ display: "flex", gap: 6 }}>
                <button style={txForm.type === "income" ? { ...S.filterOn, background: "#065F46", borderColor: "#10B981" } : S.filterOff} onClick={() => setTxForm({ ...txForm, type: "income" })}>הכנסה</button>
                <button style={txForm.type === "expense" ? { ...S.filterOn, background: "#7F1D1D", borderColor: "#EF4444" } : S.filterOff} onClick={() => setTxForm({ ...txForm, type: "expense" })}>הוצאה</button>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={txForm.domain === "business" ? { ...S.filterOn, background: "#4C1D95", borderColor: "#8B5CF6" } : S.filterOff} onClick={() => setTxForm({ ...txForm, domain: "business" })}>עסק</button>
                <button style={txForm.domain === "home" ? { ...S.filterOn, background: "#164E63", borderColor: "#06B6D4" } : S.filterOff} onClick={() => setTxForm({ ...txForm, domain: "home" })}>בית</button>
              </div>
              <select style={S.select} value={txForm.category} onChange={e => setTxForm({ ...txForm, category: e.target.value })}>
                <option value="">קטגוריה...</option>
                {(txForm.type === "income" ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select style={S.select} value={txForm.status} onChange={e => setTxForm({ ...txForm, status: e.target.value })}>
                <option value="planned">מתוכנן</option>
                <option value="confirmed">מאושר</option>
              </select>
              {leads.length > 0 && (
                <select style={S.select} value={txForm.linked_lead_id} onChange={e => setTxForm({ ...txForm, linked_lead_id: e.target.value })}>
                  <option value="">קשר ללקוח...</option>
                  {leads.filter(l => l.status === "closed").map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
              <textarea style={{ ...S.input, minHeight: 50 }} value={txForm.notes} onChange={e => setTxForm({ ...txForm, notes: e.target.value })} placeholder="הערות" />
              <button style={S.saveBtn} onClick={submitTx}>{editingTx ? "עדכן" : "הוסף"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Recurring Modal */}
      {showAddRec && (
        <div style={S.modal} onClick={() => setShowAddRec(false)}>
          <div style={S.modalInner} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{editingRec ? "עריכת תנועה קבועה" : "תנועה קבועה חדשה"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input style={S.input} value={recForm.description} onChange={e => setRecForm({ ...recForm, description: e.target.value })} placeholder="תיאור" />
              <input style={S.input} type="number" value={recForm.amount} onChange={e => setRecForm({ ...recForm, amount: e.target.value })} placeholder="סכום" />
              <div style={{ display: "flex", gap: 6 }}>
                <button style={recForm.type === "income" ? { ...S.filterOn, background: "#065F46", borderColor: "#10B981" } : S.filterOff} onClick={() => setRecForm({ ...recForm, type: "income" })}>הכנסה</button>
                <button style={recForm.type === "expense" ? { ...S.filterOn, background: "#7F1D1D", borderColor: "#EF4444" } : S.filterOff} onClick={() => setRecForm({ ...recForm, type: "expense" })}>הוצאה</button>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={recForm.domain === "business" ? { ...S.filterOn, background: "#4C1D95", borderColor: "#8B5CF6" } : S.filterOff} onClick={() => setRecForm({ ...recForm, domain: "business" })}>עסק</button>
                <button style={recForm.domain === "home" ? { ...S.filterOn, background: "#164E63", borderColor: "#06B6D4" } : S.filterOff} onClick={() => setRecForm({ ...recForm, domain: "home" })}>בית</button>
              </div>
              <select style={S.select} value={recForm.category} onChange={e => setRecForm({ ...recForm, category: e.target.value })}>
                <option value="">קטגוריה...</option>
                {(recForm.type === "income" ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label style={S.label}>יום בחודש:</label>
                <input style={{ ...S.input, width: 80 }} type="number" min="1" max="31" value={recForm.day_of_month} onChange={e => setRecForm({ ...recForm, day_of_month: parseInt(e.target.value) || 1 })} />
              </div>
              <button style={S.saveBtn} onClick={submitRec}>{editingRec ? "עדכן" : "הוסף"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ Main App ═══
export default function App() {
  const [leads, setLeads] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [manualTx, setManualTx] = useState([]);
  const [recurringTx, setRecurringTx] = useState([]);
  const [view, setView] = useState("leads");
  const [leadsMode, setLeadsMode] = useState("board");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState(false);
  const [toast, showToast] = useToast();
  const [loading, setLoading] = useState(true);
  const [newLead, setNewLead] = useState({ name: "", phone: "", email: "", instagram: "", service: "", source: "", notes: "", amount: 0 });

  // ═ Data loading ═
  useEffect(() => {
    Promise.all([
      q("leads", { params: "order=created_at.desc" }),
      q("interactions", { params: "order=date.desc" }),
      q("tasks", { params: "order=due_date.asc" }),
      q("sessions", { params: "order=date.desc" }).catch(() => []),
      q("manual_transactions", { params: "order=date.asc" }).catch(() => []),
      q("recurring_transactions", { params: "order=description.asc" }).catch(() => []),
    ]).then(([l, i, t, s, mt, rt]) => {
      setLeads(l); setInteractions(i); setTasks(t); setSessions(s); setManualTx(mt); setRecurringTx(rt); setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); showToast("שגיאה בטעינת נתונים", "error"); });
  }, []);

  // ═ CRUD Leads ═
  const addLead = async () => {
    if (!newLead.name) return;
    const [added] = await q("leads", { method: "POST", body: { ...newLead, status: "new" } });
    setLeads(prev => [added, ...prev]);
    setNewLead({ name: "", phone: "", email: "", instagram: "", service: "", source: "", notes: "", amount: 0 });
    setShowForm(false);
    showToast("ליד נוסף");
  };
  const updateLead = async (id, data) => {
    const [updated] = await q("leads", { method: "PATCH", body: data, params: `id=eq.${id}` });
    setLeads(prev => prev.map(l => l.id === id ? updated : l));
    showToast("עודכן");
  };
  const deleteLead = async (id) => {
    await q("leads", { method: "DELETE", params: `id=eq.${id}` });
    setLeads(prev => prev.filter(l => l.id !== id));
    showToast("נמחק");
  };

  // ═ CRUD Interactions ═
  const addInteraction = async (data) => { const [a] = await q("interactions", { method: "POST", body: data }); setInteractions(prev => [a, ...prev]); showToast("נוסף"); };
  const updateInteraction = async (id, data) => { const [u] = await q("interactions", { method: "PATCH", body: data, params: `id=eq.${id}` }); setInteractions(prev => prev.map(i => i.id === id ? u : i)); };
  const deleteInteraction = async (id) => { await q("interactions", { method: "DELETE", params: `id=eq.${id}` }); setInteractions(prev => prev.filter(i => i.id !== id)); };

  // ═ CRUD Tasks ═
  const addTask = async (data) => { const [a] = await q("tasks", { method: "POST", body: data }); setTasks(prev => [...prev, a]); showToast("משימה נוספה"); };
  const updateTask = async (id, data) => { const [u] = await q("tasks", { method: "PATCH", body: data, params: `id=eq.${id}` }); setTasks(prev => prev.map(t => t.id === id ? u : t)); };
  const toggleTask = async (id, current) => { const [u] = await q("tasks", { method: "PATCH", body: { completed: !current }, params: `id=eq.${id}` }); setTasks(prev => prev.map(t => t.id === id ? u : t)); };
  const deleteTask = async (id) => { await q("tasks", { method: "DELETE", params: `id=eq.${id}` }); setTasks(prev => prev.filter(t => t.id !== id)); };

  // ═ CRUD Sessions ═
  const addSession = async (data) => { const [a] = await q("sessions", { method: "POST", body: data }); setSessions(prev => [a, ...prev]); showToast("סשן נוסף"); };
  const updateSession = async (id, data) => { const [u] = await q("sessions", { method: "PATCH", body: data, params: `id=eq.${id}` }); setSessions(prev => prev.map(s => s.id === id ? u : s)); };
  const deleteSession = async (id) => { await q("sessions", { method: "DELETE", params: `id=eq.${id}` }); setSessions(prev => prev.filter(s => s.id !== id)); };

  // ═ CRUD Manual Transactions ═
  const addManualTx = async (data) => { const [a] = await q("manual_transactions", { method: "POST", body: data }); setManualTx(prev => [...prev, a].sort((a, b) => new Date(a.date) - new Date(b.date))); showToast("תנועה נוספה"); };
  const updateManualTx = async (id, data) => { const [u] = await q("manual_transactions", { method: "PATCH", body: data, params: `id=eq.${id}` }); setManualTx(prev => prev.map(t => t.id === id ? u : t)); showToast("עודכן"); };
  const deleteManualTx = async (id) => { await q("manual_transactions", { method: "DELETE", params: `id=eq.${id}` }); setManualTx(prev => prev.filter(t => t.id !== id)); showToast("נמחק"); };

  // ═ CRUD Recurring Transactions ═
  const addRecurringTx = async (data) => { const [a] = await q("recurring_transactions", { method: "POST", body: data }); setRecurringTx(prev => [...prev, a]); showToast("תנועה קבועה נוספה"); };
  const updateRecurringTx = async (id, data) => { const [u] = await q("recurring_transactions", { method: "PATCH", body: data, params: `id=eq.${id}` }); setRecurringTx(prev => prev.map(t => t.id === id ? u : t)); };
  const deleteRecurringTx = async (id) => { await q("recurring_transactions", { method: "DELETE", params: `id=eq.${id}` }); setRecurringTx(prev => prev.filter(t => t.id !== id)); };

  // ═ Notifications ═
  const notifs = useMemo(() => {
    const n = [];
    leads.filter(l => l.status === "new" || l.status === "in_progress").forEach(l => {
      const lastInter = interactions.filter(i => i.lead_id === l.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const d = lastInter ? daysAgo(lastInter.date) : daysAgo(l.created_at);
      if (d >= 2) n.push({ type: "idle", lead: l, days: d });
    });
    tasks.filter(t => !t.completed && new Date(t.due_date) < new Date()).forEach(t => {
      const lead = leads.find(l => l.id === t.lead_id);
      n.push({ type: "overdue", task: t, lead });
    });
    return n;
  }, [leads, interactions, tasks]);

  // ═ Filtered leads ═
  const filtered = useMemo(() => {
    let f = leads;
    if (search) { const s = search.toLowerCase(); f = f.filter(l => l.name?.toLowerCase().includes(s) || l.phone?.includes(s) || l.service?.includes(s) || l.notes?.toLowerCase().includes(s)); }
    if (serviceFilter) f = f.filter(l => l.service === serviceFilter);
    if (statusFilter) f = f.filter(l => l.status === statusFilter);
    if (taskFilter) f = f.filter(l => tasks.some(t => t.lead_id === l.id && !t.completed));
    return f;
  }, [leads, search, serviceFilter, statusFilter, taskFilter, tasks]);

  const clients = leads.filter(l => l.status === "closed");
  const clientsFiltered = serviceFilter ? clients.filter(c => c.service === serviceFilter) : clients;

  if (loading) return <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh" }}><div style={{ fontSize: 24 }}>🎤 טוען...</div></div>;

  // ═ Lead Detail View ═
  if (selectedLead) {
    const fresh = leads.find(l => l.id === selectedLead);
    if (!fresh) { setSelectedLead(null); return null; }
    return <div><LeadDetail lead={fresh} interactions={interactions} tasks={tasks} sessions={sessions} onBack={() => setSelectedLead(null)} onUpdate={updateLead} onDelete={deleteLead} onAddInteraction={addInteraction} onUpdateInteraction={updateInteraction} onDeleteInteraction={deleteInteraction} onAddTask={addTask} onUpdateTask={updateTask} onToggleTask={toggleTask} onDeleteTask={deleteTask} onAddSession={addSession} onUpdateSession={updateSession} onDeleteSession={deleteSession} showToast={showToast} /><Toast {...toast} /></div>;
  }

  // ═ Board columns ═
  const boardStatuses = STATUSES.filter(s => s.id !== "new");
  const boardLeads = (statusId) => filtered.filter(l => l.status === statusId);
  const newLeads = filtered.filter(l => l.status === "new");

  // ═ Stats ═
  const stats = {
    total: leads.length,
    closed: leads.filter(l => l.status === "closed").length,
    lost: leads.filter(l => l.status === "lost").length,
    inProgress: leads.filter(l => l.status === "in_progress").length,
    convRate: leads.length ? ((leads.filter(l => l.status === "closed").length / leads.length) * 100).toFixed(0) : 0,
    totalRev: leads.filter(l => l.status === "closed").reduce((s, l) => s + (l.amount || 0), 0),
    byService: {},
  };
  leads.forEach(l => { if (l.service) { stats.byService[l.service] = (stats.byService[l.service] || 0) + 1; } });

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🎤 אולפני הנסיכה <span style={{ fontSize: 12, fontWeight: 500, color: "#8B5CF6" }}>CRM</span></h1>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button style={{ ...S.iconBtn, position: "relative" }} onClick={() => setShowNotifs(true)}>
              {I.bell}
              {notifs.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{notifs.length}</span>}
            </button>
            {view === "leads" && <button style={S.addBtn} onClick={() => setShowForm(true)}>{I.plus} ליד חדש</button>}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={S.searchBox}>{I.search}<input style={S.searchInp} value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." /></div>
          <div style={S.tabs}>
            <button style={view === "leads" ? S.tabOn : S.tabOff} onClick={() => { if (view === "leads") setLeadsMode(leadsMode === "board" ? "list" : "board"); else setView("leads"); }}>
              לידים {view === "leads" && <span style={{ fontSize: 10, opacity: 0.7 }}>({leadsMode === "board" ? "לוח" : "רשימה"})</span>}
            </button>
            <button style={view === "clients" ? S.tabOn : S.tabOff} onClick={() => setView("clients")}>לקוחות</button>
            <button style={view === "tasks" ? S.tabOn : S.tabOff} onClick={() => setView("tasks")}>משימות</button>
            <button style={view === "finance" ? S.tabOn : S.tabOff} onClick={() => setView("finance")}>💰 כספים</button>
            <button style={view === "stats" ? S.tabOn : S.tabOff} onClick={() => setView("stats")}>נתונים</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {view === "leads" && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "6px 16px", alignItems: "center" }}>
          <button style={!serviceFilter && !taskFilter && !statusFilter ? S.filterOn : S.filterOff} onClick={() => { setServiceFilter(""); setTaskFilter(false); setStatusFilter(""); }}>הכל</button>
          {STATUSES.filter(s => s.id !== "closed").map(s => {
            const c = leads.filter(l => l.status === s.id).length;
            if (c === 0) return null;
            return <button key={s.id} style={statusFilter === s.id ? { ...S.filterOn, background: s.color } : S.filterOff} onClick={() => setStatusFilter(statusFilter === s.id ? "" : s.id)}>{s.label} ({c})</button>;
          })}
          <span style={{ width: 1, height: 16, background: "#334155", margin: "0 2px" }} />
          {SERVICES.map(svc => {
            const c = leads.filter(l => l.service === svc && l.status !== "closed").length;
            if (c === 0) return null;
            return <button key={svc} style={serviceFilter === svc ? S.filterOn : S.filterOff} onClick={() => setServiceFilter(serviceFilter === svc ? "" : svc)}>{svc} ({c})</button>;
          })}
          <span style={{ width: 1, height: 16, background: "#334155", margin: "0 2px" }} />
          <button style={taskFilter ? { ...S.filterOn, background: "#3B82F6" } : S.filterOff} onClick={() => setTaskFilter(!taskFilter)}>📋 יש משימות ({leads.filter(l => tasks.some(t => t.lead_id === l.id && !t.completed)).length})</button>
        </div>
      )}

      {/* ═══ LEADS BOARD ═══ */}
      {view === "leads" && leadsMode === "board" && (
        <div style={S.section}>
          {/* New leads */}
          {newLeads.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#3B82F6", marginBottom: 6 }}>🆕 חדשים ({newLeads.length})</div>
              {newLeads.map(l => (
                <div key={l.id} style={{ ...S.card, marginBottom: 6 }} onClick={() => setSelectedLead(l.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{l.name}</span>
                    <span style={{ fontSize: 11, color: "#64748B" }}>{fmtDate(l.created_at)}</span>
                  </div>
                  {l.service && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{l.service}</div>}
                </div>
              ))}
            </div>
          )}
          {/* Other statuses */}
          {boardStatuses.map(status => {
            const sLeads = boardLeads(status.id);
            if (sLeads.length === 0 && status.id !== "in_progress") return null;
            return (
              <div key={status.id} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: status.color, marginBottom: 6 }}>{status.emoji} {status.label} ({sLeads.length})</div>
                {sLeads.map(l => {
                  const temp = TEMPS.find(t => t.id === l.temperature);
                  return (
                    <div key={l.id} style={{ ...S.card, marginBottom: 6, borderColor: temp && l.status === "in_progress" ? temp.border : "#334155" }} onClick={() => setSelectedLead(l.id)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{l.name} {temp && l.status === "in_progress" ? temp.emoji : ""}</span>
                        {l.amount > 0 && <span style={{ fontSize: 12, color: "#10B981", fontWeight: 700 }}>{fmtMoney(l.amount)}</span>}
                      </div>
                      {l.service && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{l.service}</div>}
                      {tasks.some(t => t.lead_id === l.id && !t.completed) && <div style={{ fontSize: 10, color: "#F59E0B", marginTop: 2 }}>📋 {tasks.filter(t => t.lead_id === l.id && !t.completed).length} משימות</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ LEADS LIST ═══ */}
      {view === "leads" && leadsMode === "list" && (
        <div style={S.section}>
          {filtered.filter(l => l.status !== "closed").map(l => {
            const statusObj = STATUSES.find(s => s.id === l.status);
            return (
              <div key={l.id} style={{ ...S.card, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }} onClick={() => setSelectedLead(l.id)}>
                <span style={{ fontSize: 14 }}>{statusObj?.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>{l.service || ""}</div>
                </div>
                <div style={{ textAlign: "left", fontSize: 11, color: "#475569" }}>{fmtDate(l.created_at)}</div>
                {l.amount > 0 && <div style={{ fontSize: 12, color: "#10B981", fontWeight: 700 }}>{fmtMoney(l.amount)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ CLIENTS ═══ */}
      {view === "clients" && (
        <div style={S.section}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
            <button style={!serviceFilter ? S.filterOn : S.filterOff} onClick={() => setServiceFilter("")}>הכל ({clients.length})</button>
            {SERVICES.map(svc => {
              const c = clients.filter(l => l.service === svc).length;
              if (c === 0) return null;
              return <button key={svc} style={serviceFilter === svc ? S.filterOn : S.filterOff} onClick={() => setServiceFilter(serviceFilter === svc ? "" : svc)}>{svc} ({c})</button>;
            })}
          </div>
          {clientsFiltered.map(l => (
            <div key={l.id} style={{ ...S.card, marginBottom: 6 }} onClick={() => setSelectedLead(l.id)}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700 }}>{l.name}</span>
                {l.amount > 0 && <span style={{ color: "#10B981", fontWeight: 700, fontSize: 13 }}>{fmtMoney(l.amount)}</span>}
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>{l.service}</div>
              {l.service?.includes("פודקאסט") && <div style={{ fontSize: 10, color: "#8B5CF6", marginTop: 2 }}>🎙️ {sessions.filter(s => s.lead_id === l.id).length} סשנים</div>}
            </div>
          ))}
        </div>
      )}

      {/* ═══ TASKS ═══ */}
      {view === "tasks" && (
        <div style={S.section}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>משימות פתוחות</div>
          {tasks.filter(t => !t.completed).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).map(t => {
            const lead = leads.find(l => l.id === t.lead_id);
            const tt = TASK_TYPES.find(x => x.id === t.type);
            const overdue = new Date(t.due_date) < new Date();
            return (
              <div key={t.id} style={{ ...S.card, marginBottom: 4, display: "flex", alignItems: "center", gap: 8, borderRight: overdue ? "3px solid #EF4444" : "3px solid transparent" }} onClick={() => lead && setSelectedLead(lead.id)}>
                <span>{tt?.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>{lead?.name} · {fmtDate(t.due_date)}{overdue && " ⚠️"}</div>
                </div>
                <button style={{ ...S.iconBtn, color: "#10B981" }} onClick={e => { e.stopPropagation(); toggleTask(t.id, false); }}>{I.check}</button>
              </div>
            );
          })}
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 16, marginBottom: 8, color: "#475569" }}>הושלמו</div>
          {tasks.filter(t => t.completed).slice(0, 10).map(t => {
            const lead = leads.find(l => l.id === t.lead_id);
            return (
              <div key={t.id} style={{ ...S.card, marginBottom: 4, opacity: 0.5, display: "flex", alignItems: "center", gap: 8 }}>
                <span>✅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, textDecoration: "line-through" }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{lead?.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ FINANCE ═══ */}
      {view === "finance" && (
        <FinanceView manualTx={manualTx} recurringTx={recurringTx} leads={leads} onAddManual={addManualTx} onUpdateManual={updateManualTx} onDeleteManual={deleteManualTx} onAddRecurring={addRecurringTx} onUpdateRecurring={updateRecurringTx} onDeleteRecurring={deleteRecurringTx} showToast={showToast} />
      )}

      {/* ═══ STATS ═══ */}
      {view === "stats" && (
        <div style={S.section}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            <div style={{ background: "#1E293B", borderRadius: 10, padding: 12, textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 800 }}>{stats.total}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>לידים</div></div>
            <div style={{ background: "#1E293B", borderRadius: 10, padding: 12, textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 800, color: "#10B981" }}>{stats.convRate}%</div><div style={{ fontSize: 11, color: "#94A3B8" }}>המרה</div></div>
            <div style={{ background: "#1E293B", borderRadius: 10, padding: 12, textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 800, color: "#10B981" }}>{stats.closed}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>נסגרו</div></div>
            <div style={{ background: "#1E293B", borderRadius: 10, padding: 12, textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 800, color: "#EF4444" }}>{stats.lost}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>אבדו</div></div>
          </div>
          <div style={{ background: "#1E293B", borderRadius: 10, padding: 12, marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#10B981" }}>{fmtMoney(stats.totalRev)}</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>הכנסות מלקוחות שנסגרו</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>לפי שירות</div>
          {Object.entries(stats.byService).sort((a, b) => b[1] - a[1]).map(([svc, count]) => (
            <div key={svc} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1E293B" }}>
              <span style={{ fontSize: 13 }}>{svc}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* ═══ NEW LEAD MODAL ═══ */}
      {showForm && (
        <div style={S.modal} onClick={() => setShowForm(false)}>
          <div style={S.modalInner} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>ליד חדש</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input style={S.input} value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} placeholder="שם *" autoFocus />
              <input style={S.input} value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} placeholder="טלפון" type="tel" />
              <input style={S.input} value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} placeholder="אימייל" type="email" />
              <input style={S.input} value={newLead.instagram} onChange={e => setNewLead({ ...newLead, instagram: e.target.value })} placeholder="אינסטגרם" />
              <select style={S.select} value={newLead.service} onChange={e => setNewLead({ ...newLead, service: e.target.value })}>
                <option value="">בחר שירות</option>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {SOURCES.map(src => (
                  <button key={src} style={newLead.source === src ? S.filterOn : S.filterOff} onClick={() => setNewLead({ ...newLead, source: src })}>{src}</button>
                ))}
              </div>
              <textarea style={{ ...S.input, minHeight: 60 }} value={newLead.notes} onChange={e => setNewLead({ ...newLead, notes: e.target.value })} placeholder="הערות מהשיחה" />
              <button style={S.saveBtn} onClick={addLead}>שמור</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ NOTIFICATIONS MODAL ═══ */}
      {showNotifs && (
        <div style={S.modal} onClick={() => setShowNotifs(false)}>
          <div style={S.modalInner} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🔔 התראות ({notifs.length})</div>
            {notifs.length === 0 && <div style={{ color: "#475569", textAlign: "center", padding: 20 }}>אין התראות</div>}
            {notifs.map((n, i) => (
              <div key={i} style={{ ...S.card, marginBottom: 6, cursor: "pointer" }} onClick={() => { setSelectedLead(n.lead?.id); setShowNotifs(false); }}>
                {n.type === "idle" && <div style={{ fontSize: 13 }}>😴 <strong>{n.lead.name}</strong> — {n.days} ימים ללא פעילות</div>}
                {n.type === "overdue" && <div style={{ fontSize: 13 }}>⚠️ <strong>{n.lead?.name}</strong> — משימה באיחור: {n.task.title}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <Toast {...toast} />
    </div>
  );
}
