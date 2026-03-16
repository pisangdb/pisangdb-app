-- Seed built-in templates for PisangDB
-- These templates provide starting schemas for common use cases

-- E-commerce template for PostgreSQL
INSERT INTO templates (id, name, description, engine, ddl_sql, seed_sql, is_builtin, created_at)
VALUES 
('00000000-0000-0000-0000-000000000001', 'E-commerce', 'Users, products, categories, orders, and order items for a basic e-commerce store', 'postgresql', 
-- DDL
$$CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    category_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT ''pending'',
    total_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);$$,
-- Seed
$$INSERT INTO categories (name, description) VALUES 
(''Electronics'', ''Electronic devices and gadgets''),
(''Clothing'', ''Apparel and fashion items''),
(''Books'', ''Physical and digital books'');

INSERT INTO products (name, description, price, stock, category_id) VALUES
(''Laptop Pro'', ''High-performance laptop for professionals'', 1299.99, 50, 1),
(''Wireless Mouse'', ''Ergonomic wireless mouse'', 29.99, 200, 1),
(''T-Shirt Classic'', ''Cotton t-shirt in multiple colors'', 19.99, 500, 2),
(''JavaScript Guide'', ''Complete guide to JavaScript'', 39.99, 100, 3);

INSERT INTO users (name, email, password_hash) VALUES
(''John Doe'', ''john@example.com'', ''$2b$10$example''),
(''Jane Smith'', ''jane@example.com'', ''$2b$10$example'');

INSERT INTO orders (user_id, status, total_amount) VALUES
(1, ''pending'', 1329.98),
(2, ''completed'', 59.98);

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 1, 1, 1299.99),
(1, 2, 1, 29.99),
(2, 3, 2, 19.99),
(2, 4, 1, 39.99);$$,
true, now()),

-- Blog template for PostgreSQL
('00000000-0000-0000-0000-000000000002', 'Blog', 'Users, posts, comments, and tags for a blogging platform', 'postgresql',
$$CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER REFERENCES users(id),
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    post_id INTEGER REFERENCES posts(id),
    author_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_tags (
    post_id INTEGER REFERENCES posts(id),
    tag_id INTEGER REFERENCES tags(id),
    PRIMARY KEY (post_id, tag_id)
);$$,
$$INSERT INTO users (name, email, bio) VALUES
(''Alice Writer'', ''alice@blog.com'', ''Tech enthusiast and writer''),
(''Bob Coder'', ''bob@blog.com'', ''Full-stack developer'');

INSERT INTO posts (title, content, author_id) VALUES
(''Getting Started with PostgreSQL'', ''PostgreSQL is a powerful, open source object-relational database system...'', 1),
(''Understanding TypeScript'', ''TypeScript adds static typing to JavaScript...'', 2);

INSERT INTO comments (content, post_id, author_id) VALUES
(''Great article!'', 1, 2),
(''Very helpful, thanks!'', 2, 1);

INSERT INTO tags (name) VALUES (''database''), (''typescript''), (''programming''), (''tutorial'');

INSERT INTO post_tags (post_id, tag_id) VALUES (1, 1), (1, 4), (2, 2), (2, 3), (2, 4);$$,
true, now()),

-- Inventory template for PostgreSQL
('00000000-0000-0000-0000-000000000003', 'Inventory', 'Warehouses, products, and stock movements for inventory management', 'postgresql',
$$CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    quantity INTEGER NOT NULL,
    movement_type VARCHAR(20) NOT NULL, -- ''in'' or ''out''
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);$$,
$$INSERT INTO warehouses (name, location) VALUES
(''Main Warehouse'', ''Jakarta, Indonesia''),
(''Distribution Center'', ''Surabaya, Indonesia'');

INSERT INTO products (sku, name, description) VALUES
(''SKU-001'', ''Wireless Keyboard'', ''Mechanical keyboard with RGB lighting''),
(''SKU-002'', ''USB-C Hub'', ''7-in-1 USB-C hub adapter''),
(''SKU-003'', ''Monitor Stand'', ''Ergonomic monitor stand with storage'');

INSERT INTO stock_movements (product_id, warehouse_id, quantity, movement_type, notes) VALUES
(1, 1, 100, ''in'', ''Initial stock''),
(1, 1, -20, ''out'', ''Sold to customer''),
(2, 1, 50, ''in'', ''Received from supplier''),
(2, 2, 30, ''in'', ''Transferred to distribution''),
(3, 1, 75, ''in'', ''Initial stock'');$$,
true, now());

-- MySQL templates (same structure, MySQL syntax)
INSERT INTO templates (id, name, description, engine, ddl_sql, seed_sql, is_builtin, created_at)
VALUES 
('00000000-0000-0000-0000-000000000011', 'E-commerce', 'Users, products, categories, orders, and order items for a basic e-commerce store', 'mysql',
-- DDL MySQL
'CREATE TABLE categories (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE products (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, price DECIMAL(10,2) NOT NULL, stock INT DEFAULT 0, category_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (category_id) REFERENCES categories(id)); CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE orders (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, status VARCHAR(50) DEFAULT ''pending'', total_amount DECIMAL(10,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id)); CREATE TABLE order_items (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT, product_id INT, quantity INT NOT NULL, price DECIMAL(10,2) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (product_id) REFERENCES products(id));',
-- Seed MySQL
'INSERT INTO categories (name, description) VALUES (''Electronics'', ''Electronic devices''), (''Clothing'', ''Apparel''), (''Books'', ''Books''); INSERT INTO products (name, description, price, stock, category_id) VALUES (''Laptop Pro'', ''Professional laptop'', 1299.99, 50, 1), (''Wireless Mouse'', ''Ergonomic mouse'', 29.99, 200, 1), (''T-Shirt'', ''Cotton t-shirt'', 19.99, 500, 2), (''JS Guide'', ''JavaScript book'', 39.99, 100, 3); INSERT INTO users (name, email, password_hash) VALUES (''John'', ''john@example.com'', ''hash''), (''Jane'', ''jane@example.com'', ''hash''); INSERT INTO orders (user_id, status, total_amount) VALUES (1, ''pending'', 1329.98), (2, ''completed'', 59.98); INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (1, 1, 1, 1299.99), (1, 2, 1, 29.99), (2, 3, 2, 19.99), (2, 4, 1, 39.99);',
true, now()),

('00000000-0000-0000-0000-000000000012', 'Blog', 'Users, posts, comments, and tags for a blogging platform', 'mysql',
'CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, bio TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE posts (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, content TEXT NOT NULL, author_id INT, published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (author_id) REFERENCES users(id)); CREATE TABLE comments (id INT AUTO_INCREMENT PRIMARY KEY, content TEXT NOT NULL, post_id INT, author_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (post_id) REFERENCES posts(id), FOREIGN KEY (author_id) REFERENCES users(id)); CREATE TABLE tags (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50) UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE post_tags (post_id INT, tag_id INT, PRIMARY KEY (post_id, tag_id), FOREIGN KEY (post_id) REFERENCES posts(id), FOREIGN KEY (tag_id) REFERENCES tags(id));',
'INSERT INTO users (name, email, bio) VALUES (''Alice'', ''alice@blog.com'', ''Writer''), (''Bob'', ''bob@blog.com'', ''Developer''); INSERT INTO posts (title, content, author_id) VALUES (''Getting Started'', ''PostgreSQL intro...'', 1), (''TypeScript Guide'', ''TypeScript tutorial...'', 2); INSERT INTO comments (content, post_id, author_id) VALUES (''Great!'', 1, 2), (''Thanks!'', 2, 1); INSERT INTO tags (name) VALUES (''database''), (''typescript''), (''programming''); INSERT INTO post_tags (post_id, tag_id) VALUES (1, 1), (2, 2);',
true, now()),

('00000000-0000-0000-0000-000000000013', 'Inventory', 'Warehouses, products, and stock movements for inventory management', 'mysql',
'CREATE TABLE warehouses (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, location VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE products (id INT AUTO_INCREMENT PRIMARY KEY, sku VARCHAR(50) UNIQUE NOT NULL, name VARCHAR(255) NOT NULL, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE stock_movements (id INT AUTO_INCREMENT PRIMARY KEY, product_id INT, warehouse_id INT, quantity INT NOT NULL, movement_type VARCHAR(20) NOT NULL, notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (product_id) REFERENCES products(id), FOREIGN KEY (warehouse_id) REFERENCES warehouses(id));',
'INSERT INTO warehouses (name, location) VALUES (''Main WH'', ''Jakarta''), (''Dist Center'', ''Surabaya''); INSERT INTO products (sku, name, description) VALUES (''SKU-001'', ''Keyboard'', ''Wireless keyboard''), (''SKU-002'', ''USB Hub'', ''USB-C hub''), (''SKU-003'', ''Monitor Stand'', ''Ergonomic stand''); INSERT INTO stock_movements (product_id, warehouse_id, quantity, movement_type, notes) VALUES (1, 1, 100, ''in'', ''Initial''), (1, 1, -20, ''out'', ''Sold''), (2, 1, 50, ''in'', ''Received'');',
true, now());

-- MariaDB templates (MySQL compatible)
INSERT INTO templates (id, name, description, engine, ddl_sql, seed_sql, is_builtin, created_at)
VALUES 
('00000000-0000-0000-0000-000000000021', 'E-commerce', 'Users, products, categories, orders, and order items', 'mariadb',
'CREATE TABLE categories (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE products (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, price DECIMAL(10,2) NOT NULL, stock INT DEFAULT 0, category_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (category_id) REFERENCES categories(id)); CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE orders (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, status VARCHAR(50) DEFAULT ''pending'', total_amount DECIMAL(10,2) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id)); CREATE TABLE order_items (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT, product_id INT, quantity INT NOT NULL, price DECIMAL(10,2) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (product_id) REFERENCES products(id));',
'INSERT INTO categories (name) VALUES (''Electronics''), (''Clothing''), (''Books''); INSERT INTO products (name, price, stock, category_id) VALUES (''Laptop'', 1299.99, 50, 1), (''Mouse'', 29.99, 200, 1), (''Shirt'', 19.99, 500, 2); INSERT INTO users (name, email) VALUES (''John'', ''john@test.com''), (''Jane'', ''jane@test.com''); INSERT INTO orders (user_id, total_amount) VALUES (1, 1329.98); INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (1, 1, 1, 1299.99), (1, 2, 1, 29.99);',
true, now()),

('00000000-0000-0000-0000-000000000022', 'Blog', 'Users, posts, comments, and tags', 'mariadb',
'CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), email VARCHAR(255), bio TEXT); CREATE TABLE posts (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), content TEXT, author_id INT); CREATE TABLE comments (id INT AUTO_INCREMENT PRIMARY KEY, content TEXT, post_id INT, author_id INT); CREATE TABLE tags (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50)); CREATE TABLE post_tags (post_id INT, tag_id INT, PRIMARY KEY (post_id, tag_id));',
'INSERT INTO users (name, email) VALUES (''Alice'', ''alice@test.com''), (''Bob'', ''bob@test.com''); INSERT INTO posts (title, content, author_id) VALUES (''Hello'', ''First post'', 1), (''World'', ''Second post'', 2); INSERT INTO comments (content, post_id, author_id) VALUES (''Nice!'', 1, 2); INSERT INTO tags (name) VALUES (''tech''), (''news'');',
true, now()),

('00000000-0000-0000-0000-000000000023', 'Inventory', 'Warehouses, products, and stock movements', 'mariadb',
'CREATE TABLE warehouses (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), location VARCHAR(255)); CREATE TABLE products (id INT AUTO_INCREMENT PRIMARY KEY, sku VARCHAR(50), name VARCHAR(255)); CREATE TABLE stock_movements (id INT AUTO_INCREMENT PRIMARY KEY, product_id INT, warehouse_id INT, quantity INT, movement_type VARCHAR(20));',
'INSERT INTO warehouses (name, location) VALUES (''Main'', ''Jakarta''); INSERT INTO products (sku, name) VALUES (''SKU1'', ''Product A''), (''SKU2'', ''Product B''); INSERT INTO stock_movements (product_id, warehouse_id, quantity, movement_type) VALUES (1, 1, 100, ''in'');',
true, now());
