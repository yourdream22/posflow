import { DashboardSnapshot, Product, Sale } from "./types";

export const demoProducts: Product[] = [
  { id: 1, sku: "BEV-001", name: "Sparkling Yuzu", category: "Beverages", price: 4.5, cost: 1.8, stockQuantity: 24, reorderLevel: 8, status: "healthy", description: "Citrus soda with a clean finish." },
  { id: 2, sku: "PAN-014", name: "Sourdough Loaf", category: "Bakery", price: 7.25, cost: 3.1, stockQuantity: 6, reorderLevel: 8, status: "low", description: "Slow-fermented daily loaf." },
  { id: 3, sku: "SNK-032", name: "Sea Salt Crisps", category: "Snacks", price: 3.95, cost: 1.4, stockQuantity: 38, reorderLevel: 10, status: "healthy", description: "Kettle-cooked potato crisps." },
  { id: 4, sku: "PAN-022", name: "Almond Croissant", category: "Bakery", price: 5.75, cost: 2.1, stockQuantity: 4, reorderLevel: 6, status: "low", description: "Buttery laminated pastry." },
  { id: 5, sku: "HOM-008", name: "Cedar Hand Soap", category: "Home", price: 9.9, cost: 4.1, stockQuantity: 17, reorderLevel: 5, status: "healthy", description: "Plant-based soap, 300ml." },
  { id: 6, sku: "BEV-018", name: "Cold Brew Bottle", category: "Beverages", price: 6.8, cost: 2.75, stockQuantity: 12, reorderLevel: 6, status: "healthy", description: "Single-origin cold brew coffee." },
  { id: 7, sku: "PAN-030", name: "Rosemary Focaccia", category: "Bakery", price: 6.4, cost: 2.65, stockQuantity: 9, reorderLevel: 5, status: "healthy", description: "Olive oil, rosemary and flaky salt." },
  { id: 8, sku: "SNK-041", name: "Dark Chocolate Bar", category: "Snacks", price: 4.25, cost: 1.7, stockQuantity: 21, reorderLevel: 8, status: "healthy", description: "72% cacao with toasted nibs." }
];

export const demoSales: Sale[] = [
  { id: 1048, receiptNumber: "NF-261105-8F2A", cashier: "Alex Rivera", subtotal: 32.8, discount: 0, tax: 2.62, total: 35.42, paymentMethod: "card", createdAt: "2026-11-05T09:42:00", itemCount: 6 },
  { id: 1047, receiptNumber: "NF-261105-7C10", cashier: "Maya Chen", subtotal: 18.15, discount: 1.5, tax: 1.33, total: 17.98, paymentMethod: "cash", createdAt: "2026-11-05T09:18:00", itemCount: 3 },
  { id: 1046, receiptNumber: "NF-261105-6B93", cashier: "Alex Rivera", subtotal: 64.4, discount: 0, tax: 5.15, total: 69.55, paymentMethod: "card", createdAt: "2026-11-05T08:56:00", itemCount: 9 },
  { id: 1045, receiptNumber: "NF-261105-1D42", cashier: "Jordan Lee", subtotal: 11.75, discount: 0, tax: 0.94, total: 12.69, paymentMethod: "transfer", createdAt: "2026-11-05T08:31:00", itemCount: 2 },
  { id: 1044, receiptNumber: "NF-261104-AD71", cashier: "Alex Rivera", subtotal: 42.9, discount: 3, tax: 3.19, total: 43.09, paymentMethod: "card", createdAt: "2026-11-04T18:12:00", itemCount: 7 }
];

export const demoDashboard: DashboardSnapshot = {
  salesToday: 840.72,
  ordersToday: 42,
  lowStock: demoProducts.filter((product) => product.status === "low"),
  recentSales: demoSales.slice(0, 4)
};
