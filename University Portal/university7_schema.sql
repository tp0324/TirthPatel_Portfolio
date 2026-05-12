

-- Drop tables (respecting dependencies)
DROP TABLE IF EXISTS Grade, Payment, Enrollment, Teaching, Section, Classroom, Course, Semester, Instructor, Student, BankAccount CASCADE;

-- ===========================================================
-- STUDENT
-- ===========================================================
CREATE TABLE Student (
  student_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  major VARCHAR(100),
  join_date DATE DEFAULT CURRENT_DATE
);

-- ===========================================================
-- INSTRUCTOR
-- ===========================================================
CREATE TABLE Instructor (
  instructor_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  department VARCHAR(100)
);

-- ===========================================================
-- COURSE
-- ===========================================================
CREATE TABLE Course (
  course_id SERIAL PRIMARY KEY,
  course_name VARCHAR(120) NOT NULL,
  credit_hours INT CHECK (credit_hours BETWEEN 1 AND 5),
  capacity INT DEFAULT 30
);

-- ===========================================================
-- SEMESTER
-- ===========================================================
CREATE TABLE Semester (
  semester_id SERIAL PRIMARY KEY,
  term VARCHAR(20) CHECK (term IN ('Spring','Summer','Fall')),
  year INT CHECK (year >= 2000),
  status VARCHAR(10) CHECK (status IN ('open','closed')) DEFAULT 'open'
);

-- ===========================================================
-- CLASSROOM
-- ===========================================================
CREATE TABLE Classroom (
  room_id SERIAL PRIMARY KEY,
  building VARCHAR(50),
  room_no VARCHAR(20),
  capacity INT
);

-- ===========================================================
-- SECTION (course offering in a semester & classroom)
-- Composite key: (course_id, semester_id)
-- ===========================================================
CREATE TABLE Section (
  section_id SERIAL PRIMARY KEY,
  course_id INT REFERENCES Course(course_id) ON DELETE CASCADE,
  semester_id INT REFERENCES Semester(semester_id) ON DELETE CASCADE,
  room_id INT REFERENCES Classroom(room_id) ON DELETE SET NULL,
  schedule VARCHAR(50),
  mode VARCHAR(20) CHECK (mode IN ('in-person','online','hybrid')),
  capacity INT DEFAULT 30,
  UNIQUE(course_id, semester_id)
);

-- ===========================================================
-- TEACHING (instructor teaches course in semester)
-- Composite key: (instructor_id, course_id, semester_id)
-- ===========================================================
CREATE TABLE Teaching (
  instructor_id INT REFERENCES Instructor(instructor_id) ON DELETE CASCADE,
  course_id INT REFERENCES Course(course_id) ON DELETE CASCADE,
  semester_id INT REFERENCES Semester(semester_id) ON DELETE CASCADE,
  PRIMARY KEY (instructor_id, course_id, semester_id)
);

-- ===========================================================
-- ENROLLMENT (student registers in section)
-- Composite key: (student_id, section_id)
-- ===========================================================
CREATE TABLE Enrollment (
  student_id INT REFERENCES Student(student_id) ON DELETE CASCADE,
  section_id INT REFERENCES Section(section_id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, section_id)
);

-- ===========================================================
-- PAYMENT (per student per semester)
-- Composite key: (student_id, semester_id, payment_time)
-- ===========================================================
CREATE TABLE Payment (
  student_id INT REFERENCES Student(student_id) ON DELETE CASCADE,
  semester_id INT REFERENCES Semester(semester_id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  payment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, semester_id, payment_time)
);

-- ===========================================================
-- GRADE (grade per student per section)
-- Composite key: (student_id, section_id)
-- ===========================================================
CREATE TABLE Grade (
  student_id INT REFERENCES Student(student_id) ON DELETE CASCADE,
  section_id INT REFERENCES Section(section_id) ON DELETE CASCADE,
  letter CHAR(1) CHECK (letter IN ('A','B','C','D','F')),
  PRIMARY KEY (student_id, section_id)
);

-- ===========================================================
-- BANK ACCOUNT (student & university accounts)
-- ===========================================================
CREATE TABLE BankAccount (
  account_id SERIAL PRIMARY KEY,
  student_id INT REFERENCES Student(student_id) ON DELETE CASCADE,
  balance NUMERIC(12,2) DEFAULT 0.00
);

-- Insert default university account (id=0)
INSERT INTO BankAccount(account_id, student_id, balance)
VALUES (0, NULL, 100000.00)
ON CONFLICT DO NOTHING;

-- ===========================================================
-- INDEXES
-- ===========================================================
CREATE INDEX idx_enroll_student ON Enrollment(student_id);
CREATE INDEX idx_enroll_section ON Enrollment(section_id);
CREATE INDEX idx_teach_instr ON Teaching(instructor_id);
CREATE INDEX idx_section_course ON Section(course_id);