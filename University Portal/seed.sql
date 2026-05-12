-- ===========================================================
-- Insert Students
-- ===========================================================
WITH max_id AS (
  SELECT COALESCE(MAX(student_id), 0) AS last_id FROM Student
)
INSERT INTO Student (name, email, major)
SELECT 
  CONCAT('Student ', g + last_id) AS name,
  LOWER(CONCAT('student', g + last_id, '@u7.edu')) AS email,
  (ARRAY['Computer Science','Mathematics','Economics','Physics','Biology'])[floor(random()*5)+1] AS major
FROM generate_series(1, 20) g, max_id;

-- ===========================================================
-- Insert Instructors
-- ===========================================================
WITH max_id AS (
  SELECT COALESCE(MAX(instructor_id), 0) AS last_id FROM Instructor
)
INSERT INTO Instructor (name, email, department)
SELECT 
  CONCAT('Instructor ', g + last_id) AS name,
  LOWER(CONCAT('instructor', g + last_id, '@u7.edu')) AS email,
  (ARRAY['Computer Science','Mathematics','Information Systems','Biology'])[floor(random()*4)+1] AS department
FROM generate_series(1, 6) g, max_id;

-- ===========================================================
-- Insert Courses
-- ===========================================================
WITH max_id AS (
  SELECT COALESCE(MAX(course_id), 0) AS last_id FROM Course
)
INSERT INTO Course (course_name, credit_hours, capacity)
SELECT
  CONCAT('Course ', g + last_id) AS course_name,
  (floor(random()*5)+1)::int AS credit_hours,
  (floor(random()*30)+30)::int AS capacity
FROM generate_series(1, 5) g, max_id;

-- Insert Classrooms
INSERT INTO Classroom (building, room_no, capacity)
VALUES
 ('SEC', '101', 40),
 ('PGH', '232', 35),
 ('MH', '210', 45),
 ('CBB', '220', 50)
ON CONFLICT DO NOTHING;

-- Insert Semesters
INSERT INTO Semester (term, year, status)
VALUES
 ('Fall', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 'open'),
 ('Spring', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 'closed')
ON CONFLICT DO NOTHING;

-- Insert Sections for open semester
INSERT INTO Section (course_id, semester_id, room_id, schedule, mode, capacity)
SELECT 
  c.course_id,
  s.semester_id,
  r.room_id,
  (ARRAY['MWF 9:00–9:50','TR 10:00–11:15','MWF 11:00–11:50'])[floor(random()*3)+1],
  (ARRAY['in-person','hybrid','online'])[floor(random()*3)+1],
  c.capacity
FROM Course c
CROSS JOIN LATERAL (
  SELECT semester_id FROM Semester WHERE status='open' LIMIT 1
) s
JOIN Classroom r ON r.capacity >= c.capacity
ON CONFLICT DO NOTHING;

-- Assign Instructors to Courses
INSERT INTO Teaching (instructor_id, course_id, semester_id)
SELECT DISTINCT
  i.instructor_id,
  c.course_id,
  s.semester_id
FROM Instructor i
JOIN Course c ON random() < 0.6
CROSS JOIN (SELECT semester_id FROM Semester WHERE status='open' LIMIT 1) s
ON CONFLICT DO NOTHING;

-- Insert Bank Accounts
INSERT INTO BankAccount (student_id, balance)
SELECT student_id, ROUND((random() * 2000 + 500)::numeric, 2)
FROM Student
ON CONFLICT DO NOTHING;

-- Ensure every student has at least one enrollment
INSERT INTO Enrollment (student_id, section_id)
SELECT 
    s.student_id,
    sec.section_id
FROM Student s
JOIN LATERAL (
    SELECT section_id 
    FROM Section
    ORDER BY random()
    LIMIT 1
) sec ON true
ON CONFLICT DO NOTHING;

-- Add additional random enrollments (20% chance per student per section)
INSERT INTO Enrollment (student_id, section_id)
SELECT 
  s.student_id, 
  sec.section_id
FROM Student s
JOIN Section sec ON random() < 0.2
ON CONFLICT DO NOTHING;

-- Insert Payments for enrolled students
-- Insert partial payments for enrolled students (some will underpay)
-- Insert Payments: some students pay partially, some pay nothing
-- Insert Payments for enrolled students
INSERT INTO Payment (student_id, semester_id, amount)
SELECT DISTINCT
  e.student_id,
  sec.semester_id,
  CASE 
    WHEN random() < 0.3 THEN c.credit_hours * 300.00       -- 30% chance student fully pays
    WHEN random() < 0.5 THEN (c.credit_hours * 300.00) * (0.5 + random()*0.5) -- 35%-75% paid
    ELSE 0                                                -- some pay nothing
  END
FROM Enrollment e
JOIN Section sec ON e.section_id = sec.section_id
JOIN Course c ON sec.course_id = c.course_id
ON CONFLICT DO NOTHING;



-- Assign random grades for enrolled students
INSERT INTO Grade (student_id, section_id, letter)
SELECT e.student_id, e.section_id,
       (ARRAY['A','B','C','D','F'])[floor(random()*5)+1]
FROM Enrollment e
ON CONFLICT DO NOTHING;

-- Final message
SELECT '✅ Database seeded successfully with dynamic data' AS status;
