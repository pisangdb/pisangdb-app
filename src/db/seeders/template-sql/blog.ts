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
  ('David Guest', 'david@blog.com', 'Freelance writer and speaker'),
  ('Eve Reader', 'eve@blog.com', 'Book lover and reviewer'),
  ('Frank Tech', 'frank@blog.com', 'AI and machine learning researcher'),
  ('Grace Design', 'grace@blog.com', 'UX designer and design systems advocate'),
  ('Henry Finance', 'henry@blog.com', 'Personal finance blogger'),
  ('Ivy Food', 'ivy@blog.com', 'Home cook and recipe developer'),
  ('Jack Fitness', 'jack@blog.com', 'Personal trainer and wellness coach');

INSERT INTO tags (name, slug) VALUES
  ('Technology', 'technology'),
  ('Travel', 'travel'),
  ('Programming', 'programming'),
  ('Lifestyle', 'lifestyle'),
  ('Books', 'books'),
  ('Photography', 'photography'),
  ('AI & ML', 'ai-ml'),
  ('Design', 'design'),
  ('Finance', 'finance'),
  ('Health', 'health');

INSERT INTO posts (title, slug, content, excerpt, author_id, status, published_at) VALUES
  ('Getting Started with TypeScript', 'getting-started-typescript', 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. In this comprehensive guide, we will explore TypeScript fundamentals including interfaces, types, generics, and how it transforms your development workflow.', 'Learn TypeScript from scratch', 1, 'published', NOW() - INTERVAL '15 days'),
  ('My Trip to Bali', 'trip-to-bali', 'Last month I had the opportunity to visit Bali, Indonesia. The beautiful beaches and ancient temples were breathtaking. Here is my complete travel guide including best spots, local food recommendations, and cultural experiences.', 'Adventures in paradise', 2, 'published', NOW() - INTERVAL '12 days'),
  ('Building REST APIs with Node.js', 'building-rest-apis-nodejs', 'REST APIs are the backbone of modern web applications. Lets learn how to build robust APIs using Node.js, Express, proper authentication, validation, and documentation practices.', 'A comprehensive guide', 1, 'published', NOW() - INTERVAL '10 days'),
  ('Best Books of 2026', 'best-books-2026', 'Here are my top picks for the best books published this year. From fiction to non-fiction, there is something for everyone including business, self-improvement, and creative writing.', 'Reading recommendations', 5, 'published', NOW() - INTERVAL '8 days'),
  ('Photography Tips for Beginners', 'photography-tips-beginners', 'Want to take better photos? Here are 10 essential tips that will immediately improve your photography skills without needing expensive equipment.', 'Improve your shots', 2, 'published', NOW() - INTERVAL '5 days'),
  ('Introduction to Machine Learning', 'intro-machine-learning', 'Machine learning is transforming how we build software. This beginner-friendly introduction covers the fundamentals of ML including supervised learning, neural networks, and practical applications.', 'Start your ML journey', 6, 'published', NOW() - INTERVAL '18 days'),
  ('Designing Accessible User Interfaces', 'designing-accessible-ui', 'Accessibility should never be an afterthought. Learn how to design inclusive interfaces that work for everyone, including users with disabilities, using WCAG guidelines.', 'Build inclusive designs', 7, 'published', NOW() - INTERVAL '7 days'),
  ('Personal Finance for Freelancers', 'freelancer-finance-guide', 'Managing money as a freelancer comes with unique challenges. Here are strategies for budgeting, saving, taxes, and investing as a self-employed professional.', 'Money tips for freelancers', 8, 'published', NOW() - INTERVAL '4 days'),
  ('Homemade Pasta from Scratch', 'homemade-pasta-guide', 'Making pasta at home is easier than you think. This step-by-step guide will teach you how to create fresh, delicious pasta without any special equipment.', 'Fresh pasta made easy', 9, 'published', NOW() - INTERVAL '2 days'),
  ('Creating a Home Workout Routine', 'home-workout-routine', 'Staying fit at home is possible with the right plan. This guide covers exercises, scheduling, nutrition, and motivation strategies for building a sustainable home workout habit.', 'Fitness at home', 10, 'draft', NULL);

INSERT INTO post_tags (post_id, tag_id) VALUES
  (1, 1), (1, 3),
  (2, 2), (2, 4),
  (3, 1), (3, 3),
  (4, 4), (4, 5),
  (5, 2), (5, 4), (5, 6),
  (6, 1), (6, 7),
  (7, 8), (7, 1),
  (8, 9), (8, 4),
  (9, 10), (9, 4),
  (10, 10), (10, 4);

INSERT INTO comments (post_id, user_id, content, status) VALUES
  (1, 3, 'Great introduction! Very helpful for beginners.', 'approved'),
  (1, 4, 'Would love to see a follow-up on advanced types.', 'approved'),
  (1, 5, 'This helped me understand REST much better.', 'approved'),
  (2, 1, 'Bali is on my bucket list! Thanks for sharing.', 'approved'),
  (2, 6, 'The photos look amazing!', 'approved'),
  (2, 7, 'Great tips for travel photography.', 'approved'),
  (3, 4, 'Finally a clear explanation of REST APIs!', 'approved'),
  (3, 5, 'Could you write more about authentication?', 'approved'),
  (3, 8, 'This is exactly what I needed for my project.', 'approved'),
  (4, 2, 'Adding these books to my reading list.', 'approved'),
  (4, 6, 'The Finance books section is particularly good.', 'approved'),
  (5, 3, 'These photography tips are practical and effective.', 'approved'),
  (5, 8, 'I improved my photos immediately after trying these tips.', 'approved'),
  (6, 1, 'Machine learning explained clearly for beginners.', 'approved'),
  (6, 4, 'Would love to see a follow-up on neural networks.', 'approved'),
  (6, 9, 'The examples really helped me understand the concepts.', 'approved'),
  (7, 3, 'Accessibility is so important. Thanks for covering this.', 'approved'),
  (7, 10, 'Great reminder about inclusive design practices.', 'approved'),
  (8, 7, 'As a freelancer, this resonates so much!', 'approved'),
  (9, 5, 'Made the pasta yesterday. Turned out perfect!', 'approved');
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
  ('David Guest', 'david@blog.com', 'Freelance writer and speaker'),
  ('Eve Reader', 'eve@blog.com', 'Book lover and reviewer'),
  ('Frank Tech', 'frank@blog.com', 'AI and machine learning researcher'),
  ('Grace Design', 'grace@blog.com', 'UX designer and design systems advocate'),
  ('Henry Finance', 'henry@blog.com', 'Personal finance blogger'),
  ('Ivy Food', 'ivy@blog.com', 'Home cook and recipe developer'),
  ('Jack Fitness', 'jack@blog.com', 'Personal trainer and wellness coach');

INSERT INTO tags (name, slug) VALUES
  ('Technology', 'technology'),
  ('Travel', 'travel'),
  ('Programming', 'programming'),
  ('Lifestyle', 'lifestyle'),
  ('Books', 'books'),
  ('Photography', 'photography'),
  ('AI & ML', 'ai-ml'),
  ('Design', 'design'),
  ('Finance', 'finance'),
  ('Health', 'health');

INSERT INTO posts (title, slug, content, excerpt, author_id, status, published_at) VALUES
  ('Getting Started with TypeScript', 'getting-started-typescript', 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. In this comprehensive guide, we will explore TypeScript fundamentals including interfaces, types, generics, and how it transforms your development workflow.', 'Learn TypeScript from scratch', 1, 'published', DATE_SUB(NOW(), INTERVAL 15 DAY)),
  ('My Trip to Bali', 'trip-to-bali', 'Last month I had the opportunity to visit Bali, Indonesia. The beautiful beaches and ancient temples were breathtaking. Here is my complete travel guide including best spots, local food recommendations, and cultural experiences.', 'Adventures in paradise', 2, 'published', DATE_SUB(NOW(), INTERVAL 12 DAY)),
  ('Building REST APIs with Node.js', 'building-rest-apis-nodejs', 'REST APIs are the backbone of modern web applications. Lets learn how to build robust APIs using Node.js, Express, proper authentication, validation, and documentation practices.', 'A comprehensive guide', 1, 'published', DATE_SUB(NOW(), INTERVAL 10 DAY)),
  ('Best Books of 2026', 'best-books-2026', 'Here are my top picks for the best books published this year. From fiction to non-fiction, there is something for everyone including business, self-improvement, and creative writing.', 'Reading recommendations', 5, 'published', DATE_SUB(NOW(), INTERVAL 8 DAY)),
  ('Photography Tips for Beginners', 'photography-tips-beginners', 'Want to take better photos? Here are 10 essential tips that will immediately improve your photography skills without needing expensive equipment.', 'Improve your shots', 2, 'published', DATE_SUB(NOW(), INTERVAL 5 DAY)),
  ('Introduction to Machine Learning', 'intro-machine-learning', 'Machine learning is transforming how we build software. This beginner-friendly introduction covers the fundamentals of ML including supervised learning, neural networks, and practical applications.', 'Start your ML journey', 6, 'published', DATE_SUB(NOW(), INTERVAL 18 DAY)),
  ('Designing Accessible User Interfaces', 'designing-accessible-ui', 'Accessibility should never be an afterthought. Learn how to design inclusive interfaces that work for everyone, including users with disabilities, using WCAG guidelines.', 'Build inclusive designs', 7, 'published', DATE_SUB(NOW(), INTERVAL 7 DAY)),
  ('Personal Finance for Freelancers', 'freelancer-finance-guide', 'Managing money as a freelancer comes with unique challenges. Here are strategies for budgeting, saving, taxes, and investing as a self-employed professional.', 'Money tips for freelancers', 8, 'published', DATE_SUB(NOW(), INTERVAL 4 DAY)),
  ('Homemade Pasta from Scratch', 'homemade-pasta-guide', 'Making pasta at home is easier than you think. This step-by-step guide will teach you how to create fresh, delicious pasta without any special equipment.', 'Fresh pasta made easy', 9, 'published', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  ('Creating a Home Workout Routine', 'home-workout-routine', 'Staying fit at home is possible with the right plan. This guide covers exercises, scheduling, nutrition, and motivation strategies for building a sustainable home workout habit.', 'Fitness at home', 10, 'draft', NULL);

INSERT INTO post_tags (post_id, tag_id) VALUES
  (1, 1), (1, 3),
  (2, 2), (2, 4),
  (3, 1), (3, 3),
  (4, 4), (4, 5),
  (5, 2), (5, 4), (5, 6),
  (6, 1), (6, 7),
  (7, 8), (7, 1),
  (8, 9), (8, 4),
  (9, 10), (9, 4),
  (10, 10), (10, 4);

INSERT INTO comments (post_id, user_id, content, status) VALUES
  (1, 3, 'Great introduction! Very helpful for beginners.', 'approved'),
  (1, 4, 'Would love to see a follow-up on advanced types.', 'approved'),
  (1, 5, 'This helped me understand REST much better.', 'approved'),
  (2, 1, 'Bali is on my bucket list! Thanks for sharing.', 'approved'),
  (2, 6, 'The photos look amazing!', 'approved'),
  (2, 7, 'Great tips for travel photography.', 'approved'),
  (3, 4, 'Finally a clear explanation of REST APIs!', 'approved'),
  (3, 5, 'Could you write more about authentication?', 'approved'),
  (3, 8, 'This is exactly what I needed for my project.', 'approved'),
  (4, 2, 'Adding these books to my reading list.', 'approved'),
  (4, 6, 'The Finance books section is particularly good.', 'approved'),
  (5, 3, 'These photography tips are practical and effective.', 'approved'),
  (5, 8, 'I improved my photos immediately after trying these tips.', 'approved'),
  (6, 1, 'Machine learning explained clearly for beginners.', 'approved'),
  (6, 4, 'Would love to see a follow-up on neural networks.', 'approved'),
  (6, 9, 'The examples really helped me understand the concepts.', 'approved'),
  (7, 3, 'Accessibility is so important. Thanks for covering this.', 'approved'),
  (7, 10, 'Great reminder about inclusive design practices.', 'approved'),
  (8, 7, 'As a freelancer, this resonates so much!', 'approved'),
  (9, 5, 'Made the pasta yesterday. Turned out perfect!', 'approved');
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
  ('David Guest', 'david@blog.com', 'Freelance writer and speaker'),
  ('Eve Reader', 'eve@blog.com', 'Book lover and reviewer'),
  ('Frank Tech', 'frank@blog.com', 'AI and machine learning researcher'),
  ('Grace Design', 'grace@blog.com', 'UX designer and design systems advocate'),
  ('Henry Finance', 'henry@blog.com', 'Personal finance blogger'),
  ('Ivy Food', 'ivy@blog.com', 'Home cook and recipe developer'),
  ('Jack Fitness', 'jack@blog.com', 'Personal trainer and wellness coach');

INSERT INTO tags (name, slug) VALUES
  ('Technology', 'technology'),
  ('Travel', 'travel'),
  ('Programming', 'programming'),
  ('Lifestyle', 'lifestyle'),
  ('Books', 'books'),
  ('Photography', 'photography'),
  ('AI & ML', 'ai-ml'),
  ('Design', 'design'),
  ('Finance', 'finance'),
  ('Health', 'health');

INSERT INTO posts (title, slug, content, excerpt, author_id, status, published_at) VALUES
  ('Getting Started with TypeScript', 'getting-started-typescript', 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. In this comprehensive guide, we will explore TypeScript fundamentals including interfaces, types, generics, and how it transforms your development workflow.', 'Learn TypeScript from scratch', 1, 'published', DATE_SUB(NOW(), INTERVAL 15 DAY)),
  ('My Trip to Bali', 'trip-to-bali', 'Last month I had the opportunity to visit Bali, Indonesia. The beautiful beaches and ancient temples were breathtaking. Here is my complete travel guide including best spots, local food recommendations, and cultural experiences.', 'Adventures in paradise', 2, 'published', DATE_SUB(NOW(), INTERVAL 12 DAY)),
  ('Building REST APIs with Node.js', 'building-rest-apis-nodejs', 'REST APIs are the backbone of modern web applications. Lets learn how to build robust APIs using Node.js, Express, proper authentication, validation, and documentation practices.', 'A comprehensive guide', 1, 'published', DATE_SUB(NOW(), INTERVAL 10 DAY)),
  ('Best Books of 2026', 'best-books-2026', 'Here are my top picks for the best books published this year. From fiction to non-fiction, there is something for everyone including business, self-improvement, and creative writing.', 'Reading recommendations', 5, 'published', DATE_SUB(NOW(), INTERVAL 8 DAY)),
  ('Photography Tips for Beginners', 'photography-tips-beginners', 'Want to take better photos? Here are 10 essential tips that will immediately improve your photography skills without needing expensive equipment.', 'Improve your shots', 2, 'published', DATE_SUB(NOW(), INTERVAL 5 DAY)),
  ('Introduction to Machine Learning', 'intro-machine-learning', 'Machine learning is transforming how we build software. This beginner-friendly introduction covers the fundamentals of ML including supervised learning, neural networks, and practical applications.', 'Start your ML journey', 6, 'published', DATE_SUB(NOW(), INTERVAL 18 DAY)),
  ('Designing Accessible User Interfaces', 'designing-accessible-ui', 'Accessibility should never be an afterthought. Learn how to design inclusive interfaces that work for everyone, including users with disabilities, using WCAG guidelines.', 'Build inclusive designs', 7, 'published', DATE_SUB(NOW(), INTERVAL 7 DAY)),
  ('Personal Finance for Freelancers', 'freelancer-finance-guide', 'Managing money as a freelancer comes with unique challenges. Here are strategies for budgeting, saving, taxes, and investing as a self-employed professional.', 'Money tips for freelancers', 8, 'published', DATE_SUB(NOW(), INTERVAL 4 DAY)),
  ('Homemade Pasta from Scratch', 'homemade-pasta-guide', 'Making pasta at home is easier than you think. This step-by-step guide will teach you how to create fresh, delicious pasta without any special equipment.', 'Fresh pasta made easy', 9, 'published', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  ('Creating a Home Workout Routine', 'home-workout-routine', 'Staying fit at home is possible with the right plan. This guide covers exercises, scheduling, nutrition, and motivation strategies for building a sustainable home workout habit.', 'Fitness at home', 10, 'draft', NULL);

INSERT INTO post_tags (post_id, tag_id) VALUES
  (1, 1), (1, 3),
  (2, 2), (2, 4),
  (3, 1), (3, 3),
  (4, 4), (4, 5),
  (5, 2), (5, 4), (5, 6),
  (6, 1), (6, 7),
  (7, 8), (7, 1),
  (8, 9), (8, 4),
  (9, 10), (9, 4),
  (10, 10), (10, 4);

INSERT INTO comments (post_id, user_id, content, status) VALUES
  (1, 3, 'Great introduction! Very helpful for beginners.', 'approved'),
  (1, 4, 'Would love to see a follow-up on advanced types.', 'approved'),
  (1, 5, 'This helped me understand REST much better.', 'approved'),
  (2, 1, 'Bali is on my bucket list! Thanks for sharing.', 'approved'),
  (2, 6, 'The photos look amazing!', 'approved'),
  (2, 7, 'Great tips for travel photography.', 'approved'),
  (3, 4, 'Finally a clear explanation of REST APIs!', 'approved'),
  (3, 5, 'Could you write more about authentication?', 'approved'),
  (3, 8, 'This is exactly what I needed for my project.', 'approved'),
  (4, 2, 'Adding these books to my reading list.', 'approved'),
  (4, 6, 'The Finance books section is particularly good.', 'approved'),
  (5, 3, 'These photography tips are practical and effective.', 'approved'),
  (5, 8, 'I improved my photos immediately after trying these tips.', 'approved'),
  (6, 1, 'Machine learning explained clearly for beginners.', 'approved'),
  (6, 4, 'Would love to see a follow-up on neural networks.', 'approved'),
  (6, 9, 'The examples really helped me understand the concepts.', 'approved'),
  (7, 3, 'Accessibility is so important. Thanks for covering this.', 'approved'),
  (7, 10, 'Great reminder about inclusive design practices.', 'approved'),
  (8, 7, 'As a freelancer, this resonates so much!', 'approved'),
  (9, 5, 'Made the pasta yesterday. Turned out perfect!', 'approved');
`.trim(),
		},
	},
};
