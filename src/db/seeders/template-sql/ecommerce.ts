import type { TemplateDefinition } from "./index";

export const ECOMMERCE_TEMPLATE: TemplateDefinition = {
	name: "E-commerce",
	description: "Users, products, categories, orders, order_items",
	variants: {
		postgresql: {
			ddl: `
-- E-commerce Schema for PostgreSQL
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category_id INTEGER REFERENCES categories(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
`.trim(),
			seed: `
-- E-commerce Seed Data for PostgreSQL
INSERT INTO categories (name, slug) VALUES
  ('Electronics', 'electronics'),
  ('Clothing', 'clothing'),
  ('Books', 'books'),
  ('Home & Garden', 'home-garden'),
  ('Sports', 'sports');

INSERT INTO users (name, email) VALUES
  ('John Doe', 'john@example.com'),
  ('Jane Smith', 'jane@example.com'),
  ('Bob Wilson', 'bob@example.com'),
  ('Alice Brown', 'alice@example.com'),
  ('Charlie Davis', 'charlie@example.com');

INSERT INTO products (name, description, price, stock, category_id) VALUES
  ('Laptop Pro 15', 'High-performance laptop for professionals', 1299.99, 50, 1),
  ('Wireless Headphones', 'Noise-canceling Bluetooth headphones', 199.99, 100, 1),
  ('Smart Watch', 'Fitness tracking smartwatch', 299.99, 75, 1),
  ('Cotton T-Shirt', 'Comfortable 100% cotton t-shirt', 24.99, 200, 2),
  ('Denim Jeans', 'Classic fit denim jeans', 59.99, 150, 2),
  ('Running Shoes', 'Lightweight running sneakers', 89.99, 120, 5),
  ('Yoga Mat', 'Non-slip exercise mat', 29.99, 80, 5),
  ('JavaScript Guide', 'Comprehensive JS programming book', 39.99, 60, 3),
  ('Garden Tools Set', '5-piece garden tool collection', 49.99, 40, 4),
  ('LED Desk Lamp', 'Adjustable LED desk lamp', 34.99, 90, 1);

INSERT INTO orders (user_id, total, status) VALUES
  (1, 1499.98, 'completed'),
  (2, 89.98, 'completed'),
  (3, 299.99, 'pending'),
  (1, 59.99, 'completed'),
  (4, 1299.99, 'processing');

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
  (1, 1, 1, 1299.99),
  (1, 2, 1, 199.99),
  (2, 4, 2, 24.99),
  (2, 5, 1, 59.99),
  (3, 3, 1, 299.99),
  (4, 5, 1, 59.99),
  (5, 1, 1, 1299.99);
`.trim(),
		},
		mysql: {
			ddl: `
-- E-commerce Schema for MySQL
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  category_id INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_products_category (category_id),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_orders_user (user_id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  KEY idx_order_items_order (order_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`.trim(),
			seed: `
-- E-commerce Seed Data for MySQL
INSERT INTO categories (name, slug) VALUES
  ('Electronics', 'electronics'),
  ('Clothing', 'clothing'),
  ('Books', 'books'),
  ('Home & Garden', 'home-garden'),
  ('Sports', 'sports');

INSERT INTO users (name, email) VALUES
  ('John Doe', 'john@example.com'),
  ('Jane Smith', 'jane@example.com'),
  ('Bob Wilson', 'bob@example.com'),
  ('Alice Brown', 'alice@example.com'),
  ('Charlie Davis', 'charlie@example.com');

INSERT INTO products (name, description, price, stock, category_id) VALUES
  ('Laptop Pro 15', 'High-performance laptop for professionals', 1299.99, 50, 1),
  ('Wireless Headphones', 'Noise-canceling Bluetooth headphones', 199.99, 100, 1),
  ('Smart Watch', 'Fitness tracking smartwatch', 299.99, 75, 1),
  ('Cotton T-Shirt', 'Comfortable 100% cotton t-shirt', 24.99, 200, 2),
  ('Denim Jeans', 'Classic fit denim jeans', 59.99, 150, 2),
  ('Running Shoes', 'Lightweight running sneakers', 89.99, 120, 5),
  ('Yoga Mat', 'Non-slip exercise mat', 29.99, 80, 5),
  ('JavaScript Guide', 'Comprehensive JS programming book', 39.99, 60, 3),
  ('Garden Tools Set', '5-piece garden tool collection', 49.99, 40, 4),
  ('LED Desk Lamp', 'Adjustable LED desk lamp', 34.99, 90, 1);

INSERT INTO orders (user_id, total, status) VALUES
  (1, 1499.98, 'completed'),
  (2, 89.98, 'completed'),
  (3, 299.99, 'pending'),
  (1, 59.99, 'completed'),
  (4, 1299.99, 'processing');

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
  (1, 1, 1, 1299.99),
  (1, 2, 1, 199.99),
  (2, 4, 2, 24.99),
  (2, 5, 1, 59.99),
  (3, 3, 1, 299.99),
  (4, 5, 1, 59.99),
  (5, 1, 1, 1299.99);
`.trim(),
		},
		mariadb: {
			ddl: `
-- E-commerce Schema for MariaDB (same as MySQL)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  category_id INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_products_category (category_id),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_orders_user (user_id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  KEY idx_order_items_order (order_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`.trim(),
			seed: `
-- E-commerce Seed Data for MariaDB
INSERT INTO categories (name, slug) VALUES
  ('Electronics', 'electronics'),
  ('Clothing', 'clothing'),
  ('Books', 'books'),
  ('Home & Garden', 'home-garden'),
  ('Sports', 'sports');

INSERT INTO users (name, email) VALUES
  ('John Doe', 'john@example.com'),
  ('Jane Smith', 'jane@example.com'),
  ('Bob Wilson', 'bob@example.com'),
  ('Alice Brown', 'alice@example.com'),
  ('Charlie Davis', 'charlie@example.com');

INSERT INTO products (name, description, price, stock, category_id) VALUES
  ('Laptop Pro 15', 'High-performance laptop for professionals', 1299.99, 50, 1),
  ('Wireless Headphones', 'Noise-canceling Bluetooth headphones', 199.99, 100, 1),
  ('Smart Watch', 'Fitness tracking smartwatch', 299.99, 75, 1),
  ('Cotton T-Shirt', 'Comfortable 100% cotton t-shirt', 24.99, 200, 2),
  ('Denim Jeans', 'Classic fit denim jeans', 59.99, 150, 2),
  ('Running Shoes', 'Lightweight running sneakers', 89.99, 120, 5),
  ('Yoga Mat', 'Non-slip exercise mat', 29.99, 80, 5),
  ('JavaScript Guide', 'Comprehensive JS programming book', 39.99, 60, 3),
  ('Garden Tools Set', '5-piece garden tool collection', 49.99, 40, 4),
  ('LED Desk Lamp', 'Adjustable LED desk lamp', 34.99, 90, 1);

INSERT INTO orders (user_id, total, status) VALUES
  (1, 1499.98, 'completed'),
  (2, 89.98, 'completed'),
  (3, 299.99, 'pending'),
  (1, 59.99, 'completed'),
  (4, 1299.99, 'processing');

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
  (1, 1, 1, 1299.99),
  (1, 2, 1, 199.99),
  (2, 4, 2, 24.99),
  (2, 5, 1, 59.99),
  (3, 3, 1, 299.99),
  (4, 5, 1, 59.99),
  (5, 1, 1, 1299.99);
`.trim(),
		},
	},
};
