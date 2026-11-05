import { CartItem, DashboardSnapshot, InventoryMovement, Product, Sale } from "./types";

type ApiProduct = {
  id: number;
  sku: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  cost?: number;
  stock_quantity: number;
  reorder_level: number;
  status: Product["status"];
  is_archived: boolean;
};

type ApiSale = {
  id: number;
  receipt_number: string;
  cashier: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: Sale["paymentMethod"];
  created_at: string;
  item_count: number;
  items?: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

const mapProduct = (product: ApiProduct): Product => ({
  id: product.id,
  sku: product.sku,
  name: product.name,
  category: product.category,
  description: product.description,
  price: product.price,
  cost: product.cost,
  stockQuantity: product.stock_quantity,
  reorderLevel: product.reorder_level,
  status: product.status,
  isArchived: product.is_archived
});

const mapSale = (sale: ApiSale): Sale => ({
  id: sale.id,
  receiptNumber: sale.receipt_number,
  cashier: sale.cashier,
  subtotal: sale.subtotal,
  discount: sale.discount,
  tax: sale.tax,
  total: sale.total,
  paymentMethod: sale.payment_method,
  createdAt: sale.created_at,
  itemCount: sale.item_count,
  items: sale.items?.map((item) => ({
    productId: item.product_id,
    productName: item.product_name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    lineTotal: item.line_total
  }))
});

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    credentials: "include"
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Request failed");
  }
  return response.json() as Promise<T>;
}

export const posApi = {
  login: (email: string, password: string, role: "admin" | "staff") => request<{ user: { id: number; name: string; email: string; role: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, role })
  }),
  me: async () => request<{ user: { id: number; name: string; email: string; role: string } }>("/auth/me"),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  staff: () => request<{ staff: Array<{ id: number; name: string; email: string; role: string }>; mode: string }>("/staff"),
  createStaff: (name: string, email: string, password: string) => request<{ staff: { id: number; name: string; email: string; role: string }; mode: string }>("/staff", {
    method: "POST",
    body: JSON.stringify({ name, email, password })
  }),
  dashboard: async (): Promise<DashboardSnapshot> => {
    const response = await request<{
      sales_today: number;
      orders_today: number;
      low_stock: ApiProduct[];
      recent_sales: ApiSale[];
    }>("/dashboard");
    return {
      salesToday: response.sales_today,
      ordersToday: response.orders_today,
      lowStock: response.low_stock.map(mapProduct),
      recentSales: response.recent_sales.map(mapSale)
    };
  },
  products: async (query = "") => {
    const response = await request<{ products: ApiProduct[] }>(`/products?query=${encodeURIComponent(query)}`);
    return { products: response.products.map(mapProduct) };
  },
  sales: async (query = "") => {
    const response = await request<{ sales: ApiSale[] }>(`/sales?query=${encodeURIComponent(query)}`);
    return { sales: response.sales.map(mapSale) };
  },
  movements: () => request<{ movements: InventoryMovement[] }>("/inventory/adjustments"),
  createProduct: async (product: Omit<Product, "id" | "status">) => {
    const response = await request<{ product: ApiProduct }>("/products", {
      method: "POST",
      body: JSON.stringify({
        sku: product.sku,
        name: product.name,
        category: product.category,
        description: product.description ?? "",
        price: product.price,
        cost: product.cost ?? 0,
        stock_quantity: product.stockQuantity,
        reorder_level: product.reorderLevel
      })
    });
    return { product: mapProduct(response.product) };
  },
  updateProduct: async (id: number, product: Partial<Product>) => {
    const response = await request<{ product: ApiProduct }>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price,
        cost: product.cost,
        stock_quantity: product.stockQuantity,
        reorder_level: product.reorderLevel,
        is_archived: product.isArchived
      })
    });
    return { product: mapProduct(response.product) };
  },
  adjustInventory: async (productId: number, quantityDelta: number, reason: string) => {
    const response = await request<{ movement: InventoryMovement; product: ApiProduct }>("/inventory/adjustments", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, quantity_delta: quantityDelta, reason })
    });
    return { movement: response.movement, product: mapProduct(response.product) };
  },
  createSale: async (items: CartItem[], discount: number, paymentMethod: string) => {
    const response = await request<{ sale: ApiSale }>("/sales", {
      method: "POST",
      body: JSON.stringify({
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
        discount,
        payment_method: paymentMethod,
        tax_rate: 0.08
      })
    });
    return { sale: mapSale(response.sale) };
  }
};
