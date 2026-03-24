import type { TemplateDefinition } from "./index";

export const BLOG_TEMPLATE: TemplateDefinition = {
	name: "Blog",
	description: "Users, posts, comments, tags, post_tags",
	variants: {
		postgresql: {
			ddl: `
-- Blog Schema for PostgreSQL
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER REFERENCES users(id),
  author_name VARCHAR(100),
  author_email VARCHAR(255),
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_user ON comments(user_id);
`.trim(),
			seed: `
-- Blog Seed Data for PostgreSQL
INSERT INTO users (name, email, bio) VALUES
  ('Alice Writer', 'alice@blog.com', 'Tech enthusiast and software developer'),
  ('Bob Author', 'bob@blog.com', 'Travel blogger and photographer'),
  ('Carol Editor', 'carol@blog.com', 'Content strategist and editor'),
  ('David Guest', 'david@blog.com', 'Freelance writer'),
  ('Eve Reader', 'eve@blog.com', 'Book lover and reviewer');

INSERT INTO tags (name, slug) VALUES
  ('Technology', 'technology'),
  ('Travel', 'travel'),
  ('Programming', 'programming'),
  ('Lifestyle', 'lifestyle'),
  ('Books', 'books'),
  ('Photography', 'photography');

INSERT INTO posts (title, slug, content, excerpt, author_id, status, published_at) VALUES
  ('Getting Started with TypeScript', 'getting-started-typescript', 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. In this post, we will explore the basics...', 'Learn TypeScript from scratch', 1, 'published', NOW() - INTERVAL '5 days'),
  ('My Trip to Bali', 'trip-to-bali', 'Last month I had the opportunity to visit Bali, Indonesia. The beautiful beaches and temples were breathtaking...', 'Adventures in paradise', 2, 'published', NOW() - INTERVAL '3 days'),
  ('Building REST APIs with Node.js', 'building-rest-apis-nodejs', 'REST APIs are the backbone of modern web applications. Lets learn how to build robust APIs using Node.js and Express...', 'A comprehensive guide', 1, 'published', NOW() - INTERVAL '2 days'),
  ('Best Books of 2026', 'best-books-2026', 'Here are my top picks for the best books published this year. From fiction to non-fiction, there is something for everyone...', 'Reading recommendations', 5, 'published', NOW() - INTERVAL '1 day'),
  ('Photography Tips for Beginners', 'photography-tips-beginners', 'Want to take better photos? Here are 10 essential tips that will immediately improve your photography skills...', 'Improve your shots', 2, 'draft', NULL);

INSERT INTO post_tags (post_id, tag_id) VALUES
  (1, 1), (1, 3),
  (2, 2), (2, 6),
  (3, 1), (3, 3),
  (4, 5),
  (5, 6), (5, 4);

INSERT INTO comments (post_id, user_id, content, status) VALUES
  (1, 3, 'Great introduction! Very helpful for beginners.', 'approved'),
  (1, 4, 'Would love to see a follow-up on advanced types.', 'approved'),
  (2, NULL, 'Bali is on my bucket list! Thanks for sharing.', 'approved'),
  (2, 1, 'The photos look amazing!', 'approved'),
  (3, 5, 'This helped me understand REST much better.', 'approved'),
  (4, NULL, 'Adding these to my reading list!', 'pending');
`.trim(),
		},
		mysql: {
			ddl: `
-- Blog Schema for MySQL
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  bio TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_posts_author (author_id),
  KEY idx_posts_status (status),
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT,
  author_name VARCHAR(100),
  author_email VARCHAR(255),
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_comments_post (post_id),
  KEY idx_comments_user (user_id),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id),
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE post_tags (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`.trim(),
			seed: `
-- Blog Seed Data for MySQL
INSERT INTO users (name, email, bio) VALUES
  ('Alice Writer', 'alice@blog.com', 'Tech enthusiast and software developer'),
  ('Bob Author', 'bob@blog.com', 'Travel blogger and photographer'),
  ('Carol Editor', 'carol@blog.com', 'Content strategist and editor'),
  ('David Guest', 'david@blog.com', 'Freelance writer'),
  ('Eve Reader', 'eve@blog.com', 'Book lover and reviewer');

INSERT INTO tags (name, slug) VALUES
  ('Technology', 'technology'),
  ('Travel', 'travel'),
  ('Programming', 'programming'),
  ('Lifestyle', 'lifestyle'),
  ('Books', 'books'),
  ('Photography', 'photography');

INSERT INTO posts (title, slug, content, excerpt, author_id, status, published_at) VALUES
  ('Getting Started with TypeScript', 'getting-started-typescript', 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. In this post, we will explore the basics...', 'Learn TypeScript from scratch', 1, 'published', DATE_SUB(NOW(), INTERVAL 5 DAY)),
  ('My Trip to Bali', 'trip-to-bali', 'Last month I had the opportunity to visit Bali, Indonesia. The beautiful beaches and temples were breathtaking...', 'Adventures in paradise', 2, 'published', DATE_SUB(NOW(), INTERVAL 3 DAY)),
  ('Building REST APIs with Node.js', 'building-rest-apis-nodejs', 'REST APIs are the backbone of modern web applications. Lets learn how to build robust APIs using Node.js and Express...', 'A comprehensive guide', 1, 'published', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  ('Best Books of 2026', 'best-books-2026', 'Here are my top picks for the best books published this year. From fiction to non-fiction, there is something for everyone...', 'Reading recommendations', 5, 'published', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  ('Photography Tips for Beginners', 'photography-tips-beginners', 'Want to take better photos? Here are 10 essential tips that will immediately improve your photography skills...', 'Improve your shots', 2, 'draft', NULL);

INSERT INTO post_tags (post_id, tag_id) VALUES
  (1, 1), (1, 3),
  (2, 2), (2, 6),
  (3, 1), (3, 3),
  (4, 5),
  (5, 6), (5, 4);

INSERT INTO comments (post_id, user_id, content, status) VALUES
  (1, 3, 'Great introduction! Very helpful for beginners.', 'approved'),
  (1, 4, 'Would love to see a follow-up on advanced types.', 'approved'),
  (2, NULL, 'Bali is on my bucket list! Thanks for sharing.', 'approved'),
  (2, 1, 'The photos look amazing!', 'approved'),
  (3, 5, 'This helped me understand REST much better.', 'approved'),
  (4, NULL, 'Adding these to my reading list!', 'pending');
`.trim(),
		},
		mariadb: {
			ddl: `
-- Blog Schema for MariaDB
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  bio TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_posts_author (author_id),
  KEY idx_posts_status (status),
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT,
  author_name VARCHAR(100),
  author_email VARCHAR(255),
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_comments_post (post_id),
  KEY idx_comments_user (user_id),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id),
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE post_tags (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`.trim(),
			seed: `
-- Blog Seed Data for MariaDB
INSERT INTO users (name, email, bio) VALUES
  ('Alice Writer', 'alice@blog.com', 'Tech enthusiast and software developer'),
  ('Bob Author', 'bob@blog.com', 'Travel blogger and photographer'),
  ('Carol Editor', 'carol@blog.com', 'Content strategist and editor'),
  ('David Guest', 'david@blog.com', 'Freelance writer'),
  ('Eve Reader', 'eve@blog.com', 'Book lover and reviewer');

INSERT INTO tags (name, slug) VALUES
  ('Technology', 'technology'),
  ('Travel', 'travel'),
  ('Programming', 'programming'),
  ('Lifestyle', 'lifestyle'),
  ('Books', 'books'),
  ('Photography', 'photography');

INSERT INTO posts (title, slug, content, excerpt, author_id, status, published_at) VALUES
  ('Getting Started with TypeScript', 'getting-started-typescript', 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. In this post, we will explore the basics...', 'Learn TypeScript from scratch', 1, 'published', DATE_SUB(NOW(), INTERVAL 5 DAY)),
  ('My Trip to Bali', 'trip-to-bali', 'Last month I had the opportunity to visit Bali, Indonesia. The beautiful beaches and temples were breathtaking...', 'Adventures in paradise', 2, 'published', DATE_SUB(NOW(), INTERVAL 3 DAY)),
  ('Building REST APIs with Node.js', 'building-rest-apis-nodejs', 'REST APIs are the backbone of modern web applications. Lets learn how to build robust APIs using Node.js and Express...', 'A comprehensive guide', 1, 'published', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  ('Best Books of 2026', 'best-books-2026', 'Here are my top picks for the best books published this year. From fiction to non-fiction, there is something for everyone...', 'Reading recommendations', 5, 'published', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  ('Photography Tips for Beginners', 'photography-tips-beginners', 'Want to take better photos? Here are 10 essential tips that will immediately improve your photography skills...', 'Improve your shots', 2, 'draft', NULL);

INSERT INTO post_tags (post_id, tag_id) VALUES
  (1, 1), (1, 3),
  (2, 2), (2, 6),
  (3, 1), (3, 3),
  (4, 5),
  (5, 6), (5, 4);

INSERT INTO comments (post_id, user_id, content, status) VALUES
  (1, 3, 'Great introduction! Very helpful for beginners.', 'approved'),
  (1, 4, 'Would love to see a follow-up on advanced types.', 'approved'),
  (2, NULL, 'Bali is on my bucket list! Thanks for sharing.', 'approved'),
  (2, 1, 'The photos look amazing!', 'approved'),
  (3, 5, 'This helped me understand REST much better.', 'approved'),
  (4, NULL, 'Adding these to my reading list!', 'pending');
`.trim(),
		},
	},
};
