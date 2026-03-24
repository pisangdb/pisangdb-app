import type { TemplateDefinition } from "./index";

export const HR_TEMPLATE: TemplateDefinition = {
	name: "HR",
	description: "Employees, departments, positions, attendance",
	variants: {
		postgresql: {
			ddl: `
-- HR Schema for PostgreSQL
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  salary_range_min DECIMAL(10,2),
  salary_range_max DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  hire_date DATE NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  position_id INTEGER NOT NULL REFERENCES positions(id),
  salary DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status VARCHAR(20) NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_position ON employees(position_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
`.trim(),
			seed: `
-- HR Seed Data for PostgreSQL
INSERT INTO departments (name, description) VALUES
  ('Engineering', 'Software development and technical operations'),
  ('Marketing', 'Brand management and marketing campaigns'),
  ('Human Resources', 'Employee relations and talent acquisition'),
  ('Finance', 'Financial planning and accounting'),
  ('Operations', 'Day-to-day business operations');

INSERT INTO positions (title, department_id, salary_range_min, salary_range_max) VALUES
  ('Software Engineer', 1, 8000000, 15000000),
  ('Senior Software Engineer', 1, 15000000, 25000000),
  ('Tech Lead', 1, 25000000, 35000000),
  ('Marketing Manager', 2, 12000000, 20000000),
  ('Content Writer', 2, 6000000, 10000000),
  ('HR Manager', 3, 10000000, 18000000),
  ('Recruiter', 3, 7000000, 12000000),
  ('Accountant', 4, 8000000, 15000000),
  ('Finance Manager', 4, 15000000, 25000000),
  ('Operations Manager', 5, 12000000, 20000000);

INSERT INTO employees (name, email, phone, hire_date, department_id, position_id, salary, status) VALUES
  ('Ahmad Rizki', 'ahmad@company.com', '081234567890', '2023-01-15', 1, 3, 28000000, 'active'),
  ('Siti Nurhaliza', 'siti@company.com', '081234567891', '2023-03-01', 1, 2, 18000000, 'active'),
  ('Budi Santoso', 'budi@company.com', '081234567892', '2023-06-15', 1, 1, 12000000, 'active'),
  ('Dewi Lestari', 'dewi@company.com', '081234567893', '2022-11-01', 2, 4, 16000000, 'active'),
  ('Riko Pratama', 'riko@company.com', '081234567894', '2024-01-10', 2, 5, 8000000, 'active'),
  ('Maya Sari', 'maya@company.com', '081234567895', '2022-08-01', 3, 6, 14000000, 'active'),
  ('Fajar Nugroho', 'fajar@company.com', '081234567896', '2023-09-01', 3, 7, 9000000, 'active'),
  ('Lina Wati', 'lina@company.com', '081234567897', '2023-02-15', 4, 8, 11000000, 'active'),
  ('Hendra Wijaya', 'hendra@company.com', '081234567898', '2022-05-01', 4, 9, 20000000, 'active'),
  ('Putri Rahayu', 'putri@company.com', '081234567899', '2023-07-01', 5, 10, 15000000, 'active'),
  ('Andi Susanto', 'andi@company.com', '081234567800', '2024-02-01', 1, 1, 10000000, 'active'),
  ('Rina Marlina', 'rina@company.com', '081234567801', '2023-11-01', 1, 1, 11000000, 'active');

INSERT INTO attendance (employee_id, date, check_in, check_out, status, notes) VALUES
  (1, CURRENT_DATE, '08:30:00', '17:30:00', 'present', NULL),
  (2, CURRENT_DATE, '08:45:00', '17:00:00', 'present', NULL),
  (3, CURRENT_DATE, '09:00:00', '18:00:00', 'present', 'Worked late on project'),
  (4, CURRENT_DATE, '08:30:00', '17:30:00', 'present', NULL),
  (5, CURRENT_DATE, NULL, NULL, 'sick', 'Medical leave'),
  (6, CURRENT_DATE, '08:15:00', '17:15:00', 'present', NULL),
  (7, CURRENT_DATE, '08:50:00', '17:30:00', 'present', NULL),
  (8, CURRENT_DATE, '08:30:00', '17:00:00', 'present', NULL),
  (9, CURRENT_DATE, NULL, NULL, 'leave', 'Annual leave'),
  (10, CURRENT_DATE, '08:45:00', '17:45:00', 'present', NULL),
  (1, CURRENT_DATE - 1, '08:30:00', '17:30:00', 'present', NULL),
  (2, CURRENT_DATE - 1, '09:15:00', '17:30:00', 'late', 'Traffic delay'),
  (3, CURRENT_DATE - 1, '08:30:00', '17:30:00', 'present', NULL);
`.trim(),
		},
		mysql: {
			ddl: `
-- HR Schema for MySQL
CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  department_id INT NOT NULL,
  salary_range_min DECIMAL(10,2),
  salary_range_max DECIMAL(10,2),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_positions_department (department_id),
  CONSTRAINT fk_positions_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  hire_date DATE NOT NULL,
  department_id INT NOT NULL,
  position_id INT NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_employees_department (department_id),
  KEY idx_employees_position (position_id),
  KEY idx_employees_status (status),
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_employees_position FOREIGN KEY (position_id) REFERENCES positions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status VARCHAR(20) NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_attendance_employee_date (employee_id, date),
  KEY idx_attendance_employee (employee_id),
  KEY idx_attendance_date (date),
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`.trim(),
			seed: `
-- HR Seed Data for MySQL
INSERT INTO departments (name, description) VALUES
  ('Engineering', 'Software development and technical operations'),
  ('Marketing', 'Brand management and marketing campaigns'),
  ('Human Resources', 'Employee relations and talent acquisition'),
  ('Finance', 'Financial planning and accounting'),
  ('Operations', 'Day-to-day business operations');

INSERT INTO positions (title, department_id, salary_range_min, salary_range_max) VALUES
  ('Software Engineer', 1, 8000000, 15000000),
  ('Senior Software Engineer', 1, 15000000, 25000000),
  ('Tech Lead', 1, 25000000, 35000000),
  ('Marketing Manager', 2, 12000000, 20000000),
  ('Content Writer', 2, 6000000, 10000000),
  ('HR Manager', 3, 10000000, 18000000),
  ('Recruiter', 3, 7000000, 12000000),
  ('Accountant', 4, 8000000, 15000000),
  ('Finance Manager', 4, 15000000, 25000000),
  ('Operations Manager', 5, 12000000, 20000000);

INSERT INTO employees (name, email, phone, hire_date, department_id, position_id, salary, status) VALUES
  ('Ahmad Rizki', 'ahmad@company.com', '081234567890', '2023-01-15', 1, 3, 28000000, 'active'),
  ('Siti Nurhaliza', 'siti@company.com', '081234567891', '2023-03-01', 1, 2, 18000000, 'active'),
  ('Budi Santoso', 'budi@company.com', '081234567892', '2023-06-15', 1, 1, 12000000, 'active'),
  ('Dewi Lestari', 'dewi@company.com', '081234567893', '2022-11-01', 2, 4, 16000000, 'active'),
  ('Riko Pratama', 'riko@company.com', '081234567894', '2024-01-10', 2, 5, 8000000, 'active'),
  ('Maya Sari', 'maya@company.com', '081234567895', '2022-08-01', 3, 6, 14000000, 'active'),
  ('Fajar Nugroho', 'fajar@company.com', '081234567896', '2023-09-01', 3, 7, 9000000, 'active'),
  ('Lina Wati', 'lina@company.com', '081234567897', '2023-02-15', 4, 8, 11000000, 'active'),
  ('Hendra Wijaya', 'hendra@company.com', '081234567898', '2022-05-01', 4, 9, 20000000, 'active'),
  ('Putri Rahayu', 'putri@company.com', '081234567899', '2023-07-01', 5, 10, 15000000, 'active'),
  ('Andi Susanto', 'andi@company.com', '081234567800', '2024-02-01', 1, 1, 10000000, 'active'),
  ('Rina Marlina', 'rina@company.com', '081234567801', '2023-11-01', 1, 1, 11000000, 'active');

INSERT INTO attendance (employee_id, date, check_in, check_out, status, notes) VALUES
  (1, CURDATE(), '08:30:00', '17:30:00', 'present', NULL),
  (2, CURDATE(), '08:45:00', '17:00:00', 'present', NULL),
  (3, CURDATE(), '09:00:00', '18:00:00', 'present', 'Worked late on project'),
  (4, CURDATE(), '08:30:00', '17:30:00', 'present', NULL),
  (5, CURDATE(), NULL, NULL, 'sick', 'Medical leave'),
  (6, CURDATE(), '08:15:00', '17:15:00', 'present', NULL),
  (7, CURDATE(), '08:50:00', '17:30:00', 'present', NULL),
  (8, CURDATE(), '08:30:00', '17:00:00', 'present', NULL),
  (9, CURDATE(), NULL, NULL, 'leave', 'Annual leave'),
  (10, CURDATE(), '08:45:00', '17:45:00', 'present', NULL),
  (1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:30:00', '17:30:00', 'present', NULL),
  (2, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:15:00', '17:30:00', 'late', 'Traffic delay'),
  (3, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:30:00', '17:30:00', 'present', NULL);
`.trim(),
		},
		mariadb: {
			ddl: `
-- HR Schema for MariaDB
CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  department_id INT NOT NULL,
  salary_range_min DECIMAL(10,2),
  salary_range_max DECIMAL(10,2),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_positions_department (department_id),
  CONSTRAINT fk_positions_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  hire_date DATE NOT NULL,
  department_id INT NOT NULL,
  position_id INT NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_employees_department (department_id),
  KEY idx_employees_position (position_id),
  KEY idx_employees_status (status),
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_employees_position FOREIGN KEY (position_id) REFERENCES positions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status VARCHAR(20) NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_attendance_employee_date (employee_id, date),
  KEY idx_attendance_employee (employee_id),
  KEY idx_attendance_date (date),
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`.trim(),
			seed: `
-- HR Seed Data for MariaDB
INSERT INTO departments (name, description) VALUES
  ('Engineering', 'Software development and technical operations'),
  ('Marketing', 'Brand management and marketing campaigns'),
  ('Human Resources', 'Employee relations and talent acquisition'),
  ('Finance', 'Financial planning and accounting'),
  ('Operations', 'Day-to-day business operations');

INSERT INTO positions (title, department_id, salary_range_min, salary_range_max) VALUES
  ('Software Engineer', 1, 8000000, 15000000),
  ('Senior Software Engineer', 1, 15000000, 25000000),
  ('Tech Lead', 1, 25000000, 35000000),
  ('Marketing Manager', 2, 12000000, 20000000),
  ('Content Writer', 2, 6000000, 10000000),
  ('HR Manager', 3, 10000000, 18000000),
  ('Recruiter', 3, 7000000, 12000000),
  ('Accountant', 4, 8000000, 15000000),
  ('Finance Manager', 4, 15000000, 25000000),
  ('Operations Manager', 5, 12000000, 20000000);

INSERT INTO employees (name, email, phone, hire_date, department_id, position_id, salary, status) VALUES
  ('Ahmad Rizki', 'ahmad@company.com', '081234567890', '2023-01-15', 1, 3, 28000000, 'active'),
  ('Siti Nurhaliza', 'siti@company.com', '081234567891', '2023-03-01', 1, 2, 18000000, 'active'),
  ('Budi Santoso', 'budi@company.com', '081234567892', '2023-06-15', 1, 1, 12000000, 'active'),
  ('Dewi Lestari', 'dewi@company.com', '081234567893', '2022-11-01', 2, 4, 16000000, 'active'),
  ('Riko Pratama', 'riko@company.com', '081234567894', '2024-01-10', 2, 5, 8000000, 'active'),
  ('Maya Sari', 'maya@company.com', '081234567895', '2022-08-01', 3, 6, 14000000, 'active'),
  ('Fajar Nugroho', 'fajar@company.com', '081234567896', '2023-09-01', 3, 7, 9000000, 'active'),
  ('Lina Wati', 'lina@company.com', '081234567897', '2023-02-15', 4, 8, 11000000, 'active'),
  ('Hendra Wijaya', 'hendra@company.com', '081234567898', '2022-05-01', 4, 9, 20000000, 'active'),
  ('Putri Rahayu', 'putri@company.com', '081234567899', '2023-07-01', 5, 10, 15000000, 'active'),
  ('Andi Susanto', 'andi@company.com', '081234567800', '2024-02-01', 1, 1, 10000000, 'active'),
  ('Rina Marlina', 'rina@company.com', '081234567801', '2023-11-01', 1, 1, 11000000, 'active');

INSERT INTO attendance (employee_id, date, check_in, check_out, status, notes) VALUES
  (1, CURDATE(), '08:30:00', '17:30:00', 'present', NULL),
  (2, CURDATE(), '08:45:00', '17:00:00', 'present', NULL),
  (3, CURDATE(), '09:00:00', '18:00:00', 'present', 'Worked late on project'),
  (4, CURDATE(), '08:30:00', '17:30:00', 'present', NULL),
  (5, CURDATE(), NULL, NULL, 'sick', 'Medical leave'),
  (6, CURDATE(), '08:15:00', '17:15:00', 'present', NULL),
  (7, CURDATE(), '08:50:00', '17:30:00', 'present', NULL),
  (8, CURDATE(), '08:30:00', '17:00:00', 'present', NULL),
  (9, CURDATE(), NULL, NULL, 'leave', 'Annual leave'),
  (10, CURDATE(), '08:45:00', '17:45:00', 'present', NULL),
  (1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:30:00', '17:30:00', 'present', NULL),
  (2, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:15:00', '17:30:00', 'late', 'Traffic delay'),
  (3, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:30:00', '17:30:00', 'present', NULL);
`.trim(),
		},
	},
};
