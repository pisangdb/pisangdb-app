import type { TemplateDefinition } from "./index";

export const INVENTORY_TEMPLATE: TemplateDefinition = {
	name: "Inventory",
	description: "Warehouses, products, stock_movements",
	variants: {
		postgresql: {
			ddl: `
-- Inventory Schema for PostgreSQL
CREATE TABLE warehouses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  quantity INTEGER NOT NULL,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'transfer')),
  reference_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
`.trim(),
			seed: `
-- Inventory Seed Data for PostgreSQL
INSERT INTO warehouses (name, location) VALUES
  ('Main Warehouse', 'Jakarta, Indonesia'),
  ('Distribution Center A', 'Surabaya, Indonesia'),
  ('Distribution Center B', 'Bandung, Indonesia'),
  ('Cold Storage', 'Medan, Indonesia');

INSERT INTO products (name, sku, description, unit_price, reorder_level) VALUES
  ('Laptop Pro 15', 'LAP-001', '15-inch professional laptop', 1299.99, 20),
  ('Wireless Mouse', 'MOU-001', 'Ergonomic wireless mouse', 29.99, 50),
  ('USB-C Hub', 'HUB-001', '7-in-1 USB-C hub', 49.99, 30),
  ('Mechanical Keyboard', 'KEY-001', 'RGB mechanical keyboard', 89.99, 25),
  ('Monitor 27"', 'MON-001', '27-inch 4K monitor', 399.99, 15),
  ('Webcam HD', 'CAM-001', '1080p HD webcam', 79.99, 40),
  ('Headset Pro', 'HED-001', 'Gaming headset with mic', 149.99, 20),
  ('Mousepad XL', 'PAD-001', 'Extra large gaming mousepad', 24.99, 60);

INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES
  (1, 1, 100), (2, 1, 250), (3, 1, 180), (4, 1, 120),
  (5, 1, 50), (6, 1, 200), (7, 1, 80), (8, 1, 300),
  (1, 2, 30), (2, 2, 100), (3, 2, 75), (4, 2, 50),
  (5, 2, 20), (6, 2, 80),
  (1, 3, 20), (2, 3, 60), (8, 3, 150);

INSERT INTO stock_movements (product_id, warehouse_id, quantity, movement_type, reference_id, notes) VALUES
  (1, 1, 100, 'in', 'PO-2026-001', 'Initial stock from supplier'),
  (2, 1, 250, 'in', 'PO-2026-002', 'Initial stock from supplier'),
  (1, 1, -5, 'out', 'SO-2026-001', 'Sales order fulfillment'),
  (2, 1, -10, 'out', 'SO-2026-002', 'Sales order fulfillment'),
  (1, 2, 30, 'transfer', 'TR-2026-001', 'Transfer from main warehouse'),
  (2, 2, 100, 'transfer', 'TR-2026-002', 'Transfer from main warehouse'),
  (3, 1, 180, 'in', 'PO-2026-003', 'New stock arrival'),
  (4, 1, -3, 'out', 'SO-2026-003', 'Sales order fulfillment');
`.trim(),
		},
		mysql: {
			ddl: `
-- Inventory Schema for MySQL
CREATE TABLE warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  reorder_level INT NOT NULL DEFAULT 10,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_inventory_product_warehouse (product_id, warehouse_id),
  KEY idx_inventory_product (product_id),
  KEY idx_inventory_warehouse (warehouse_id),
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_inventory_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  quantity INT NOT NULL,
  movement_type ENUM('in', 'out', 'transfer') NOT NULL,
  reference_id VARCHAR(100),
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_stock_movements_product (product_id),
  KEY idx_stock_movements_warehouse (warehouse_id),
  KEY idx_stock_movements_type (movement_type),
  CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_stock_movements_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`.trim(),
			seed: `
-- Inventory Seed Data for MySQL
INSERT INTO warehouses (name, location) VALUES
  ('Main Warehouse', 'Jakarta, Indonesia'),
  ('Distribution Center A', 'Surabaya, Indonesia'),
  ('Distribution Center B', 'Bandung, Indonesia'),
  ('Cold Storage', 'Medan, Indonesia');

INSERT INTO products (name, sku, description, unit_price, reorder_level) VALUES
  ('Laptop Pro 15', 'LAP-001', '15-inch professional laptop', 1299.99, 20),
  ('Wireless Mouse', 'MOU-001', 'Ergonomic wireless mouse', 29.99, 50),
  ('USB-C Hub', 'HUB-001', '7-in-1 USB-C hub', 49.99, 30),
  ('Mechanical Keyboard', 'KEY-001', 'RGB mechanical keyboard', 89.99, 25),
  ('Monitor 27"', 'MON-001', '27-inch 4K monitor', 399.99, 15),
  ('Webcam HD', 'CAM-001', '1080p HD webcam', 79.99, 40),
  ('Headset Pro', 'HED-001', 'Gaming headset with mic', 149.99, 20),
  ('Mousepad XL', 'PAD-001', 'Extra large gaming mousepad', 24.99, 60);

INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES
  (1, 1, 100), (2, 1, 250), (3, 1, 180), (4, 1, 120),
  (5, 1, 50), (6, 1, 200), (7, 1, 80), (8, 1, 300),
  (1, 2, 30), (2, 2, 100), (3, 2, 75), (4, 2, 50),
  (5, 2, 20), (6, 2, 80),
  (1, 3, 20), (2, 3, 60), (8, 3, 150);

INSERT INTO stock_movements (product_id, warehouse_id, quantity, movement_type, reference_id, notes) VALUES
  (1, 1, 100, 'in', 'PO-2026-001', 'Initial stock from supplier'),
  (2, 1, 250, 'in', 'PO-2026-002', 'Initial stock from supplier'),
  (1, 1, -5, 'out', 'SO-2026-001', 'Sales order fulfillment'),
  (2, 1, -10, 'out', 'SO-2026-002', 'Sales order fulfillment'),
  (1, 2, 30, 'transfer', 'TR-2026-001', 'Transfer from main warehouse'),
  (2, 2, 100, 'transfer', 'TR-2026-002', 'Transfer from main warehouse'),
  (3, 1, 180, 'in', 'PO-2026-003', 'New stock arrival'),
  (4, 1, -3, 'out', 'SO-2026-003', 'Sales order fulfillment');
`.trim(),
		},
		mariadb: {
			ddl: `
-- Inventory Schema for MariaDB
CREATE TABLE warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  reorder_level INT NOT NULL DEFAULT 10,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_inventory_product_warehouse (product_id, warehouse_id),
  KEY idx_inventory_product (product_id),
  KEY idx_inventory_warehouse (warehouse_id),
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_inventory_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  quantity INT NOT NULL,
  movement_type ENUM('in', 'out', 'transfer') NOT NULL,
  reference_id VARCHAR(100),
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_stock_movements_product (product_id),
  KEY idx_stock_movements_warehouse (warehouse_id),
  KEY idx_stock_movements_type (movement_type),
  CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_stock_movements_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`.trim(),
			seed: `
-- Inventory Seed Data for MariaDB
INSERT INTO warehouses (name, location) VALUES
  ('Main Warehouse', 'Jakarta, Indonesia'),
  ('Distribution Center A', 'Surabaya, Indonesia'),
  ('Distribution Center B', 'Bandung, Indonesia'),
  ('Cold Storage', 'Medan, Indonesia');

INSERT INTO products (name, sku, description, unit_price, reorder_level) VALUES
  ('Laptop Pro 15', 'LAP-001', '15-inch professional laptop', 1299.99, 20),
  ('Wireless Mouse', 'MOU-001', 'Ergonomic wireless mouse', 29.99, 50),
  ('USB-C Hub', 'HUB-001', '7-in-1 USB-C hub', 49.99, 30),
  ('Mechanical Keyboard', 'KEY-001', 'RGB mechanical keyboard', 89.99, 25),
  ('Monitor 27"', 'MON-001', '27-inch 4K monitor', 399.99, 15),
  ('Webcam HD', 'CAM-001', '1080p HD webcam', 79.99, 40),
  ('Headset Pro', 'HED-001', 'Gaming headset with mic', 149.99, 20),
  ('Mousepad XL', 'PAD-001', 'Extra large gaming mousepad', 24.99, 60);

INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES
  (1, 1, 100), (2, 1, 250), (3, 1, 180), (4, 1, 120),
  (5, 1, 50), (6, 1, 200), (7, 1, 80), (8, 1, 300),
  (1, 2, 30), (2, 2, 100), (3, 2, 75), (4, 2, 50),
  (5, 2, 20), (6, 2, 80),
  (1, 3, 20), (2, 3, 60), (8, 3, 150);

INSERT INTO stock_movements (product_id, warehouse_id, quantity, movement_type, reference_id, notes) VALUES
  (1, 1, 100, 'in', 'PO-2026-001', 'Initial stock from supplier'),
  (2, 1, 250, 'in', 'PO-2026-002', 'Initial stock from supplier'),
  (1, 1, -5, 'out', 'SO-2026-001', 'Sales order fulfillment'),
  (2, 1, -10, 'out', 'SO-2026-002', 'Sales order fulfillment'),
  (1, 2, 30, 'transfer', 'TR-2026-001', 'Transfer from main warehouse'),
  (2, 2, 100, 'transfer', 'TR-2026-002', 'Transfer from main warehouse'),
  (3, 1, 180, 'in', 'PO-2026-003', 'New stock arrival'),
  (4, 1, -3, 'out', 'SO-2026-003', 'Sales order fulfillment');
`.trim(),
		},
	},
};
