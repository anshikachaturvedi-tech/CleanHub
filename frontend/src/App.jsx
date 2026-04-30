import { useCallback, useEffect, useState } from "react";
import {
  createOrder,
  createUser,
  deleteOrder,
  deleteUser,
  getDashboard,
  getGarmentPrices,
  listOrders,
  listUsers,
  updateOrderEta,
  updateOrderStatus,
  updateUser,
} from "./api.js";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AuthPages } from "./AuthPages.jsx";
import { clearSession, getSession } from "./demoAuth.js";

const STATUSES = ["RECEIVED", "PROCESSING", "READY", "DELIVERED"];

const STATUS_META = {
  RECEIVED: { dot: "#60a5fa", label: "Received" },
  PROCESSING: { dot: "#fcd34d", label: "Processing" },
  READY: { dot: "#4ade80", label: "Ready" },
  DELIVERED: { dot: "#94a3b8", label: "Delivered" },
};

const FALLBACK_PRICES = {
  Shirt: 80,
  Pants: 100,
  Saree: 200,
  Suit: 300,
  Dress: 150,
  Jacket: 250,
  "T-Shirt": 60,
};

function toDatetimeLocalValue(d) {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}

function defaultEtaLocalString() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(17, 0, 0, 0);
  return toDatetimeLocalValue(d);
}

const tabs = [
  { id: "dashboard", label: "Dashboard", short: "Home" },
  { id: "create", label: "New order", short: "New" },
  { id: "orders", label: "Orders", short: "List" },
  { id: "users", label: "Users", short: "Users" },
];

function IconDash() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const tabIcons = { dashboard: IconDash, create: IconPlus, orders: IconList, users: IconUsers };

function useDashboard(refreshKey) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(() => {
    setLoading(true);
    setErr(null);
    getDashboard()
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    refetch();
  }, [refetch, refreshKey]);
  return { data, err, loading, refetch };
}

function DashboardPanel({ onNavigate, refreshKey }) {
  const { data, err, loading, refetch } = useDashboard(refreshKey);

  if (loading && !data) {
    return (
      <div className="field-grid cols-3 dashboard-kpi-charts">
        {[1, 2, 3].map((k) => (
          <div key={k} className="dashboard-chart-card">
            <div className="skeleton" style={{ height: 14, width: "45%", marginBottom: 10, borderRadius: 6 }} />
            <div className="dashboard-chart-inner dashboard-chart-inner--kpi skeleton" />
          </div>
        ))}
      </div>
    );
  }

  if (err) {
    return (
      <div className="card">
        <p className="error-banner" style={{ marginTop: 0 }}>
          {err}
        </p>
        <button type="button" className="btn btn-primary" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  const fmtInr = (n) =>
    `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalOrders = Number(data?.totalOrders ?? 0);
  const totalRevenue = Number(data?.totalRevenue ?? 0);
  const deliveredCount = Number(data?.ordersByStatus?.DELIVERED ?? 0);
  const notDeliveredCount = Math.max(0, totalOrders - deliveredCount);
  const revenueBarMax = Math.max(1, totalRevenue * 1.08);
  const ordersBarMax = Math.max(1, Math.ceil(totalOrders * 1.15) || 1);

  const pipelinePieSlices = [];
  if (totalOrders > 0) {
    if (deliveredCount > 0) {
      pipelinePieSlices.push({ name: "Delivered", value: deliveredCount, fill: "#94a3b8" });
    }
    if (notDeliveredCount > 0) {
      pipelinePieSlices.push({ name: "Not delivered", value: notDeliveredCount, fill: "#fcd34d" });
    }
  }

  const revenueBarData = [{ label: "Total revenue", value: totalRevenue }];
  const ordersBarData = [{ label: "All orders", value: totalOrders }];

  const ordersByStatusChartData = STATUSES.map((s) => ({
    name: STATUS_META[s]?.label ?? s,
    count: data?.ordersByStatus?.[s] ?? 0,
  }));
  const ordersByStatusYMax = Math.max(1, ...ordersByStatusChartData.map((d) => d.count));

  return (
    <>
      <div className="field-grid cols-3 dashboard-kpi-charts">
        <div className="dashboard-chart-card">
          <p className="dashboard-chart-title">Total revenue</p>
          <div className="dashboard-chart-inner dashboard-chart-inner--kpi">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueBarData} margin={{ top: 24, right: 12, left: 4, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#9aa4b8", fontSize: 11 }} />
                <YAxis domain={[0, revenueBarMax]} tick={{ fill: "#9aa4b8", fontSize: 10 }} width={44} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : String(v))} />
                <Tooltip formatter={(v) => fmtInr(v)} contentStyle={{ background: "#181c27", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f1f4f9" }} />
                <Bar dataKey="value" fill="#5eead4" radius={[8, 8, 0, 0]} name="Revenue" isAnimationActive={false}>
                  <LabelList dataKey="value" position="top" formatter={(v) => fmtInr(v)} fill="#f1f4f9" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="dashboard-chart-card">
          <p className="dashboard-chart-title">Order count</p>
          <div className="dashboard-chart-inner dashboard-chart-inner--kpi">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersBarData} margin={{ top: 24, right: 12, left: 4, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#9aa4b8", fontSize: 11 }} />
                <YAxis allowDecimals={false} domain={[0, ordersBarMax]} tick={{ fill: "#9aa4b8", fontSize: 11 }} width={28} />
                <Tooltip formatter={(v) => [`${v} orders`, "Count"]} contentStyle={{ background: "#181c27", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f1f4f9" }} />
                <Bar dataKey="value" fill="#a78bfa" radius={[8, 8, 0, 0]} name="Orders" isAnimationActive={false}>
                  <LabelList dataKey="value" position="top" fill="#f1f4f9" fontSize={13} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="dashboard-chart-card">
          <p className="dashboard-chart-title">Pipeline</p>
          <p className="dashboard-chart-kpi muted" style={{ marginTop: "-0.25rem" }}>
            Delivered <strong style={{ color: "var(--text)" }}>{deliveredCount}</strong> · Not delivered{" "}
            <strong style={{ color: "var(--text)" }}>{notDeliveredCount}</strong>
          </p>
          <div className="dashboard-chart-inner dashboard-chart-inner--kpi dashboard-pie-wrap">
            {pipelinePieSlices.length === 0 ? (
              <p className="muted dashboard-pie-empty">No orders yet — pie appears when there is at least one order.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 4, bottom: 0, left: 4 }}>
                  <Pie
                    data={pipelinePieSlices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={72}
                    paddingAngle={2}
                    labelLine={false}
                    label={({ percent }) => `${Math.round(percent * 100)}%`}
                    isAnimationActive={false}
                  >
                    {pipelinePieSlices.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#181c27", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f1f4f9" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="bottom" height={22} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-charts-grid">
        <div className="dashboard-chart-card dashboard-chart-card--wide">
          <p className="dashboard-chart-title">Orders by status</p>
          <p className="dashboard-chart-kpi muted" style={{ marginTop: "-0.35rem", marginBottom: "0.35rem" }}>
            Count of orders in each stage (Received, Processing, Ready, Delivered).
          </p>
          <div className="dashboard-chart-inner dashboard-chart-inner--orders">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ordersByStatusChartData} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#9aa4b8", fontSize: 11 }} interval={0} angle={-10} textAnchor="end" height={54} />
                <YAxis
                  allowDecimals={false}
                  domain={[0, ordersByStatusYMax]}
                  tick={{ fill: "#9aa4b8", fontSize: 11 }}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: "#181c27",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#f1f4f9",
                  }}
                />
                <Bar dataKey="count" fill="#5eead4" radius={[6, 6, 0, 0]} name="Orders" isAnimationActive={false} minPointSize={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <p className="muted" style={{ margin: 0 }}>
          Charts refresh with the dashboard. Open orders to change status or delivery date.
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => onNavigate("orders")}>
          Open orders →
        </button>
      </div>
    </>
  );
}

function emptyLine(prices) {
  const first = Object.keys(prices || {})[0] || "Shirt";
  return { garmentType: first, quantity: 1, pricePerItem: prices?.[first] ?? 80 };
}

function CreateOrderForm({ onCreated, prices }) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [lines, setLines] = useState([emptyLine(prices)]);
  const [estimatedDeliveryDate, setEstimated] = useState(() => defaultEtaLocalString());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (prices && Object.keys(prices).length) {
      setLines((L) => L.map((l) => ({ ...l, pricePerItem: prices[l.garmentType] ?? l.pricePerItem })));
    }
  }, [prices]);

  const addLine = () => setLines((L) => [...L, emptyLine(prices)]);

  const setLine = (i, field, v) => {
    setLines((L) => {
      const n = [...L];
      n[i] = { ...n[i], [field]: v };
      if (field === "garmentType" && prices && prices[v] != null) {
        n[i].pricePerItem = prices[v];
      }
      return n;
    });
  };

  const removeLine = (i) => {
    setLines((L) => (L.length <= 1 ? L : L.filter((_, j) => j !== i)));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setResult(null);
    setSaving(true);
    try {
      const body = {
        customerName: customerName.trim(),
        phone: phone.trim(),
        items: lines.map((l) => ({
          garmentType: l.garmentType,
          quantity: Number(l.quantity),
          pricePerItem: Number(l.pricePerItem),
        })),
      };
      const etaStr = (estimatedDeliveryDate || "").trim() || defaultEtaLocalString();
      body.estimatedDeliveryDate = new Date(etaStr).toISOString();
      const out = await createOrder(body);
      setResult(out);
      setCustomerName("");
      setPhone("");
      setLines([emptyLine(prices)]);
      setEstimated(defaultEtaLocalString());
      onCreated();
    } catch (er) {
      setErr(er.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card create-order-form" onSubmit={onSubmit}>
      {result && (
        <div className="alert-success">
          <strong>Order placed.</strong> ID <code style={{ opacity: 0.95 }}>{result.orderId}</code> — total{" "}
          <strong>₹{Number(result.totalBillAmount).toFixed(2)}</strong>
        </div>
      )}

      <div className="create-form-section">
        <p className="section-label">Customer</p>
        <div className="field-grid cols-2">
          <div>
            <label className="field-label" htmlFor="cname">
              Full name
            </label>
            <input
              id="cname"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              autoComplete="name"
              placeholder="e.g. Ananya Iyer"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="phone">
              Phone
            </label>
            <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" placeholder="+91 …" />
          </div>
        </div>

        <div className="field-grid cols-2 create-form-eta-row">
          <div>
            <label className="field-label" htmlFor="est">
              Estimated delivery
            </label>
            <input id="est" type="datetime-local" value={estimatedDeliveryDate} onChange={(e) => setEstimated(e.target.value)} />
            <p className="field-hint">Defaults to three days from today at 17:00; change anytime before submit.</p>
          </div>
        </div>
      </div>

      <div className="create-form-section create-form-section--lines">
        <p className="section-label">Line items</p>
        {lines.map((line, i) => (
          <div className="line-card" key={i}>
            <div className="line-card-field line-card-field--garment">
              <label className="field-label">Garment</label>
              <select className="wide" value={line.garmentType} onChange={(e) => setLine(i, "garmentType", e.target.value)}>
                {Object.keys(prices || {}).map((g) => (
                  <option key={g} value={g}>
                    {g} — ₹{prices[g]}
                  </option>
                ))}
                {line.garmentType && !prices?.[line.garmentType] && (
                  <option value={line.garmentType}>{line.garmentType} (custom)</option>
                )}
              </select>
            </div>
            <div className="line-card-field line-card-field--qty">
              <label className="field-label">Qty</label>
              <input type="number" min={1} step={1} value={line.quantity} onChange={(e) => setLine(i, "quantity", e.target.value)} />
            </div>
            <div className="line-card-field line-card-field--price">
              <label className="field-label">₹ / item</label>
              <input type="number" min={0} step={0.01} value={line.pricePerItem} onChange={(e) => setLine(i, "pricePerItem", e.target.value)} />
            </div>
            <div className="line-card-actions">
              <button type="button" className="btn btn-line-remove" onClick={() => removeLine(i)} disabled={lines.length <= 1}>
                Remove
              </button>
            </div>
          </div>
        ))}

        <button type="button" className="btn btn-add-line" onClick={addLine}>
          + Add line
        </button>
      </div>

      <div className="create-form-footer">
        {err && <div className="error-banner">{err}</div>}
        <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create order & total bill"}
        </button>
      </div>
    </form>
  );
}

function statusClass(s) {
  return s.toLowerCase();
}

function OrdersList({ isAdmin, onOrdersMutated }) {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [garment, setGarment] = useState("");
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [draftStatus, setDraftStatus] = useState("");
  const [editingEta, setEditingEta] = useState(null);
  const [etaDraft, setEtaDraft] = useState("");

  const startStatusEdit = (o) => {
    setDraftStatus(o.status);
    setEditing(o.id);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const d = await listOrders({
        status: status || undefined,
        q: q || undefined,
        garment: garment || undefined,
      });
      setOrders(d.orders || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [status, q, garment]);

  useEffect(() => {
    void load();
  }, [load]);

  const onStatusChange = async (id, s) => {
    setErr(null);
    try {
      await updateOrderStatus(id, s);
      await load();
      setEditing(null);
      setDraftStatus("");
      onOrdersMutated?.();
    } catch (e) {
      setErr(e.message);
      const row = orders.find((x) => String(x.id) === String(id));
      if (row) setDraftStatus(row.status);
    }
  };

  const onDeleteOrder = async (o) => {
    if (!isAdmin) return;
    if (!window.confirm(`Delete order ${o.id.slice(0, 8)}… for ${o.customerName}?`)) return;
    setErr(null);
    try {
      await deleteOrder(o.id);
      await load();
      onOrdersMutated?.();
    } catch (e) {
      setErr(e.message);
    }
  };

  const startEtaEdit = (o) => {
    setEditingEta(o.id);
    setEtaDraft(o.estimatedDeliveryDate ? toDatetimeLocalValue(new Date(o.estimatedDeliveryDate)) : defaultEtaLocalString());
  };

  const saveEta = async (id) => {
    setErr(null);
    try {
      const iso = etaDraft.trim() ? new Date(etaDraft).toISOString() : null;
      if (etaDraft.trim() && Number.isNaN(new Date(etaDraft).getTime())) {
        setErr("Invalid delivery date");
        return;
      }
      await updateOrderEta(id, iso);
      setEditingEta(null);
      await load();
      onOrdersMutated?.();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div>
      <div className="card filters-bar">
        <div>
          <label className="field-label">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s]?.label ?? s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Customer / phone</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone…" />
        </div>
        <div>
          <label className="field-label">Garment</label>
          <input value={garment} onChange={(e) => setGarment(e.target.value)} placeholder="Shirt, Saree…" />
        </div>
        <div>
          <label className="field-label" style={{ opacity: 0 }}>
            Action
          </label>
          <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={load} disabled={loading}>
            {loading ? "…" : "Apply"}
          </button>
        </div>
      </div>

      {err && <div className="error-banner" style={{ marginBottom: "1rem" }}>{err}</div>}

      {loading && !orders.length ? (
        <div className="orders-grid">
          {[1, 2, 3].map((k) => (
            <div key={k} className="order-card skeleton" style={{ minHeight: 200 }} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p style={{ margin: 0, fontWeight: 600 }}>No orders here</p>
          <p className="muted" style={{ margin: "0.5rem 0 0", maxWidth: 32 * 8 }}>
            Adjust filters or create a new order from the New tab.
          </p>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map((o) => (
            <article key={o.id} className="order-card">
              <div className="order-card-top">
                <div>
                  <div className="order-id">{o.id.slice(0, 8)}…</div>
                  <div className="order-customer">{o.customerName}</div>
                  <div className="order-phone">{o.phone}</div>
                </div>
                <div>
                  {editing === o.id ? (
                    <select
                      className="badge-select"
                      value={draftStatus}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftStatus(v);
                        void onStatusChange(o.id, v);
                      }}
                      autoFocus
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button type="button" className={`badge ${statusClass(o.status)}`} onClick={() => startStatusEdit(o)}>
                      {STATUS_META[o.status]?.label ?? o.status}
                    </button>
                  )}
                </div>
              </div>
              <div className="order-lines">
                {(o.lines || []).map((L) => (
                  <span key={L.id} className="garment-tag">
                    {L.garmentType} ×{L.quantity} @ ₹{L.pricePerItem}
                  </span>
                ))}
              </div>
              <div className="order-meta">
                {editingEta === o.id ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", flex: 1 }}>
                    <input type="datetime-local" value={etaDraft} onChange={(e) => setEtaDraft(e.target.value)} style={{ maxWidth: "100%" }} />
                    <button type="button" className="btn btn-primary" style={{ padding: "0.35rem 0.75rem" }} onClick={() => saveEta(o.id)}>
                      Save ETA
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ padding: "0.35rem 0.75rem" }} onClick={() => setEditingEta(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <span>
                    {o.estimatedDeliveryDate
                      ? new Date(o.estimatedDeliveryDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                      : "No ETA"}
                  </span>
                )}
                <span className="order-total">₹{Number(o.totalAmount).toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
                <button type="button" className="link-btn" onClick={() => startEtaEdit(o)}>
                  Change delivery date
                </button>
                <button type="button" className="link-btn" onClick={() => startStatusEdit(o)}>
                  Change status
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="link-btn"
                    style={{ color: "var(--danger)" }}
                    onClick={() => onDeleteOrder(o)}
                  >
                    Delete order
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const pageCopy = {
  dashboard: { title: "Overview", sub: "" },
  create: { title: "New order", sub: "Capture customer details, garments, and pricing." },
  orders: {
    title: "Orders",
    sub: "Edit delivery dates anytime. Status is always what you save in the database — use the badge or Change status to move orders through the pipeline.",
  },
  users: { title: "Users", sub: "Admin only — create, edit, or remove accounts in MySQL." },
};

function emptyUserForm() {
  return { username: "", password: "", displayName: "", email: "", phone: "" };
}

function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState(emptyUserForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    listUsers()
      .then((d) => setUsers(d.users || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async (e) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      await createUser({
        username: newUser.username.trim(),
        password: newUser.password,
        displayName: newUser.displayName.trim() || undefined,
        email: newUser.email.trim() || undefined,
        phone: newUser.phone.trim() || undefined,
      });
      setNewUser(emptyUserForm());
      setShowAdd(false);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditForm({
      username: u.username,
      displayName: u.displayName || "",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role,
      password: "",
    });
    setErr(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const onSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingId || !editForm) return;
    setErr(null);
    setSaving(true);
    try {
      const body = {
        username: editForm.username.trim(),
        displayName: editForm.displayName.trim() || null,
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        role: editForm.role,
      };
      if (editForm.password && editForm.password.length > 0) {
        body.password = editForm.password;
      }
      await updateUser(editingId, body);
      cancelEdit();
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (u) => {
    if (u.username === "admin") return;
    if (!window.confirm(`Delete user “${u.username}”? This cannot be undone.`)) return;
    setErr(null);
    try {
      await deleteUser(u.id);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <p className="muted" style={{ margin: 0, flex: 1, minWidth: 200 }}>
            Passwords are never shown again after save (only bcrypt hashes in DB). You cannot delete the seeded <strong>admin</strong> user.
          </p>
          <button type="button" className={`btn ${showAdd ? "btn-ghost" : "btn-primary"}`} onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Cancel" : "+ Add user"}
          </button>
        </div>
      </div>

      {showAdd && (
        <form className="card" onSubmit={onCreate} style={{ marginBottom: "1rem" }}>
          <p className="section-label">New user</p>
          <div className="field-grid cols-2">
            <div>
              <label className="field-label">Username *</label>
              <input value={newUser.username} onChange={(e) => setNewUser((n) => ({ ...n, username: e.target.value }))} required minLength={3} />
            </div>
            <div>
              <label className="field-label">Password *</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((n) => ({ ...n, password: e.target.value }))}
                required
                minLength={4}
              />
            </div>
            <div>
              <label className="field-label">Display name</label>
              <input value={newUser.displayName} onChange={(e) => setNewUser((n) => ({ ...n, displayName: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input type="email" value={newUser.email} onChange={(e) => setNewUser((n) => ({ ...n, email: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input value={newUser.phone} onChange={(e) => setNewUser((n) => ({ ...n, phone: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Create user"}
          </button>
        </form>
      )}

      {err && <div className="error-banner" style={{ marginBottom: "1rem" }}>{err}</div>}

      {loading ? (
        <div className="orders-grid">
          {[1, 2, 3].map((k) => (
            <div key={k} className="order-card skeleton" style={{ minHeight: 140 }} />
          ))}
        </div>
      ) : (
        <div className="orders-grid">
          {users.map((u) => (
            <div key={u.id} className="order-card">
              {editingId === u.id && editForm ? (
                <form onSubmit={onSaveEdit}>
                  <p className="section-label" style={{ fontSize: "0.85rem" }}>
                    Edit user
                  </p>
                  <div className="field-grid" style={{ marginBottom: "0.75rem" }}>
                    <div>
                      <label className="field-label">Username</label>
                      <input value={editForm.username} onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="field-label">New password (optional)</label>
                      <input
                        type="password"
                        value={editForm.password}
                        onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                        placeholder="Leave blank to keep"
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <label className="field-label">Display name</label>
                      <input value={editForm.displayName} onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))} />
                    </div>
                    <div>
                      <label className="field-label">Email</label>
                      <input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="field-label">Phone</label>
                      <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div>
                      <label className="field-label">Role</label>
                      <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      Save
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="order-card-top">
                    <div>
                      <div className="order-customer">{u.username}</div>
                      <div className="order-phone">{u.displayName || "—"}</div>
                      <div className="order-id" style={{ marginTop: "0.35rem" }}>
                        {u.email || "—"} · {u.phone || "—"}
                      </div>
                    </div>
                    <span className={`badge ${u.role === "admin" ? "processing" : "delivered"}`} style={{ cursor: "default" }}>
                      {u.role}
                    </span>
                  </div>
                  <div className="order-meta" style={{ borderTop: "none", paddingTop: 0 }}>
                    <span className="muted" style={{ fontSize: "0.75rem" }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button type="button" className="btn btn-ghost" style={{ padding: "0.35rem 0.65rem" }} onClick={() => startEdit(u)}>
                        Edit
                      </button>
                      {u.username !== "admin" && (
                        <button type="button" className="btn btn-ghost" style={{ padding: "0.35rem 0.65rem", color: "var(--danger)" }} onClick={() => onDelete(u)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => getSession());
  const [tab, setTab] = useState("dashboard");
  const [orderTick, setOrderTick] = useState(0);
  const [prices, setPrices] = useState(() => ({ ...FALLBACK_PRICES }));

  const isAdmin = session?.role === "admin";

  useEffect(() => {
    getGarmentPrices()
      .then((d) => setPrices({ ...FALLBACK_PRICES, ...d.prices }))
      .catch(() => setPrices({ ...FALLBACK_PRICES }));
  }, []);

  useEffect(() => {
    if (!session) return;
    if (!isAdmin && tab === "users") setTab("dashboard");
  }, [session, isAdmin, tab]);

  const onCreated = () => {
    setOrderTick((n) => n + 1);
  };

  const onOrdersMutated = () => {
    setOrderTick((n) => n + 1);
  };

  const onAuthed = () => setSession(getSession());

  const onLogout = () => {
    clearSession();
    setSession(null);
    setTab("dashboard");
  };

  if (!session) {
    return <AuthPages onAuthed={onAuthed} />;
  }

  const visibleTabs = isAdmin ? tabs : tabs.filter((t) => t.id !== "users");

  const { title, sub } = pageCopy[tab] ?? pageCopy.dashboard;

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark" aria-hidden>
            🧺
          </div>
          <div className="brand-text">
            <span className="brand-name">CleanHub</span>
            <span className="brand-tag">Order desk</span>
          </div>
        </div>
        <nav className="nav-rail">
          {visibleTabs.map((t) => {
            const Icon = tabIcons[t.id];
            return (
              <button key={t.id} type="button" className={`nav-item ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                <Icon />
                {t.label}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="muted" style={{ fontSize: "0.78rem", marginBottom: "0.35rem" }}>
            Signed in as <strong style={{ color: "var(--text)" }}>{session.user}</strong>
            {session.role === "admin" && <span className="badge-admin">Admin</span>}
          </div>
          <div className="sidebar-logout">
            <button type="button" className="btn btn-ghost" onClick={onLogout}>
              Log out
            </button>
          </div>
          <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", opacity: 0.85 }}>Dry cleaning · demo auth</div>
        </div>
      </aside>

      <div className="app-main">
        <div className="main-scroll">
          <div className="user-bar">
            <span className="user-bar-meta">
              Signed in as <strong>{session.user}</strong>
              {session.role === "admin" && <span className="badge-admin">Admin</span>}
            </span>
            <button type="button" className="btn btn-ghost" onClick={onLogout}>
              Log out
            </button>
          </div>
          <header className="page-header">
            <h1 className="page-title">{title}</h1>
            {sub ? <p className="page-sub">{sub}</p> : null}
          </header>
          {tab === "dashboard" && <DashboardPanel onNavigate={setTab} refreshKey={orderTick} />}
          {tab === "create" && <CreateOrderForm prices={prices} onCreated={onCreated} />}
          {tab === "orders" && <OrdersList isAdmin={isAdmin} onOrdersMutated={onOrdersMutated} />}
          {tab === "users" && isAdmin && <UsersPanel />}
        </div>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {visibleTabs.map((t) => {
          const Icon = tabIcons[t.id];
          return (
            <button key={t.id} type="button" className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
              <Icon />
              {t.short}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
