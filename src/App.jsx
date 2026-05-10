import { useState, useEffect, useCallback, useRef } from "react";

// ─── Supabase Config ───
const SUPABASE_URL = "https://lbqscxwfttiduofjjmyt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxicXNjeHdmdHRpZHVvZmpqbXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzUwNTksImV4cCI6MjA5NDAxMTA1OX0.pPFtxoO5UhRt_UFxJxFOy8zbwLK4OXnk6lxRUGhZack";

// ─── Google Calendar Script ───
const GCAL_URL = "https://script.google.com/macros/s/AKfycbyFyUmXAmlQCuZHgtAKu_0Zc_b3eEDf_u32oCYdNqLAK6t3ktlNktf2tJ-hPhvXgq8N9w/exec";

async function addToCalendar(title, startDate, description = "") {
  try {
    const res = await fetch(GCAL_URL, {
      method: "POST",
      body: JSON.stringify({ title, start: startDate, description, duration: 30 }),
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.error("Calendar error:", e);
    return false;
  }
}

const hdrs = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function sb(table, method = "GET", body = null, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const opts = { method, headers: hdrs };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── Constants ───
const STATUSES = [
  { id: "new", label: "ליד חדש", color: "#8B5CF6", bg: "#8B5CF615" },
  { id: "in_progress", label: "בתהליך", color: "#3B82F6", bg: "#3B82F615" },
  { id: "closed", label: "נסגר ✓", color: "#10B981", bg: "#10B98115" },
  { id: "lost", label: "לא נסגר", color: "#EF4444", bg: "#EF444415" },
];

const SERVICES = ["הקלטה", "מיקס", "הפקה", "לייב סשן", "פודקאסט", "צילום קורס", "השכרת חלל", "בית ריק", "אחר"];
const SOURCES = ["אינסטגרם", "המלצה", "גוגל", "פייסבוק", "אתר", "חוזר/ת", "אחר"];
const TASK_TYPES = [
  { id: "followup", label: "פולואפ", icon: "📞" },
  { id: "call", label: "שיחה", icon: "☎️" },
  { id: "prep", label: "הכנת חומרים", icon: "📦" },
  { id: "export", label: "ייצוא", icon: "📤" },
  { id: "other", label: "אחר", icon: "📌" },
];

const INTERACTION_TYPES = [
  { id: "call", label: "שיחה" },
  { id: "followup", label: "פולואפ" },
  { id: "meeting", label: "פגישה" },
  { id: "quote", label: "הצעת מחיר" },
  { id: "note", label: "הערה" },
];

// ─── Helpers ───
function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function formatDateFull(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

function daysAgo(d) {
  if (!d) return "";
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return "היום";
  if (diff === 1) return "אתמול";
  if (diff < 0) return `בעוד ${Math.abs(diff)} ימים`;
  return `לפני ${diff} ימים`;
}

// Toast notification state (global for simplicity)
let _showToast = () => {};
function Toast({ message, type }) {
  if (!message) return null;
  const bg = type === "success" ? "#10B981" : type === "error" ? "#EF4444" : "#3B82F6";
  return <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: bg, color: "#fff", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 200, direction: "rtl", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>{message}</div>;
}

function useToast() {
  const [toast, setToast] = useState({ message: "", type: "" });
  _showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };
  return toast;
}

async function sendToCalendar(title, date, description) {
  const ok = await addToCalendar(title, date, description);
  _showToast(ok ? "✓ נוסף ליומן" : "שגיאה בהוספה ליומן", ok ? "success" : "error");
  return ok;
}

// ─── Icons ───
const I = {
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  cal: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
};

// ─── Modal ───
function Modal({ children, onClose }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

// ─── Lead Form ───
function LeadForm({ onSave, onClose, editLead }) {
  const isEdit = !!editLead;
  const [f, setF] = useState({
    name: editLead?.name || "", phone: editLead?.phone || "", email: editLead?.email || "",
    service: editLead?.service || "", source: editLead?.source || "",
    notes: editLead?.notes || "", amount: editLead?.amount || "",
  });
  const [addFollowup, setAddFollowup] = useState(!isEdit);
  const [followupDays, setFollowupDays] = useState(2);
  const ref = useRef();
  useEffect(() => { ref.current?.focus(); }, []);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.name.trim()) return;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + followupDays);
    dueDate.setHours(10, 0, 0, 0);
    onSave(
      { name: f.name.trim(), phone: f.phone, email: f.email, service: f.service, source: f.source, notes: f.notes, amount: f.amount ? Number(f.amount) : 0, status: "new" },
      addFollowup ? { title: `פולואפ`, type: "followup", due_date: dueDate.toISOString(), completed: false } : null
    );
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div style={S.mHead}><h2 style={S.mTitle}>ליד חדש</h2><button style={S.iconBtn} onClick={onClose}>{I.x}</button></div>
      <div style={S.grid2}>
        <div style={S.full}><label style={S.lbl}>שם *</label><input ref={ref} style={S.inp} value={f.name} onChange={e => set("name", e.target.value)} placeholder="שם הלקוח/ה" onKeyDown={e => e.key === "Enter" && submit()} /></div>
        <div><label style={S.lbl}>טלפון</label><input style={S.inp} value={f.phone} onChange={e => set("phone", e.target.value)} placeholder="050-0000000" dir="ltr" /></div>
        <div><label style={S.lbl}>אימייל</label><input style={S.inp} value={f.email} onChange={e => set("email", e.target.value)} placeholder="email@example.com" dir="ltr" /></div>
        <div><label style={S.lbl}>שירות</label><select style={S.inp} value={f.service} onChange={e => set("service", e.target.value)}><option value="">בחר...</option>{SERVICES.map(s => <option key={s}>{s}</option>)}</select></div>
        <div><label style={S.lbl}>מקור פנייה</label><select style={S.inp} value={f.source} onChange={e => set("source", e.target.value)}><option value="">בחר...</option>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
        <div><label style={S.lbl}>סכום (₪)</label><input style={S.inp} type="number" value={f.amount} onChange={e => set("amount", e.target.value)} placeholder="0" dir="ltr" /></div>
        <div style={S.full}><label style={S.lbl}>הערות</label><textarea style={{ ...S.inp, minHeight: 50, resize: "vertical" }} value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="פרטים נוספים..." /></div>
        <div style={{ ...S.full, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, paddingTop: 8, borderTop: "1px solid #334155" }}>
          <label style={{ ...S.lbl, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", margin: 0 }}>
            <input type="checkbox" checked={addFollowup} onChange={e => setAddFollowup(e.target.checked)} style={{ accentColor: "#8B5CF6", width: 16, height: 16 }} />
            צור פולואפ אוטומטי
          </label>
          {addFollowup && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#94A3B8" }}>בעוד</span>
              <input type="number" value={followupDays} onChange={e => setFollowupDays(Number(e.target.value))} style={{ ...S.inp, width: 50, textAlign: "center", padding: "4px 6px" }} min={1} dir="ltr" />
              <span style={{ fontSize: 13, color: "#94A3B8" }}>ימים</span>
            </div>
          )}
        </div>
      </div>
      <div style={S.mFoot}>
        <button style={S.btn2} onClick={onClose}>ביטול</button>
        <button style={S.btn1} onClick={submit} disabled={!f.name.trim()}>שמור ליד</button>
      </div>
    </Modal>
  );
}

// ─── Task Form ───
function TaskForm({ leadId, leadName, onSave, onClose }) {
  const [f, setF] = useState({ title: "", type: "followup", due_date: "", due_time: "10:00" });
  const [addToCal, setAddToCal] = useState(true);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.title.trim() || !f.due_date) return;
    const dt = new Date(`${f.due_date}T${f.due_time || "10:00"}`);
    onSave(
      { lead_id: leadId, title: f.title.trim(), type: f.type, due_date: dt.toISOString(), completed: false },
      addToCal
    );
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div style={S.mHead}><h2 style={S.mTitle}>משימה חדשה{leadName ? ` — ${leadName}` : ""}</h2><button style={S.iconBtn} onClick={onClose}>{I.x}</button></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div><label style={S.lbl}>תיאור *</label><input style={S.inp} value={f.title} onChange={e => set("title", e.target.value)} placeholder="למשל: לחזור ללקוח עם הצעת מחיר" onKeyDown={e => e.key === "Enter" && submit()} /></div>
        <div style={S.grid2}>
          <div><label style={S.lbl}>סוג</label><select style={S.inp} value={f.type} onChange={e => set("type", e.target.value)}>{TASK_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}</select></div>
          <div><label style={S.lbl}>תאריך *</label><input style={S.inp} type="date" value={f.due_date} onChange={e => set("due_date", e.target.value)} dir="ltr" /></div>
          <div><label style={S.lbl}>שעה</label><input style={S.inp} type="time" value={f.due_time} onChange={e => set("due_time", e.target.value)} dir="ltr" /></div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#94A3B8", cursor: "pointer", paddingTop: 4, borderTop: "1px solid #334155" }}>
          <input type="checkbox" checked={addToCal} onChange={e => setAddToCal(e.target.checked)} style={{ accentColor: "#3B82F6", width: 16, height: 16 }} />
          הוסף ליומן גוגל
        </label>
      </div>
      <div style={S.mFoot}>
        <button style={S.btn2} onClick={onClose}>ביטול</button>
        <button style={S.btn1} onClick={submit} disabled={!f.title.trim() || !f.due_date}>שמור משימה</button>
      </div>
    </Modal>
  );
}

// ─── Lead Detail ───
function LeadDetail({ lead, interactions, tasks, onBack, onUpdate, onDelete, onAddInteraction, onUpdateInteraction, onDeleteInteraction, onAddTask, onUpdateTask, onToggleTask, onDeleteTask }) {
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [editInterText, setEditInterText] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskText, setEditTaskText] = useState("");

  const startEdit = () => {
    setEditForm({ name: lead.name, phone: lead.phone || "", email: lead.email || "", service: lead.service || "", source: lead.source || "", notes: lead.notes || "", amount: lead.amount || 0 });
    setEditing(true);
  };

  const saveEdit = () => {
    onUpdate(lead.id, { ...editForm, amount: Number(editForm.amount) || 0 });
    setEditing(false);
  };

  const ef = (k, v) => setEditForm(p => ({ ...p, [k]: v }));

  const addNote = async () => {
    if (!noteText.trim()) return;
    await onAddInteraction({ lead_id: lead.id, text: noteText.trim(), type: noteType, date: new Date(noteDate + "T12:00:00").toISOString() });
    setNoteText("");
    setNoteDate(new Date().toISOString().split("T")[0]);
  };

  const startEditInteraction = (i) => {
    setEditingInteraction(i.id);
    setEditInterText(i.text);
  };

  const saveInteraction = (id) => {
    if (editInterText.trim()) onUpdateInteraction(id, { text: editInterText.trim() });
    setEditingInteraction(null);
  };

  const leadTasks = tasks.filter(t => t.lead_id === lead.id).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const leadInteractions = interactions.filter(i => i.lead_id === lead.id).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div style={S.detail}>
      <div style={S.detailTop}>
        <button style={S.backBtn} onClick={onBack}>{I.back} חזרה</button>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ ...S.iconBtn, color: "#8B5CF6" }} onClick={startEdit} title="ערוך ליד">{I.edit}</button>
          <button style={{ ...S.iconBtn, color: "#EF4444" }} onClick={() => { if (confirm("למחוק את הליד וכל המידע שלו?")) { onDelete(lead.id); onBack(); } }}>{I.trash}</button>
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <Modal onClose={() => setEditing(false)}>
          <div style={S.mHead}><h2 style={S.mTitle}>עריכת ליד</h2><button style={S.iconBtn} onClick={() => setEditing(false)}>{I.x}</button></div>
          <div style={S.grid2}>
            <div style={S.full}><label style={S.lbl}>שם</label><input style={S.inp} value={editForm.name} onChange={e => ef("name", e.target.value)} /></div>
            <div><label style={S.lbl}>טלפון</label><input style={S.inp} value={editForm.phone} onChange={e => ef("phone", e.target.value)} dir="ltr" /></div>
            <div><label style={S.lbl}>אימייל</label><input style={S.inp} value={editForm.email} onChange={e => ef("email", e.target.value)} dir="ltr" /></div>
            <div><label style={S.lbl}>שירות</label><select style={S.inp} value={editForm.service} onChange={e => ef("service", e.target.value)}><option value="">בחר...</option>{SERVICES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label style={S.lbl}>מקור פנייה</label><select style={S.inp} value={editForm.source} onChange={e => ef("source", e.target.value)}><option value="">בחר...</option>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label style={S.lbl}>סכום (₪)</label><input style={S.inp} type="number" value={editForm.amount} onChange={e => ef("amount", e.target.value)} dir="ltr" /></div>
            <div style={S.full}><label style={S.lbl}>הערות</label><textarea style={{ ...S.inp, minHeight: 60, resize: "vertical" }} value={editForm.notes} onChange={e => ef("notes", e.target.value)} /></div>
          </div>
          <div style={S.mFoot}>
            <button style={S.btn2} onClick={() => setEditing(false)}>ביטול</button>
            <button style={S.btn1} onClick={saveEdit}>שמור שינויים</button>
          </div>
        </Modal>
      )}

      <div style={S.detailCard}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>{lead.name}</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, fontSize: 14, color: "#CBD5E1" }}>
          {lead.phone && <a href={`tel:${lead.phone}`} style={{ display: "flex", alignItems: "center", gap: 4, color: "#CBD5E1" }}>{lead.phone}</a>}
          {lead.email && <a href={`mailto:${lead.email}`} style={{ color: "#CBD5E1" }}>{lead.email}</a>}
          {lead.service && <span style={S.chip}>{lead.service}</span>}
          {lead.source && <span style={S.chip}>{lead.source}</span>}
          {lead.amount > 0 && <span style={{ color: "#10B981", fontWeight: 700 }}>₪{lead.amount.toLocaleString()}</span>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {STATUSES.map(s => (
            <button key={s.id} onClick={() => onUpdate(lead.id, { status: s.id })} style={{ border: "none", padding: "5px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", background: lead.status === s.id ? s.color : s.bg, color: lead.status === s.id ? "#fff" : s.color, fontWeight: lead.status === s.id ? 700 : 500 }}>{s.label}</button>
          ))}
        </div>
        {lead.notes && <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.6, margin: "10px 0 0", padding: "10px 0 0", borderTop: "1px solid #1E293B" }}>{lead.notes}</p>}
        <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#475569", marginTop: 10, paddingTop: 8, borderTop: "1px solid #1E293B" }}>
          <span>נוצר: {formatDateFull(lead.created_at)}</span>
          <span>עודכן: {daysAgo(lead.updated_at)}</span>
        </div>
      </div>

      {/* Tasks */}
      <div style={S.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={S.secTitle}>{I.cal} משימות ({leadTasks.length})</h3>
          <button style={{ ...S.btn1, padding: "5px 12px", fontSize: 12 }} onClick={() => setShowTaskForm(true)}>{I.plus} משימה</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {leadTasks.map(t => {
            const tt = TASK_TYPES.find(x => x.id === t.type);
            const overdue = !t.completed && new Date(t.due_date) < new Date();
            const isEditingT = editingTask === t.id;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0F172A", borderRadius: 8, padding: "8px 12px", opacity: t.completed ? 0.5 : 1, borderRight: `3px solid ${overdue ? "#EF4444" : t.completed ? "#10B981" : "#3B82F6"}` }}>
                <button onClick={() => onToggleTask(t.id, !t.completed)} style={{ ...S.iconBtn, color: t.completed ? "#10B981" : "#475569", flexShrink: 0 }}>{t.completed ? I.check : <div style={{ width: 14, height: 14, border: "2px solid #475569", borderRadius: 3 }} />}</button>
                {isEditingT ? (
                  <>
                    <input style={{ ...S.inp, flex: 1, padding: "4px 8px", fontSize: 13 }} value={editTaskText} onChange={e => setEditTaskText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { onUpdateTask(t.id, { title: editTaskText.trim() }); setEditingTask(null); } if (e.key === "Escape") setEditingTask(null); }} autoFocus />
                    <button onClick={() => { onUpdateTask(t.id, { title: editTaskText.trim() }); setEditingTask(null); }} style={{ ...S.iconBtn, color: "#10B981" }}>{I.check}</button>
                    <button onClick={() => setEditingTask(null)} style={{ ...S.iconBtn, color: "#64748B" }}>{I.x}</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 13, flex: 1, textDecoration: t.completed ? "line-through" : "none" }}>{tt?.icon} {t.title}</span>
                    <span style={{ fontSize: 11, color: overdue ? "#EF4444" : "#475569", whiteSpace: "nowrap" }}>{formatDate(t.due_date)}</span>
                    <button onClick={() => sendToCalendar(`${lead.name} — ${t.title}`, t.due_date, `טלפון: ${lead.phone || ""}`)} style={{ ...S.iconBtn, color: "#3B82F6" }} title="הוסף ליומן">{I.cal}</button>
                    <button onClick={() => { setEditingTask(t.id); setEditTaskText(t.title); }} style={{ ...S.iconBtn, color: "#64748B" }} title="ערוך">{I.edit}</button>
                    <button onClick={() => { if (confirm("למחוק משימה?")) onDeleteTask(t.id); }} style={{ ...S.iconBtn, color: "#64748B" }} title="מחק">{I.trash}</button>
                  </>
                )}
              </div>
            );
          })}
          {leadTasks.length === 0 && <p style={S.empty}>אין משימות</p>}
        </div>
      </div>

      {/* Interactions */}
      <div style={S.section}>
        <h3 style={S.secTitle}>💬 אינטראקציות ({leadInteractions.length})</h3>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <select style={{ ...S.inp, width: 90, padding: "6px 8px", fontSize: 12 }} value={noteType} onChange={e => setNoteType(e.target.value)}>
            {INTERACTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <input style={{ ...S.inp, width: 120, padding: "6px 8px", fontSize: 12 }} type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} dir="ltr" />
          <input style={{ ...S.inp, flex: 1 }} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="הוסף אינטראקציה..." onKeyDown={e => e.key === "Enter" && addNote()} />
          <button style={S.btn1} onClick={addNote} disabled={!noteText.trim()}>הוסף</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {leadInteractions.map(i => {
            const it = INTERACTION_TYPES.find(x => x.id === i.type);
            const isEditing = editingInteraction === i.id;
            return (
              <div key={i.id} style={{ display: "flex", gap: 8, alignItems: "center", background: "#0F172A", borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ fontSize: 11, color: "#475569", whiteSpace: "nowrap", minWidth: 55 }}>{formatDate(i.date)}</span>
                {it && <span style={{ fontSize: 11, color: "#8B5CF6", background: "#8B5CF615", padding: "1px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>{it.label}</span>}
                {isEditing ? (
                  <>
                    <input style={{ ...S.inp, flex: 1, padding: "4px 8px", fontSize: 13 }} value={editInterText} onChange={e => setEditInterText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveInteraction(i.id); if (e.key === "Escape") setEditingInteraction(null); }} autoFocus />
                    <button onClick={() => saveInteraction(i.id)} style={{ ...S.iconBtn, color: "#10B981" }}>{I.check}</button>
                    <button onClick={() => setEditingInteraction(null)} style={{ ...S.iconBtn, color: "#64748B" }}>{I.x}</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>{i.text}</span>
                    <button onClick={() => startEditInteraction(i)} style={{ ...S.iconBtn, color: "#64748B" }} title="ערוך">{I.edit}</button>
                    <button onClick={() => { if (confirm("למחוק אינטראקציה?")) onDeleteInteraction(i.id); }} style={{ ...S.iconBtn, color: "#64748B" }} title="מחק">{I.trash}</button>
                  </>
                )}
              </div>
            );
          })}
          {leadInteractions.length === 0 && <p style={S.empty}>אין אינטראקציות עדיין</p>}
        </div>
      </div>

      {showTaskForm && <TaskForm leadId={lead.id} leadName={lead.name} onSave={async (t, addToCal) => { await onAddTask(t); if (addToCal) sendToCalendar(`${lead.name} — ${t.title}`, t.due_date, `טלפון: ${lead.phone || ""}`); setShowTaskForm(false); }} onClose={() => setShowTaskForm(false)} />}
    </div>
  );
}

// ─── Stats ───
function Stats({ leads }) {
  const total = leads.length;
  const byStatus = STATUSES.map(s => ({ ...s, count: leads.filter(l => l.status === s.id).length }));
  const closed = byStatus.find(s => s.id === "closed")?.count || 0;
  const lost = byStatus.find(s => s.id === "lost")?.count || 0;
  const decided = closed + lost;
  const rate = decided > 0 ? Math.round((closed / decided) * 100) : 0;
  const revenue = leads.filter(l => l.status === "closed").reduce((s, l) => s + (l.amount || 0), 0);

  const byService = {};
  leads.forEach(l => { if (l.service) byService[l.service] = (byService[l.service] || 0) + 1; });
  const topSvc = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const bySource = {};
  leads.forEach(l => { if (l.source) bySource[l.source] = (bySource[l.source] || 0) + 1; });
  const topSrc = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const maxSvc = topSvc[0]?.[1] || 1;
  const maxSrc = topSrc[0]?.[1] || 1;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, padding: "8px 0 20px" }}>
      <div style={S.statCard}><div style={{ fontSize: 36, fontWeight: 800 }}>{total}</div><div style={S.statLbl}>סה״כ לידים</div></div>
      <div style={S.statCard}><div style={{ fontSize: 36, fontWeight: 800, color: "#10B981" }}>{rate}%</div><div style={S.statLbl}>אחוז המרה</div></div>
      <div style={S.statCard}><div style={{ fontSize: 28, fontWeight: 800, color: "#3B82F6" }}>₪{revenue.toLocaleString()}</div><div style={S.statLbl}>הכנסות (נסגרו)</div></div>
      <div style={S.statCard}>{byStatus.map(s => (<div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} /><span style={{ flex: 1 }}>{s.label}</span><span style={{ fontWeight: 700 }}>{s.count}</span></div>))}</div>
      {topSvc.length > 0 && <div style={S.statCard}><div style={S.statLbl}>שירותים</div>{topSvc.map(([n, c]) => (<div key={n} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><span style={{ minWidth: 70 }}>{n}</span><div style={{ flex: 1, height: 5, background: "#1E293B", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${(c / maxSvc) * 100}%`, background: "#3B82F6", borderRadius: 3 }} /></div><span style={{ fontWeight: 600, minWidth: 16, textAlign: "center" }}>{c}</span></div>))}</div>}
      {topSrc.length > 0 && <div style={S.statCard}><div style={S.statLbl}>מקורות</div>{topSrc.map(([n, c]) => (<div key={n} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><span style={{ minWidth: 70 }}>{n}</span><div style={{ flex: 1, height: 5, background: "#1E293B", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${(c / maxSrc) * 100}%`, background: "#8B5CF6", borderRadius: 3 }} /></div><span style={{ fontWeight: 600, minWidth: 16, textAlign: "center" }}>{c}</span></div>))}</div>}
    </div>
  );
}

// ─── Tasks View ───
function TasksView({ tasks, leads, onToggle, onDelete }) {
  const pending = tasks.filter(t => !t.completed).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const done = tasks.filter(t => t.completed).sort((a, b) => new Date(b.due_date) - new Date(a.due_date)).slice(0, 10);

  const renderTask = (t) => {
    const lead = leads.find(l => l.id === t.lead_id);
    const tt = TASK_TYPES.find(x => x.id === t.type);
    const overdue = !t.completed && new Date(t.due_date) < new Date();
    return (
      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0F172A", borderRadius: 8, padding: "8px 12px", opacity: t.completed ? 0.5 : 1, borderRight: `3px solid ${overdue ? "#EF4444" : t.completed ? "#10B981" : "#3B82F6"}` }}>
        <button onClick={() => onToggle(t.id, !t.completed)} style={{ ...S.iconBtn, color: t.completed ? "#10B981" : "#475569", flexShrink: 0 }}>{t.completed ? I.check : <div style={{ width: 14, height: 14, border: "2px solid #475569", borderRadius: 3 }} />}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, textDecoration: t.completed ? "line-through" : "none" }}>{tt?.icon} {t.title}</div>
          {lead && <div style={{ fontSize: 11, color: "#475569" }}>{lead.name}</div>}
        </div>
        <span style={{ fontSize: 11, color: overdue ? "#EF4444" : "#475569", whiteSpace: "nowrap" }}>{daysAgo(t.due_date)}</span>
        <button onClick={() => sendToCalendar(lead ? `${lead.name} — ${t.title}` : t.title, t.due_date, lead ? `טלפון: ${lead.phone || ""}` : "")} style={{ ...S.iconBtn, color: "#3B82F6" }} title="הוסף ליומן">{I.cal}</button>
        <button onClick={() => onDelete(t.id)} style={{ ...S.iconBtn, color: "#64748B" }}>{I.trash}</button>
      </div>
    );
  };

  return (
    <div style={{ padding: "8px 0 20px" }}>
      <h3 style={{ ...S.secTitle, marginBottom: 8 }}>משימות פתוחות ({pending.length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {pending.map(renderTask)}
        {pending.length === 0 && <p style={S.empty}>אין משימות פתוחות 🎉</p>}
      </div>
      {done.length > 0 && (
        <>
          <h3 style={{ ...S.secTitle, marginTop: 16, marginBottom: 8, color: "#475569" }}>הושלמו (אחרונות)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{done.map(renderTask)}</div>
        </>
      )}
    </div>
  );
}

// ─── Main App ───
export default function App() {
  const [leads, setLeads] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("board");
  const [showForm, setShowForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [search, setSearch] = useState("");
  const [dragId, setDragId] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const [l, i, t] = await Promise.all([
        sb("leads", "GET", null, "?order=updated_at.desc"),
        sb("interactions", "GET", null, "?order=date.desc"),
        sb("tasks", "GET", null, "?order=due_date.asc"),
      ]);
      setLeads(l || []);
      setInteractions(i || []);
      setTasks(t || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addLead = async (lead, followupTask) => {
    try {
      const [created] = await sb("leads", "POST", lead);
      setLeads(p => [created, ...p]);
      if (followupTask && created) {
        const [task] = await sb("tasks", "POST", { ...followupTask, lead_id: created.id });
        setTasks(p => [...p, task]);
        // הוסף ישר ליומן
        sendToCalendar(`${lead.name} — ${followupTask.title}`, followupTask.due_date, `טלפון: ${lead.phone || "—"}\nשירות: ${lead.service || "—"}`);
      }
    } catch (e) { setError(e.message); }
  };

  const updateLead = async (id, updates) => {
    try {
      const [updated] = await sb("leads", "PATCH", updates, `?id=eq.${id}`);
      setLeads(p => p.map(l => l.id === id ? updated : l));
      if (selectedLead?.id === id) setSelectedLead(updated);
    } catch (e) { setError(e.message); }
  };

  const deleteLead = async (id) => {
    try {
      await sb("tasks", "DELETE", null, `?lead_id=eq.${id}`);
      await sb("interactions", "DELETE", null, `?lead_id=eq.${id}`);
      await sb("leads", "DELETE", null, `?id=eq.${id}`);
      setLeads(p => p.filter(l => l.id !== id));
      setInteractions(p => p.filter(i => i.lead_id !== id));
      setTasks(p => p.filter(t => t.lead_id !== id));
    } catch (e) { setError(e.message); }
  };

  const addInteraction = async (i) => {
    try {
      const [created] = await sb("interactions", "POST", i);
      setInteractions(p => [created, ...p]);
    } catch (e) { setError(e.message); }
  };

  const addTask = async (t) => {
    try {
      const [created] = await sb("tasks", "POST", t);
      setTasks(p => [...p, created]);
    } catch (e) { setError(e.message); }
  };

  const toggleTask = async (id, completed) => {
    try {
      const [updated] = await sb("tasks", "PATCH", { completed }, `?id=eq.${id}`);
      setTasks(p => p.map(t => t.id === id ? updated : t));
    } catch (e) { setError(e.message); }
  };

  const updateTask = async (id, updates) => {
    try {
      const [updated] = await sb("tasks", "PATCH", updates, `?id=eq.${id}`);
      setTasks(p => p.map(t => t.id === id ? updated : t));
    } catch (e) { setError(e.message); }
  };

  const deleteTask = async (id) => {
    try {
      await sb("tasks", "DELETE", null, `?id=eq.${id}`);
      setTasks(p => p.filter(t => t.id !== id));
    } catch (e) { setError(e.message); }
  };

  const updateInteraction = async (id, updates) => {
    try {
      const [updated] = await sb("interactions", "PATCH", updates, `?id=eq.${id}`);
      setInteractions(p => p.map(i => i.id === id ? updated : i));
    } catch (e) { setError(e.message); }
  };

  const deleteInteraction = async (id) => {
    try {
      await sb("interactions", "DELETE", null, `?id=eq.${id}`);
      setInteractions(p => p.filter(i => i.id !== id));
    } catch (e) { setError(e.message); }
  };

  const [serviceFilter, setServiceFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState(false);

  const filtered = leads.filter(l => {
    if (search && !l.name?.includes(search) && !l.phone?.includes(search) && !l.service?.includes(search)) return false;
    if (serviceFilter && l.service !== serviceFilter) return false;
    if (taskFilter && !tasks.some(t => t.lead_id === l.id && !t.completed)) return false;
    return true;
  });

  if (loading) return <div style={{ ...S.app, display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 24, marginBottom: 8 }}>🎤</div><div style={{ color: "#64748B" }}>טוען CRM...</div></div></div>;

  if (error) return <div style={{ ...S.app, display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><div style={{ textAlign: "center", color: "#EF4444" }}><div style={{ fontSize: 16, marginBottom: 8 }}>שגיאה בחיבור</div><div style={{ fontSize: 13, color: "#64748B", marginBottom: 12, maxWidth: 400, wordBreak: "break-all" }}>{error}</div><button style={S.btn1} onClick={() => { setError(null); setLoading(true); load(); }}>נסה שוב</button></div></div>;

  if (selectedLead) {
    const fresh = leads.find(l => l.id === selectedLead.id);
    if (!fresh) { setSelectedLead(null); return null; }
    return (
      <div style={S.app}>
        <LeadDetail lead={fresh} interactions={interactions} tasks={tasks} onBack={() => setSelectedLead(null)} onUpdate={updateLead} onDelete={deleteLead} onAddInteraction={addInteraction} onUpdateInteraction={updateInteraction} onDeleteInteraction={deleteInteraction} onAddTask={addTask} onUpdateTask={updateTask} onToggleTask={toggleTask} onDeleteTask={deleteTask} />
        <Toast {...toast} />
      </div>
    );
  }

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🎤 אולפני הנסיכה <span style={{ fontSize: 12, fontWeight: 500, color: "#8B5CF6" }}>CRM</span></h1>
          <button style={S.addBtn} onClick={() => setShowForm(true)}>{I.plus} ליד חדש</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={S.searchBox}>{I.search}<input style={S.searchInp} value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." /></div>
          <div style={S.tabs}>
            {[["board", "לוח"], ["list", "רשימה"], ["tasks", "משימות"], ["stats", "נתונים"]].map(([id, label]) => (
              <button key={id} style={view === id ? S.tabOn : S.tabOff} onClick={() => setView(id)}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      {(view === "board" || view === "list") && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "6px 0", alignItems: "center" }}>
          <button style={!serviceFilter && !taskFilter ? S.filterOn : S.filterOff} onClick={() => { setServiceFilter(""); setTaskFilter(false); }}>הכל ({leads.length})</button>
          {SERVICES.map(svc => {
            const count = leads.filter(l => l.service === svc).length;
            if (count === 0) return null;
            return <button key={svc} style={serviceFilter === svc ? S.filterOn : S.filterOff} onClick={() => setServiceFilter(serviceFilter === svc ? "" : svc)}>{svc} ({count})</button>;
          })}
          <span style={{ width: 1, height: 16, background: "#334155", margin: "0 2px" }} />
          <button style={taskFilter ? { ...S.filterOn, background: "#3B82F6" } : S.filterOff} onClick={() => setTaskFilter(!taskFilter)}>📋 יש משימות ({leads.filter(l => tasks.some(t => t.lead_id === l.id && !t.completed)).length})</button>
        </div>
      )}

      {/* Board */}
      {view === "board" && (
        <div style={S.board}>
          {STATUSES.map(status => {
            const col = filtered.filter(l => l.status === status.id);
            return (
              <div key={status.id} style={S.col} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (dragId) { updateLead(dragId, { status: status.id }); setDragId(null); } }}>
                <div style={S.colHead}><span style={{ width: 8, height: 8, borderRadius: "50%", background: status.color }} /><span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{status.label}</span><span style={S.badge}>{col.length}</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {col.map(lead => (
                    <div key={lead.id} style={S.card} draggable onDragStart={() => setDragId(lead.id)} onDragEnd={() => setDragId(null)} onClick={() => setSelectedLead(lead)}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{lead.name}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                        {lead.service && <span style={{ fontSize: 11, background: "#1E293B", color: "#94A3B8", padding: "1px 7px", borderRadius: 4 }}>{lead.service}</span>}
                        {lead.amount > 0 && <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600 }}>₪{lead.amount.toLocaleString()}</span>}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#475569" }}>
                        <span>{lead.source}</span>
                        <span>{daysAgo(lead.updated_at)}</span>
                      </div>
                    </div>
                  ))}
                  {col.length === 0 && <div style={{ fontSize: 12, color: "#334155", textAlign: "center", padding: 20 }}>אין לידים</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List */}
      {view === "list" && (
        <div style={{ overflowX: "auto", padding: "8px 0 20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["שם", "טלפון", "שירות", "סטטוס", "מקור", "סכום", "עדכון"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(lead => {
                const s = STATUSES.find(x => x.id === lead.status);
                return (
                  <tr key={lead.id} style={{ cursor: "pointer" }} onClick={() => setSelectedLead(lead)}>
                    <td style={S.td}><strong>{lead.name}</strong></td>
                    <td style={{ ...S.td, direction: "ltr", textAlign: "right" }}>{lead.phone}</td>
                    <td style={S.td}>{lead.service}</td>
                    <td style={S.td}><span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{s.label}</span></td>
                    <td style={S.td}>{lead.source}</td>
                    <td style={S.td}>{lead.amount > 0 ? `₪${lead.amount.toLocaleString()}` : "—"}</td>
                    <td style={S.td}>{daysAgo(lead.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={S.empty}>אין לידים להצגה</div>}
        </div>
      )}

      {/* Tasks */}
      {view === "tasks" && <TasksView tasks={tasks} leads={leads} onToggle={toggleTask} onDelete={deleteTask} />}

      {/* Stats */}
      {view === "stats" && <Stats leads={leads} />}

      {showForm && <LeadForm onSave={addLead} onClose={() => setShowForm(false)} />}
      <Toast {...toast} />
    </div>
  );
}

// ─── Styles ───
const S = {
  app: { direction: "rtl", fontFamily: "'Rubik', 'Segoe UI', sans-serif", background: "#0B1120", color: "#E2E8F0", minHeight: "100vh", maxWidth: 1200, margin: "0 auto", padding: "0 16px" },
  header: { padding: "14px 0 8px", borderBottom: "1px solid #1E293B", marginBottom: 10, position: "sticky", top: 0, background: "#0B1120", zIndex: 10 },
  addBtn: { display: "flex", alignItems: "center", gap: 5, background: "#8B5CF6", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  searchBox: { display: "flex", alignItems: "center", gap: 6, background: "#1E293B", borderRadius: 8, padding: "5px 10px", flex: "1 1 180px", maxWidth: 260, color: "#64748B" },
  searchInp: { background: "transparent", border: "none", outline: "none", color: "#E2E8F0", fontSize: 13, width: "100%", fontFamily: "inherit" },
  tabs: { display: "flex", gap: 2, background: "#1E293B", borderRadius: 8, padding: 2 },
  tabOff: { background: "transparent", border: "none", color: "#64748B", fontSize: 13, padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" },
  tabOn: { background: "#334155", border: "none", color: "#E2E8F0", fontSize: 13, padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" },
  board: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, padding: "8px 0 20px", minHeight: 400 },
  col: { background: "#111827", borderRadius: 10, padding: 8 },
  colHead: { display: "flex", alignItems: "center", gap: 6, padding: "4px 4px 8px", borderBottom: "1px solid #1E293B", marginBottom: 8 },
  badge: { fontSize: 11, color: "#64748B", background: "#1E293B", borderRadius: 10, padding: "0px 7px" },
  card: { background: "#1E293B", borderRadius: 8, padding: "10px 12px", cursor: "pointer", transition: "all 0.15s", border: "1px solid transparent" },
  chip: { background: "#1E293B", padding: "2px 10px", borderRadius: 6, fontSize: 12 },
  th: { textAlign: "right", fontSize: 12, color: "#64748B", fontWeight: 600, padding: "8px 10px", borderBottom: "1px solid #1E293B" },
  td: { padding: "10px", fontSize: 13, borderBottom: "1px solid #111827" },
  detail: { padding: "8px 0 20px" },
  detailTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  detailCard: { background: "#111827", borderRadius: 12, padding: 20 },
  backBtn: { display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: "#8B5CF6", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  section: { marginTop: 16 },
  secTitle: { display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 700, margin: 0 },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100, padding: 16 },
  modal: { background: "#1E293B", borderRadius: 14, padding: 20, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", direction: "rtl" },
  mHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  mTitle: { fontSize: 17, fontWeight: 800, margin: 0 },
  mFoot: { display: "flex", justifyContent: "flex-start", gap: 8, marginTop: 14 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  full: { gridColumn: "1 / -1" },
  lbl: { fontSize: 12, color: "#64748B", fontWeight: 600, display: "block", marginBottom: 3 },
  inp: { background: "#0F172A", border: "1px solid #334155", borderRadius: 8, padding: "7px 10px", fontSize: 13, color: "#E2E8F0", outline: "none", fontFamily: "inherit", direction: "rtl", width: "100%", boxSizing: "border-box" },
  btn1: { background: "#8B5CF6", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  btn2: { background: "#334155", color: "#94A3B8", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  iconBtn: { background: "transparent", border: "none", color: "#64748B", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" },
  empty: { fontSize: 13, color: "#334155", textAlign: "center", padding: 16 },
  statCard: { background: "#111827", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 6 },
  statLbl: { fontSize: 13, color: "#64748B", fontWeight: 500 },
  filterOff: { background: "#1E293B", border: "none", color: "#64748B", fontSize: 12, padding: "4px 10px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  filterOn: { background: "#8B5CF6", border: "none", color: "#fff", fontSize: 12, padding: "4px 10px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" },
};
