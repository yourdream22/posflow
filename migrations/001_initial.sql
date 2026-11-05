CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  receipt_number VARCHAR(40) UNIQUE NOT NULL,
  cashier_id INTEGER NOT NULL REFERENCES users(id),
  subtotal NUMERIC(12, 2) NOT NULL,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name VARCHAR(160) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL,
  line_total NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  user_id INTEGER REFERENCES users(id),
  quantity_delta INTEGER NOT NULL,
  reason VARCHAR(120) NOT NULL,
  note VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_movements(product_id);

INSERT INTO users (name, email, role, password_hash)
VALUES
  ('Maya Chen', 'admin@northstar.market', 'admin', 'scrypt:32768:8:1$hThna1lyBaC3RVUi$26eb4a66b7e4ab8fe42d284f4bb9b746855fb786d860ce911134692fac933bfc5ed23cc0e75412bbcd1512addcf7b2774932b22ee2fafc40ce69ffb1520c9e82'),
  ('Alex Rivera', 'staff@northstar.market', 'staff', 'scrypt:32768:8:1$gr26MxOqhHxTIUyQ$b5a8d436c2bd35ad5b27b887c2d657096d0d62aae9ed3007690723e22e5018392c2421cfc0a85d8eac1754f64abe7945ba3ba457567fbd0e2213249998d74fab')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (sku, name, category, description, price, cost, stock_quantity, reorder_level)
VALUES
  ('BEV-001', 'Sparkling Yuzu', 'Beverages', 'Citrus soda with a clean finish.', 4.50, 1.80, 24, 8),
  ('PAN-014', 'Sourdough Loaf', 'Bakery', 'Slow-fermented daily loaf.', 7.25, 3.10, 6, 8),
  ('SNK-032', 'Sea Salt Crisps', 'Snacks', 'Kettle-cooked potato crisps.', 3.95, 1.40, 38, 10),
  ('PAN-022', 'Almond Croissant', 'Bakery', 'Buttery laminated pastry.', 5.75, 2.10, 4, 6),
  ('HOM-008', 'Cedar Hand Soap', 'Home', 'Plant-based soap, 300ml.', 9.90, 4.10, 17, 5),
  ('BEV-018', 'Cold Brew Bottle', 'Beverages', 'Single-origin cold brew coffee.', 6.80, 2.75, 12, 6)
ON CONFLICT (sku) DO NOTHING;
