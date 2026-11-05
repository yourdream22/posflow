export type View = "dashboard" | "pos" | "products" | "inventory" | "sales";
export type ProductStatus = "healthy" | "low" | "archived";
export type PaymentMethod = "card" | "cash" | "transfer";

export type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  cost?: number;
  stockQuantity: number;
  reorderLevel: number;
  status: ProductStatus;
  isArchived?: boolean;
};

export type CartItem = Product & { quantity: number };

export type Sale = {
  id: number;
  receiptNumber: string;
  cashier: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  itemCount: number;
  items?: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

export type InventoryMovement = {
  id: number;
  productId: number;
  productName: string;
  quantityDelta: number;
  reason: string;
  note?: string;
  createdAt: string;
};

export type DashboardSnapshot = {
  salesToday: number;
  ordersToday: number;
  lowStock: Product[];
  recentSales: Sale[];
};
