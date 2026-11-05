"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { demoDashboard, demoProducts, demoSales } from "@/lib/demo-data";
import { posApi } from "@/lib/api";
import { CartItem, DashboardSnapshot, PaymentMethod, Product, Sale, View } from "@/lib/types";
import TeamModal from "@/components/team-modal";

type IconName = "dashboard" | "cart" | "products" | "inventory" | "sales" | "search" | "bell" | "plus" | "arrow" | "box" | "receipt" | "settings" | "close" | "chevron";

const navItems: Array<{ view: View; label: string; href: string; icon: IconName }> = [
  { view: "dashboard", label: "Overview", href: "/", icon: "dashboard" },
  { view: "pos", label: "Point of sale", href: "/pos", icon: "cart" },
  { view: "products", label: "Products", href: "/products", icon: "products" },
  { view: "inventory", label: "Inventory", href: "/inventory", icon: "inventory" },
  { view: "sales", label: "Sales history", href: "/sales", icon: "sales" }
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function formatMoney(value: number) {
  return money.format(value);
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, string> = {
    dashboard: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    cart: "M3 4h2l1.5 10.5h11L20 7H7M9 19.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
    products: "M4 6.5 12 3l8 3.5v11L12 21l-8-3.5v-11ZM4 6.5l8 4 8-4M12 10.5V21",
    inventory: "M5 5h14v14H5zM8 9h8M8 13h5M8 17h3",
    sales: "M5 20V10M12 20V4M19 20v-7",
    search: "m20 20-4.4-4.4m2-5.1a7.1 7.1 0 1 1-14.2 0 7.1 7.1 0 0 1 14.2 0Z",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4",
    plus: "M12 5v14M5 12h14",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    box: "m4 7 8-4 8 4v10l-8 4-8-4V7Zm0 0 8 4 8-4M12 11v10",
    receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h4",
    settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5a7.5 7.5 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L15 3.5h-4L10.4 6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2.1l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.6 2.5h4l.6-2.5a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z",
    close: "M6 6l12 12M18 6 6 18",
    chevron: "m7 10 5 5 5-5"
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function statusLabel(status: Product["status"]) {
  if (status === "low") return "Low stock";
  if (status === "archived") return "Archived";
  return "In stock";
}

function normalizeProduct(raw: Product & { stock_quantity?: number; reorder_level?: number; is_archived?: boolean }): Product {
  const stockQuantity = raw.stockQuantity ?? raw.stock_quantity ?? 0;
  const reorderLevel = raw.reorderLevel ?? raw.reorder_level ?? 5;
  const archived = raw.isArchived ?? raw.is_archived ?? false;
  return { ...raw, stockQuantity, reorderLevel, isArchived: archived, status: archived ? "archived" : stockQuantity <= reorderLevel ? "low" : "healthy" };
}

function normalizeSale(raw: Sale & { receipt_number?: string; payment_method?: PaymentMethod; created_at?: string; item_count?: number }): Sale {
  return { ...raw, receiptNumber: raw.receiptNumber ?? raw.receipt_number ?? "NF-DEMO", paymentMethod: raw.paymentMethod ?? raw.payment_method ?? "card", createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(), itemCount: raw.itemCount ?? raw.item_count ?? 1 };
}

export default function PosShell({ initialView }: { initialView: View }) {
  const router = useRouter();
  const [view, setView] = useState<View>(initialView);
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [sales, setSales] = useState<Sale[]>(demoSales);
  const [dashboard, setDashboard] = useState<DashboardSnapshot>(demoDashboard);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [modal, setModal] = useState<"product" | "adjustment" | "receipt" | "settings" | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [lastReceipt, setLastReceipt] = useState<Sale | null>(null);
  const [toast, setToast] = useState("");
  const [apiOffline, setApiOffline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState<{ name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    const cached = window.sessionStorage.getItem("posflow_user");
    posApi.me().then(({ user }) => {
      setAuthUser(user);
      window.sessionStorage.setItem("posflow_user", JSON.stringify(user));
    }).catch((reason) => {
      if (reason instanceof Error && reason.message === "Not authenticated") {
        window.sessionStorage.removeItem("posflow_user");
        setAuthUser(null);
      } else if (cached) {
        try { setAuthUser(JSON.parse(cached)); } catch { setAuthUser(null); }
      } else {
        setAuthUser(null);
      }
    }).finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authUser) return;
    let active = true;
    Promise.all([posApi.products(), posApi.sales(), posApi.dashboard()]).then(([productPayload, salePayload, dashboardPayload]) => {
      if (!active) return;
      if (productPayload.products?.length) setProducts(productPayload.products.map(normalizeProduct));
      if (salePayload.sales?.length) setSales(salePayload.sales.map(normalizeSale));
      if (dashboardPayload) setDashboard(dashboardPayload);
    }).catch(() => setApiOffline(true));
    return () => { active = false; };
  }, [authUser]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((product) => product.category)))], [products]);
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesQuery = `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "All" || product.category === category;
    return matchesQuery && matchesCategory && !product.isArchived;
  }), [products, query, category]);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const appliedDiscount = Math.min(Math.max(discount, 0), subtotal);
  const tax = (subtotal - appliedDiscount) * 0.08;
  const total = subtotal - appliedDiscount + tax;

  const navigate = (nextView: View, href: string) => {
    setView(nextView);
    setQuery("");
    setCategory("All");
    router.push(href);
  };

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stockQuantity) } : item);
      return [...current, { ...product, quantity: 1 }];
    });
    setToast(`${product.name} added to the cart`);
  };

  const updateCartQuantity = (productId: number, delta: number) => {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== productId) return [item];
      const quantity = item.quantity + delta;
      return quantity > 0 ? [{ ...item, quantity: Math.min(quantity, item.stockQuantity) }] : [];
    }));
  };

  const checkout = async () => {
    if (!cart.length) return;
    setSaving(true);
    let completedSale: Sale = {
      id: Date.now(), receiptNumber: `NF-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
      cashier: "Alex Rivera", subtotal, discount: appliedDiscount, tax, total, paymentMethod,
      createdAt: new Date().toISOString(), itemCount: cart.reduce((count, item) => count + item.quantity, 0),
      items: cart.map((item) => ({ productId: item.id, productName: item.name, quantity: item.quantity, unitPrice: item.price, lineTotal: item.price * item.quantity }))
    };
    let persisted = false;
    try {
      const result = await posApi.createSale(cart, appliedDiscount, paymentMethod);
      if (result.sale) {
        completedSale = normalizeSale(result.sale);
        persisted = true;
      }
    } catch {
      setApiOffline(true);
    }
    setSales((current) => [completedSale, ...current]);
    setProducts((current) => current.map((product) => {
      const item = cart.find((cartItem) => cartItem.id === product.id);
      if (!item) return product;
      const stockQuantity = Math.max(product.stockQuantity - item.quantity, 0);
      return { ...product, stockQuantity, status: stockQuantity <= product.reorderLevel ? "low" : "healthy" };
    }));
    setDashboard((current) => ({ ...current, salesToday: current.salesToday + completedSale.total, ordersToday: current.ordersToday + 1, recentSales: [completedSale, ...current.recentSales].slice(0, 4) }));
    setCart([]);
    setDiscount(0);
    setLastReceipt(completedSale);
    setModal("receipt");
    setSaving(false);
    setToast(persisted ? "Sale saved — inventory updated" : "Demo sale completed locally — connect the API to persist it");
  };

  const archiveProduct = async (product: Product) => {
    setSaving(true);
    let persisted = false;
    try {
      if (!apiOffline) {
        const result = await posApi.updateProduct(product.id, { isArchived: true });
        setProducts((current) => current.map((item) => item.id === product.id ? result.product : item));
        persisted = true;
      }
    } catch {
      setApiOffline(true);
    }
    if (!persisted) setProducts((current) => current.map((item) => item.id === product.id ? { ...item, isArchived: true, status: "archived" } : item));
    setSaving(false);
    setToast(persisted ? `${product.name} archived` : `${product.name} archived in demo mode`);
  };

  const renderHeader = () => {
    const title = navItems.find((item) => item.view === view)?.label ?? "Overview";
    const subtitle = view === "dashboard" ? "Tuesday, November 5, 2026" : view === "pos" ? "Register 01 · Main floor" : "Northstar Market · Main store";
    return <header className="topbar"><div><div className="eyebrow">{subtitle}</div><h1>{title}</h1></div><div className="topbar-actions"><button className="icon-button" aria-label="Notifications" onClick={() => setToast(apiOffline ? "Demo mode: no live notifications" : "You are all caught up")}><Icon name="bell" /><span className="notification-dot" /></button><button className="user-chip" onClick={() => posApi.logout().finally(() => { window.sessionStorage.removeItem("posflow_user"); setAuthUser(null); })}><div className="avatar">{(authUser?.name ?? "U").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div><div><strong>{authUser?.name ?? "User"}</strong><span>{authUser?.role ?? "Staff"}</span></div><span className="sign-out-label">Sign out</span></button></div></header>;
  };

  const renderDashboard = () => {
    const chart = [42, 61, 48, 72, 57, 86, 68, 94, 78, 66, 88, 74];
    return <div className="view-stack"><section className="welcome-row"><div><p className="eyebrow accent">STORE PULSE <span className="live-dot" /> LIVE</p><h2>Keep the line moving.</h2><p className="muted">Three products need attention before the afternoon rush.</p></div><button className="primary-button" onClick={() => navigate("pos", "/pos")}><Icon name="cart" size={16} /> Open register <Icon name="arrow" size={16} /></button></section>
      <section className="kpi-grid"><article className="kpi-card feature"><div className="kpi-label">Sales today <span className="trend up">+12.8%</span></div><strong>{formatMoney(dashboard.salesToday)}</strong><div className="sparkline"><span style={{ height: "30%" }} /><span style={{ height: "47%" }} /><span style={{ height: "40%" }} /><span style={{ height: "62%" }} /><span style={{ height: "56%" }} /><span style={{ height: "82%" }} /><span style={{ height: "74%" }} /><span style={{ height: "100%" }} /></div><small>vs. {formatMoney(745.2)} yesterday</small></article><article className="kpi-card"><div className="kpi-icon teal"><Icon name="receipt" /></div><div className="kpi-label">Orders today <span className="trend up">+8.1%</span></div><strong>{dashboard.ordersToday}</strong><small>Average ticket {formatMoney(dashboard.salesToday / Math.max(dashboard.ordersToday, 1))}</small></article><article className="kpi-card"><div className="kpi-icon sand"><Icon name="box" /></div><div className="kpi-label">Items in stock <span className="trend neutral">Across 8 SKUs</span></div><strong>{products.reduce((sum, product) => sum + product.stockQuantity, 0)}</strong><small><span className="warning-text">{products.filter((product) => product.status === "low").length} low stock</span> need attention</small></article><article className="kpi-card"><div className="kpi-icon ink"><Icon name="sales" /></div><div className="kpi-label">Gross margin <span className="trend up">+2.4%</span></div><strong>34.6%</strong><small>Healthy for this week</small></article></section>
      <section className="dashboard-grid"><article className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">REVENUE FLOW</p><h3>Sales this week</h3></div><button className="select-button">This week <Icon name="chevron" size={14} /></button></div><div className="chart-total">{formatMoney(4258.4)} <span className="trend up">+18.2%</span></div><div className="chart"><div className="chart-y"><span>$1k</span><span>$750</span><span>$500</span><span>$250</span><span>$0</span></div><div className="bars">{chart.map((height, index) => <div className="bar-wrap" key={index}><div className={`bar ${index === 7 ? "active" : ""}`} style={{ height: `${height}%` }}><span>{index === 7 ? "$620" : ""}</span></div><small>{["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F"][index]}</small></div>)}</div></div></article><article className="panel quick-panel"><div className="panel-heading"><div><p className="eyebrow">QUICK ACTIONS</p><h3>Make a move</h3></div></div><button className="quick-action" onClick={() => navigate("pos", "/pos")}><span className="quick-icon teal"><Icon name="cart" /></span><span><strong>Start a sale</strong><small>Open a fresh register ticket</small></span><Icon name="arrow" size={16} /></button><button className="quick-action" onClick={() => { setActiveProduct(null); setModal("product"); }}><span className="quick-icon sand"><Icon name="plus" /></span><span><strong>Add a product</strong><small>Create a new catalog item</small></span><Icon name="arrow" size={16} /></button><button className="quick-action" onClick={() => navigate("inventory", "/inventory")}><span className="quick-icon rose"><Icon name="box" /></span><span><strong>Review stock</strong><small>Check low-stock items</small></span><Icon name="arrow" size={16} /></button></article></section>
      <section className="split-grid"><article className="panel"><div className="panel-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h3>Latest sales</h3></div><button className="text-button" onClick={() => navigate("sales", "/sales")}>View all <Icon name="arrow" size={14} /></button></div><SalesTable sales={dashboard.recentSales} compact onSelect={(sale) => { setLastReceipt(sale); setModal("receipt"); }} /></article><article className="panel"><div className="panel-heading"><div><p className="eyebrow">STOCK WATCH</p><h3>Needs a look</h3></div><button className="text-button" onClick={() => navigate("inventory", "/inventory")}>Inventory <Icon name="arrow" size={14} /></button></div><div className="stock-list">{products.filter((product) => product.status === "low").slice(0, 4).map((product) => <button className="stock-row" key={product.id} onClick={() => navigate("inventory", "/inventory")}><span className="product-mark">{product.name.slice(0, 1)}</span><span className="stock-name"><strong>{product.name}</strong><small>{product.sku} · {product.category}</small></span><span className="stock-count"><strong>{product.stockQuantity}</strong><small>of {product.reorderLevel} min</small></span></button>)}</div></article></section>
    </div>;
  };

  const renderPos = () => <div className="pos-layout"><section className="pos-catalog"><div className="section-toolbar"><div><p className="eyebrow">REGISTER 01</p><h2>Build the ticket</h2></div><div className="toolbar-actions"><label className="search-box"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or scan SKU" /></label></div></div><div className="category-tabs">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="pos-product-grid">{filteredProducts.map((product) => <button className="pos-product-card" key={product.id} onClick={() => addToCart(product)} disabled={product.stockQuantity === 0}><span className="product-art"><span>{product.name.slice(0, 1)}</span><em>{product.category.slice(0, 3).toUpperCase()}</em></span><span className="pos-product-meta"><strong>{product.name}</strong><small>{product.sku}</small><span><b>{formatMoney(product.price)}</b><i className={product.status === "low" ? "warning-text" : "stock-ok"}>{product.stockQuantity} left</i></span></span></button>)}</div></section><aside className="cart-panel"><div className="cart-header"><div><p className="eyebrow">CURRENT TICKET</p><h3>New sale <span className="ticket-id">#1049</span></h3></div><button className="icon-button small" onClick={() => setCart([])} aria-label="Clear cart"><Icon name="close" size={16} /></button></div>{cart.length ? <div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><span className="cart-item-mark">{item.name.slice(0, 1)}</span><div className="cart-item-info"><strong>{item.name}</strong><small>{formatMoney(item.price)} each</small></div><div className="quantity-control"><button onClick={() => updateCartQuantity(item.id, -1)}>-</button><span>{item.quantity}</span><button onClick={() => updateCartQuantity(item.id, 1)}>+</button></div><strong className="line-total">{formatMoney(item.price * item.quantity)}</strong></div>)}</div> : <div className="empty-cart"><span className="empty-cart-icon"><Icon name="cart" size={26} /></span><strong>Your ticket is ready</strong><p>Add products from the catalog to get started.</p></div>}<div className="cart-footer"><div className="summary-line"><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div><div className="summary-line discount-line"><span>Discount <button onClick={() => setDiscount(discount ? 0 : 5)}>{discount ? "Remove" : "Add"}</button></span><strong>-{formatMoney(appliedDiscount)}</strong></div><div className="summary-line"><span>Tax <small>8%</small></span><strong>{formatMoney(tax)}</strong></div><div className="total-line"><span>Total</span><strong>{formatMoney(total)}</strong></div><div className="payment-options">{(["card", "cash", "transfer"] as PaymentMethod[]).map((method) => <button key={method} className={paymentMethod === method ? "active" : ""} onClick={() => setPaymentMethod(method)}>{method === "card" ? "Card" : method === "cash" ? "Cash" : "Transfer"}</button>)}</div><button className="checkout-button" disabled={!cart.length || saving} onClick={checkout}>Charge {formatMoney(total)} <Icon name="arrow" size={17} /></button></div></aside></div>;

  const renderProducts = () => <div className="view-stack"><section className="section-toolbar page-toolbar"><div><p className="eyebrow">CATALOG · {products.filter((product) => !product.isArchived).length} ACTIVE ITEMS</p><h2>Products, kept simple.</h2><p className="muted">Manage what is on the shelf and what the team can sell.</p></div><button className="primary-button" onClick={() => { setActiveProduct(null); setModal("product"); }}><Icon name="plus" size={16} /> Add product</button></section><section className="panel table-panel"><div className="table-toolbar"><label className="search-box"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or SKU" /></label><div className="filter-pills">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div></div><ProductTable products={filteredProducts} onEdit={(product) => { setActiveProduct(product); setModal("product"); }} onArchive={archiveProduct} /></section></div>;

  const renderInventory = () => <div className="view-stack"><section className="section-toolbar page-toolbar"><div><p className="eyebrow">INVENTORY CONTROL</p><h2>Know what is moving.</h2><p className="muted">Adjust stock, catch low shelves, and keep the floor honest.</p></div><button className="primary-button" onClick={() => setModal("adjustment")}><Icon name="plus" size={16} /> Adjust stock</button></section><section className="inventory-summary"><div className="inventory-stat"><span className="kpi-icon teal"><Icon name="box" /></span><div><small>Total units</small><strong>{products.reduce((sum, product) => sum + product.stockQuantity, 0)}</strong></div></div><div className="inventory-stat"><span className="kpi-icon rose"><Icon name="bell" /></span><div><small>Low-stock SKUs</small><strong>{products.filter((product) => product.status === "low").length}</strong></div></div><div className="inventory-stat"><span className="kpi-icon sand"><Icon name="sales" /></span><div><small>Stock value</small><strong>{formatMoney(products.reduce((sum, product) => sum + product.stockQuantity * (product.cost ?? 0), 0))}</strong></div></div></section><section className="panel table-panel"><div className="panel-heading"><div><p className="eyebrow">LIVE STOCK LEDGER</p><h3>All active products</h3></div><button className="select-button">Last 30 days <Icon name="chevron" size={14} /></button></div><InventoryTable products={products.filter((product) => !product.isArchived)} onAdjust={(product) => { setActiveProduct(product); setModal("adjustment"); }} /></section></div>;

  const renderSales = () => <div className="view-stack"><section className="section-toolbar page-toolbar"><div><p className="eyebrow">SALES LEDGER · {sales.length} TRANSACTIONS</p><h2>A clear trail of every sale.</h2><p className="muted">Find a ticket, review the totals, and reprint a receipt in one click.</p></div><button className="secondary-button" onClick={() => window.print()}><Icon name="receipt" size={16} /> Export view</button></section><section className="panel table-panel"><div className="table-toolbar"><label className="search-box"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search receipt number" /></label><div className="date-filter">Today <Icon name="chevron" size={14} /></div></div><SalesTable sales={sales.filter((sale) => sale.receiptNumber.toLowerCase().includes(query.toLowerCase()))} onSelect={(sale) => { setLastReceipt(sale); setModal("receipt"); }} /></section></div>;

  if (!authChecked) return <div className="login-screen"><div className="login-card"><span className="brand-mark">P</span><p className="eyebrow">POSFLOW</p><h1>Checking your register session…</h1></div></div>;
  if (!authUser) return <LoginScreen onLogin={(user) => { setAuthUser(user); window.sessionStorage.setItem("posflow_user", JSON.stringify(user)); }} />;
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">P</span><span>POS<span>Flow</span></span></div><div className="store-switcher"><span className="store-avatar">N</span><span><strong>Northstar Market</strong><small>Main store · Open</small></span><Icon name="chevron" size={14} /></div><nav className="nav"><p className="nav-label">Workspace</p>{navItems.map((item) => <button key={item.view} className={view === item.view ? "active" : ""} onClick={() => navigate(item.view, item.href)}><Icon name={item.icon} /><span>{item.label}</span>{item.view === "pos" && <kbd>⌘K</kbd>}</button>)}</nav><div className="sidebar-bottom"><div className="help-card"><span className="help-icon">?</span><strong>Need a hand?</strong><p>Read the quick register guide.</p><button onClick={() => setToast("Use Settings to manage your POS account")}>Open guide <Icon name="arrow" size={14} /></button></div><button className="sidebar-settings" onClick={() => setModal("settings")}><Icon name="settings" /><span>Settings</span></button><div className="version">POSFlow v1.0 <span>·</span> Store mode</div></div></aside><main className="main-content">{renderHeader()}<div className="content-area">{apiOffline && <div className="offline-banner"><span className="live-dot muted-dot" /> Demo mode is active — connect Flask and PostgreSQL to sync live data.</div>}{view === "dashboard" && renderDashboard()}{view === "pos" && renderPos()}{view === "products" && renderProducts()}{view === "inventory" && renderInventory()}{view === "sales" && renderSales()}</div></main>{toast && <div className="toast"><span className="toast-check">✓</span>{toast}</div>}{modal === "product" && <ProductModal product={activeProduct} onClose={() => setModal(null)} onSave={async (product) => { setSaving(true); let persisted = false; let storedProduct = product; try { if (!apiOffline) { const result = activeProduct ? await posApi.updateProduct(activeProduct.id, product) : await posApi.createProduct(product); storedProduct = result.product; persisted = true; } } catch { setApiOffline(true); } setProducts((current) => activeProduct ? current.map((item) => item.id === activeProduct.id ? storedProduct : item) : [{ ...storedProduct, id: storedProduct.id || Date.now(), status: storedProduct.stockQuantity <= storedProduct.reorderLevel ? "low" : "healthy" }, ...current]); setSaving(false); setModal(null); setToast(persisted ? (activeProduct ? "Product updated" : "Product added to catalog") : (activeProduct ? "Product updated in demo mode" : "Product added in demo mode")); }} />}{modal === "adjustment" && <AdjustmentModal product={activeProduct ?? products[0]} onClose={() => setModal(null)} onSave={async (id, delta, reason) => { setSaving(true); let persisted = false; try { if (!apiOffline) { const result = await posApi.adjustInventory(id, delta, reason); setProducts((current) => current.map((product) => product.id === id ? result.product : product)); persisted = true; } } catch { setApiOffline(true); } if (!persisted) setProducts((current) => current.map((product) => { if (product.id !== id) return product; const stockQuantity = Math.max(product.stockQuantity + delta, 0); return { ...product, stockQuantity, status: stockQuantity <= product.reorderLevel ? "low" : "healthy" }; })); setSaving(false); setModal(null); setToast(persisted ? "Inventory adjustment saved" : "Inventory adjustment recorded in demo mode"); }} />}{modal === "receipt" && lastReceipt && <ReceiptModal sale={lastReceipt} onClose={() => setModal(null)} />}{modal === "settings" && <TeamModal user={authUser} onClose={() => setModal(null)} onToast={setToast} />}</div>;
}

function LoginScreen({ onLogin }: { onLogin: (user: { name: string; email: string; role: string }) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await posApi.login(email, password, role);
      onLogin(result.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };
  return <div className="login-screen"><form className="login-card" onSubmit={submit}><span className="brand-mark">P</span><p className="eyebrow accent">NORTHSTAR MARKET · POSFLOW</p><h1>Open the register.</h1><p className="muted">Use your POS account to continue. Choose the role assigned to your account.</p><div className="login-role-toggle"><button type="button" className={role === "staff" ? "active" : ""} onClick={() => setRole("staff")}>Staff</button><button type="button" className={role === "admin" ? "active" : ""} onClick={() => setRole("admin")}>Admin</button></div><label className="login-field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@northstar.market" autoComplete="username" required /></label><label className="login-field"><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required /></label>{error && <p className="login-error">{error}</p>}<button className="primary-button login-button" type="submit" disabled={submitting}>{submitting ? "Signing in…" : `Sign in as ${role === "admin" ? "Admin" : "Staff"}`} <Icon name="arrow" size={16} /></button><small className="login-note">Local POS accounts only. No Google or third-party account is used.</small></form></div>;
}

function SalesTable({ sales, compact = false, onSelect }: { sales: Sale[]; compact?: boolean; onSelect: (sale: Sale) => void }) {
  return <div className={`data-table sales-table ${compact ? "compact" : ""}`}><div className="table-row table-head"><span>Receipt</span><span>Cashier</span><span>Items</span><span>Payment</span><span>Total</span><span /></div>{sales.map((sale) => <button className="table-row table-body" key={`${sale.id}-${sale.receiptNumber}`} onClick={() => onSelect(sale)}><span><strong>{sale.receiptNumber}</strong><small>{shortDate.format(new Date(sale.createdAt))} · {timeFormat.format(new Date(sale.createdAt))}</small></span><span>{sale.cashier}</span><span>{sale.itemCount} items</span><span><span className={`payment-badge ${sale.paymentMethod}`}>{sale.paymentMethod}</span></span><span className="amount">{formatMoney(sale.total)}</span><span className="row-arrow"><Icon name="arrow" size={15} /></span></button>)}</div>;
}

function ProductTable({ products, onEdit, onArchive }: { products: Product[]; onEdit: (product: Product) => void; onArchive: (product: Product) => void }) {
  return <div className="data-table"><div className="table-row table-head"><span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span>Status</span><span /></div>{products.map((product) => <div className="table-row table-body" key={product.id}><span className="product-cell"><span className="product-mark">{product.name.slice(0, 1)}</span><span><strong>{product.name}</strong><small>{product.sku}</small></span></span><span>{product.category}</span><span className="amount">{formatMoney(product.price)}</span><span>{product.stockQuantity} units</span><span><span className={`status-badge ${product.status}`}>{statusLabel(product.status)}</span></span><span className="row-actions"><button onClick={() => onEdit(product)}>Edit</button><button onClick={() => onArchive(product)}>Archive</button></span></div>)}</div>;
}

function InventoryTable({ products, onAdjust }: { products: Product[]; onAdjust: (product: Product) => void }) {
  return <div className="data-table inventory-table"><div className="table-row table-head"><span>Product</span><span>Category</span><span>On hand</span><span>Reorder point</span><span>Signal</span><span /></div>{products.map((product) => { const level = Math.min((product.stockQuantity / Math.max(product.reorderLevel * 2, 1)) * 100, 100); return <div className="table-row table-body" key={product.id}><span className="product-cell"><span className="product-mark">{product.name.slice(0, 1)}</span><span><strong>{product.name}</strong><small>{product.sku}</small></span></span><span className="inventory-category">{product.category}</span><span className="inventory-level"><strong>{product.stockQuantity}</strong><small>units on hand</small><span className="inventory-meter"><i className={product.status === "low" ? "low" : ""} style={{ width: `${level}%` }} /></span></span><span className="reorder-point"><strong>{product.reorderLevel}</strong><small>minimum</small></span><span><span className={`status-badge ${product.status}`}><i />{product.status === "low" ? "Reorder soon" : "Healthy"}</span></span><span><button className="row-link" onClick={() => onAdjust(product)}>Adjust <Icon name="arrow" size={13} /></button></span></div>; })}</div>;
}

function ProductModal({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: (product: Product) => void }) {
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [category, setCategory] = useState(product?.category ?? "Beverages");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [stockQuantity, setStockQuantity] = useState(String(product?.stockQuantity ?? 0));
  const [reorderLevel, setReorderLevel] = useState(String(product?.reorderLevel ?? 5));
  const save = () => { if (!name.trim() || !sku.trim()) return; onSave({ id: product?.id ?? Date.now(), name: name.trim(), sku: sku.trim().toUpperCase(), category, price: Number(price) || 0, stockQuantity: Number(stockQuantity) || 0, reorderLevel: Number(reorderLevel) || 0, status: "healthy" }); };
  return <div className="modal-backdrop"><div className="modal-card"><div className="modal-heading"><div><p className="eyebrow">CATALOG EDITOR</p><h3>{product ? "Edit product" : "Add a product"}</h3></div><button className="icon-button small" onClick={onClose}><Icon name="close" size={17} /></button></div><div className="form-grid"><label><span>Product name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Matcha tonic" /></label><label><span>SKU</span><input value={sku} onChange={(event) => setSku(event.target.value)} placeholder="BEV-042" /></label><label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Beverages</option><option>Bakery</option><option>Snacks</option><option>Home</option></select></label><label><span>Price</span><input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label><span>Opening stock</span><input type="number" min="0" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} /></label><label><span>Reorder point</span><input type="number" min="0" value={reorderLevel} onChange={(event) => setReorderLevel(event.target.value)} /></label></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={save}>{product ? "Save changes" : "Add to catalog"}</button></div></div></div>;
}

function AdjustmentModal({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (id: number, delta: number, reason: string) => void }) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("Receiving");
  return <div className="modal-backdrop"><div className="modal-card compact-modal"><div className="modal-heading"><div><p className="eyebrow">STOCK ADJUSTMENT</p><h3>{product.name}</h3><p className="muted">Currently {product.stockQuantity} units on hand</p></div><button className="icon-button small" onClick={onClose}><Icon name="close" size={17} /></button></div><div className="adjustment-toggle"><button className={Number(delta) >= 0 ? "active" : ""} onClick={() => setDelta("")}>Add stock</button><button className={Number(delta) < 0 ? "active danger" : ""} onClick={() => setDelta("-")}>Remove stock</button></div><label className="large-field"><span>Quantity change</span><input autoFocus type="number" value={delta} onChange={(event) => setDelta(event.target.value)} placeholder="e.g. 12 or -2" /></label><label className="large-field"><span>Reason</span><select value={reason} onChange={(event) => setReason(event.target.value)}><option>Receiving</option><option>Damage / waste</option><option>Cycle count</option><option>Return</option></select></label><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!delta || Number(delta) === 0} onClick={() => onSave(product.id, Number(delta), reason)}>Record adjustment</button></div></div></div>;
}

function ReceiptModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  return <div className="modal-backdrop"><div className="modal-card receipt-modal"><div className="receipt-top"><div><span className="brand-mark small-mark">P</span><strong>POSFlow</strong></div><button className="icon-button small" onClick={onClose}><Icon name="close" size={17} /></button></div><div className="receipt-title"><p className="eyebrow">PAYMENT COMPLETE</p><h3>{formatMoney(sale.total)}</h3><p>{sale.receiptNumber} · {shortDate.format(new Date(sale.createdAt))}</p></div><div className="receipt-items">{sale.items?.map((item) => <div key={item.productId}><span>{item.quantity} × {item.productName}</span><strong>{formatMoney(item.lineTotal)}</strong></div>) ?? <div><span>{sale.itemCount} items</span><strong>{formatMoney(sale.subtotal)}</strong></div>}</div><div className="receipt-summary"><div><span>Subtotal</span><strong>{formatMoney(sale.subtotal)}</strong></div><div><span>Discount</span><strong>-{formatMoney(sale.discount)}</strong></div><div><span>Tax</span><strong>{formatMoney(sale.tax)}</strong></div><div className="receipt-total"><span>Total paid</span><strong>{formatMoney(sale.total)}</strong></div></div><div className="receipt-payment"><span>Paid by <strong>{sale.paymentMethod}</strong></span><span>Cashier <strong>{sale.cashier}</strong></span></div><button className="checkout-button" onClick={() => window.print()}><Icon name="receipt" size={17} /> Print receipt</button></div></div>;
}
