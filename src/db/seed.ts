/**
 * Seed script for built-in database templates
 *
 * Run with: pnpm tsx src/db/seed.ts
 */

import { db } from "./index";
import { templates } from "./schema";

const builtInTemplates = [
	// ============================================================================
	// BLANK TEMPLATE - Empty database (all engines)
	// ============================================================================
	{
		name: "Blank",
		description: "Empty database with no tables or data",
		engine: "all",
		ddlSql: "-- Blank template - no tables",
		seedSql: null,
		isBuiltin: true,
	},

	// ============================================================================
	// E-COMMERCE TEMPLATES
	// ============================================================================
	{
		name: "E-commerce",
		description: "Users, products, categories, orders, and order items",
		engine: "postgresql",
		ddlSql: `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  category_id INTEGER REFERENCES categories(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL
);`,
		seedSql: `INSERT INTO categories (name, slug) VALUES
('Electronics', 'electronics'),
('Clothing', 'clothing'),
('Books', 'books');

INSERT INTO users (email, name) VALUES
('john@example.com', 'John Doe'),
('jane@example.com', 'Jane Smith'),
('bob@example.com', 'Bob Wilson');

INSERT INTO products (name, description, price, stock, category_id) VALUES
('Laptop Pro', 'High-performance laptop', 1299.99, 50, 1),
('Wireless Mouse', 'Ergonomic wireless mouse', 29.99, 200, 1),
('Cotton T-Shirt', 'Comfortable cotton t-shirt', 19.99, 100, 2),
('JavaScript Guide', 'Learn JS from scratch', 39.99, 75, 3);

INSERT INTO orders (user_id, status, total) VALUES
(1, 'completed', 1329.98),
(2, 'pending', 59.98);

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 1, 1299.99),
(1, 2, 1, 29.99),
(2, 3, 2, 19.99),
(2, 4, 1, 39.99);`,
		isBuiltin: true,
	},
	{
		name: "E-commerce",
		description: "Users, products, categories, orders, and order items",
		engine: "mysql",
		ddlSql: `CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  category_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  status VARCHAR(50) DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  product_id INT,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);`,
		seedSql: `INSERT INTO categories (name, slug) VALUES
('Electronics', 'electronics'),
('Clothing', 'clothing'),
('Books', 'books');

INSERT INTO users (email, name) VALUES
('john@example.com', 'John Doe'),
('jane@example.com', 'Jane Smith'),
('bob@example.com', 'Bob Wilson');

INSERT INTO products (name, description, price, stock, category_id) VALUES
('Laptop Pro', 'High-performance laptop', 1299.99, 50, 1),
('Wireless Mouse', 'Ergonomic wireless mouse', 29.99, 200, 1),
('Cotton T-Shirt', 'Comfortable cotton t-shirt', 19.99, 100, 2),
('JavaScript Guide', 'Learn JS from scratch', 39.99, 75, 3);

INSERT INTO orders (user_id, status, total) VALUES
(1, 'completed', 1329.98),
(2, 'pending', 59.98);

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 1, 1299.99),
(1, 2, 1, 29.99),
(2, 3, 2, 19.99),
(2, 4, 1, 39.99);`,
		isBuiltin: true,
	},
	{
		name: "E-commerce",
		description: "Users, products, categories, orders, and order items",
		engine: "mariadb",
		ddlSql: `CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  category_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  status VARCHAR(50) DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  product_id INT,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);`,
		seedSql: `INSERT INTO categories (name, slug) VALUES
('Electronics', 'electronics'),
('Clothing', 'clothing'),
('Books', 'books');

INSERT INTO users (email, name) VALUES
('john@example.com', 'John Doe'),
('jane@example.com', 'Jane Smith'),
('bob@example.com', 'Bob Wilson');

INSERT INTO products (name, description, price, stock, category_id) VALUES
('Laptop Pro', 'High-performance laptop', 1299.99, 50, 1),
('Wireless Mouse', 'Ergonomic wireless mouse', 29.99, 200, 1),
('Cotton T-Shirt', 'Comfortable cotton t-shirt', 19.99, 100, 2),
('JavaScript Guide', 'Learn JS from scratch', 39.99, 75, 3);

INSERT INTO orders (user_id, status, total) VALUES
(1, 'completed', 1329.98),
(2, 'pending', 59.98);

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 1, 1299.99),
(1, 2, 1, 29.99),
(2, 3, 2, 19.99),
(2, 4, 1, 39.99);`,
		isBuiltin: true,
	},

	// ============================================================================
	// BLOG TEMPLATES
	// ============================================================================
	{
		name: "Blog",
		description: "Users, posts, comments, and tags",
		engine: "postgresql",
		ddlSql: `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id),
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id),
  author_name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE post_tags (
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);`,
		seedSql: `INSERT INTO users (email, name, bio) VALUES
('admin@blog.com', 'Admin User', 'Site administrator'),
('writer@blog.com', 'Jane Writer', 'Tech blogger');

INSERT INTO posts (title, slug, content, author_id, published) VALUES
('Getting Started with SQL', 'getting-started-sql', 'Learn the basics of SQL...', 2, true),
('Advanced PostgreSQL', 'advanced-postgresql', 'Deep dive into PostgreSQL features...', 2, true);

INSERT INTO tags (name) VALUES
('SQL'),
('PostgreSQL'),
('Tutorial'),
('Database');

INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1),
(1, 3),
(2, 1),
(2, 2),
(2, 4);

INSERT INTO comments (post_id, author_name, content) VALUES
(1, 'Reader Bob', 'Great introduction!'),
(1, 'Alice', 'Very helpful, thanks!');`,
		isBuiltin: true,
	},
	{
		name: "Blog",
		description: "Users, posts, comments, and tags",
		engine: "mysql",
		ddlSql: `CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  author_id INT,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT,
  author_name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

CREATE TABLE tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE post_tags (
  post_id INT,
  tag_id INT,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);`,
		seedSql: `INSERT INTO users (email, name, bio) VALUES
('admin@blog.com', 'Admin User', 'Site administrator'),
('writer@blog.com', 'Jane Writer', 'Tech blogger');

INSERT INTO posts (title, slug, content, author_id, published) VALUES
('Getting Started with SQL', 'getting-started-sql', 'Learn the basics of SQL...', 2, true),
('Advanced PostgreSQL', 'advanced-postgresql', 'Deep dive into PostgreSQL features...', 2, true);

INSERT INTO tags (name) VALUES
('SQL'),
('PostgreSQL'),
('Tutorial'),
('Database');

INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1),
(1, 3),
(2, 1),
(2, 2),
(2, 4);

INSERT INTO comments (post_id, author_name, content) VALUES
(1, 'Reader Bob', 'Great introduction!'),
(1, 'Alice', 'Very helpful, thanks!');`,
		isBuiltin: true,
	},
	{
		name: "Blog",
		description: "Users, posts, comments, and tags",
		engine: "mariadb",
		ddlSql: `CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  author_id INT,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT,
  author_name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

CREATE TABLE tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE post_tags (
  post_id INT,
  tag_id INT,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);`,
		seedSql: `INSERT INTO users (email, name, bio) VALUES
('admin@blog.com', 'Admin User', 'Site administrator'),
('writer@blog.com', 'Jane Writer', 'Tech blogger');

INSERT INTO posts (title, slug, content, author_id, published) VALUES
('Getting Started with SQL', 'getting-started-sql', 'Learn the basics of SQL...', 2, true),
('Advanced PostgreSQL', 'advanced-postgresql', 'Deep dive into PostgreSQL features...', 2, true);

INSERT INTO tags (name) VALUES
('SQL'),
('PostgreSQL'),
('Tutorial'),
('Database');

INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1),
(1, 3),
(2, 1),
(2, 2),
(2, 4);

INSERT INTO comments (post_id, author_name, content) VALUES
(1, 'Reader Bob', 'Great introduction!'),
(1, 'Alice', 'Very helpful, thanks!');`,
		isBuiltin: true,
	},

	// ============================================================================
	// INVENTORY TEMPLATES
	// ============================================================================
	{
		name: "Inventory",
		description: "Warehouses, products, and stock movements",
		engine: "postgresql",
		ddlSql: `CREATE TABLE warehouses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL
);

CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  warehouse_id INTEGER REFERENCES warehouses(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER DEFAULT 0,
  UNIQUE(warehouse_id, product_id)
);

CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  warehouse_id INTEGER REFERENCES warehouses(id),
  product_id INTEGER REFERENCES products(id),
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out')),
  quantity INTEGER NOT NULL,
  reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
		seedSql: `INSERT INTO warehouses (name, location) VALUES
('Main Warehouse', 'Jakarta, Indonesia'),
('Secondary Warehouse', 'Bandung, Indonesia');

INSERT INTO products (sku, name, description, unit_price) VALUES
('SKU-001', 'Widget A', 'Standard widget', 10.00),
('SKU-002', 'Widget B', 'Premium widget', 25.00),
('SKU-003', 'Gadget X', 'Electronic gadget', 99.99);

INSERT INTO inventory (warehouse_id, product_id, quantity) VALUES
(1, 1, 100),
(1, 2, 50),
(1, 3, 25),
(2, 1, 75),
(2, 2, 30);

INSERT INTO stock_movements (warehouse_id, product_id, movement_type, quantity, reference) VALUES
(1, 1, 'in', 100, 'PO-2024-001'),
(1, 2, 'in', 50, 'PO-2024-002'),
(1, 3, 'in', 25, 'PO-2024-003'),
(1, 1, 'out', 10, 'SO-2024-001'),
(2, 1, 'in', 75, 'PO-2024-004');`,
		isBuiltin: true,
	},
	{
		name: "Inventory",
		description: "Warehouses, products, and stock movements",
		engine: "mysql",
		ddlSql: `CREATE TABLE warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL
);

CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT,
  product_id INT,
  quantity INT DEFAULT 0,
  UNIQUE KEY unique_warehouse_product (warehouse_id, product_id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT,
  product_id INT,
  movement_type ENUM('in', 'out') NOT NULL,
  quantity INT NOT NULL,
  reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);`,
		seedSql: `INSERT INTO warehouses (name, location) VALUES
('Main Warehouse', 'Jakarta, Indonesia'),
('Secondary Warehouse', 'Bandung, Indonesia');

INSERT INTO products (sku, name, description, unit_price) VALUES
('SKU-001', 'Widget A', 'Standard widget', 10.00),
('SKU-002', 'Widget B', 'Premium widget', 25.00),
('SKU-003', 'Gadget X', 'Electronic gadget', 99.99);

INSERT INTO inventory (warehouse_id, product_id, quantity) VALUES
(1, 1, 100),
(1, 2, 50),
(1, 3, 25),
(2, 1, 75),
(2, 2, 30);

INSERT INTO stock_movements (warehouse_id, product_id, movement_type, quantity, reference) VALUES
(1, 1, 'in', 100, 'PO-2024-001'),
(1, 2, 'in', 50, 'PO-2024-002'),
(1, 3, 'in', 25, 'PO-2024-003'),
(1, 1, 'out', 10, 'SO-2024-001'),
(2, 1, 'in', 75, 'PO-2024-004');`,
		isBuiltin: true,
	},
	{
		name: "Inventory",
		description: "Warehouses, products, and stock movements",
		engine: "mariadb",
		ddlSql: `CREATE TABLE warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL
);

CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT,
  product_id INT,
  quantity INT DEFAULT 0,
  UNIQUE KEY unique_warehouse_product (warehouse_id, product_id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT,
  product_id INT,
  movement_type ENUM('in', 'out') NOT NULL,
  quantity INT NOT NULL,
  reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);`,
		seedSql: `INSERT INTO warehouses (name, location) VALUES
('Main Warehouse', 'Jakarta, Indonesia'),
('Secondary Warehouse', 'Bandung, Indonesia');

INSERT INTO products (sku, name, description, unit_price) VALUES
('SKU-001', 'Widget A', 'Standard widget', 10.00),
('SKU-002', 'Widget B', 'Premium widget', 25.00),
('SKU-003', 'Gadget X', 'Electronic gadget', 99.99);

INSERT INTO inventory (warehouse_id, product_id, quantity) VALUES
(1, 1, 100),
(1, 2, 50),
(1, 3, 25),
(2, 1, 75),
(2, 2, 30);

INSERT INTO stock_movements (warehouse_id, product_id, movement_type, quantity, reference) VALUES
(1, 1, 'in', 100, 'PO-2024-001'),
(1, 2, 'in', 50, 'PO-2024-002'),
(1, 3, 'in', 25, 'PO-2024-003'),
(1, 1, 'out', 10, 'SO-2024-001'),
(2, 1, 'in', 75, 'PO-2024-004');`,
		isBuiltin: true,
	},
];

async function seed() {
	console.log("🌱 Seeding built-in templates...");

	try {
		for (const template of builtInTemplates) {
			await db.insert(templates).values(template).onConflictDoNothing();
			console.log(
				`✅ Inserted template: ${template.name} (${template.engine})`,
			);
		}

		console.log("🎉 Seeding complete!");
	} catch (error) {
		console.error("❌ Seeding failed:", error);
		throw error;
	}

	process.exit(0);
}

seed();
