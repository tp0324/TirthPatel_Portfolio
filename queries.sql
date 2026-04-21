-- This file contains the main report queries for the University7 app.
-- As required by hw-dbapp.pdf, Section 3.8

-- ===================================================
-- Query 1: GPA per Student (/api/report/gpaPerStudent)
-- ===================================================
WITH points AS (
  SELECT student_id,
         CASE letter
           WHEN 'A' THEN 4.0 WHEN 'B' THEN 3.0 WHEN 'C' THEN 2.0
           WHEN 'D' THEN 1.0 WHEN 'F' THEN 0.0 END AS gp
  FROM Grade
)
SELECT s.student_id, s.name, ROUND(AVG(p.gp),2) AS gpa, COUNT(p.gp) AS classes
FROM Student s LEFT JOIN points p ON s.student_id = p.student_id
GROUP BY s.student_id, s.name
ORDER BY gpa DESC NULLS LAST;


-- ===========================================================
-- Query 2: Tuition per Semester (/api/report/tuitionPerSemester)
-- ===========================================================
SELECT sem.year, sem.term, COUNT(*) AS num_payments, ROUND(SUM(p.amount),2) AS tuition_collected
FROM Payment p
JOIN Semester sem ON p.semester_id = sem.semester_id
GROUP BY sem.year, sem.term
ORDER BY sem.year DESC, sem.term DESC;


-- =========================================================
-- Query 3: Instructor Load (/api/report/instructorLoad)
-- =========================================================
SELECT i.instructor_id, i.name, sem.term, sem.year, COUNT(*) AS sections_taught
FROM Teaching t
JOIN Instructor i ON t.instructor_id = i.instructor_id
JOIN Semester sem ON t.semester_id = sem.semester_id
GROUP BY i.instructor_id, i.name, sem.term, sem.year
ORDER BY sem.year DESC, sem.term DESC, sections_taught DESC;


-- =============================================================
-- Query 4: Students per Section (/api/report/studentsPerSection)
-- =============================================================
SELECT s.section_id, c.course_name, COUNT(e.student_id) AS students
FROM Section s
JOIN Course c ON s.course_id = c.course_id
LEFT JOIN Enrollment e ON s.section_id = e.section_id
GROUP BY s.section_id, c.course_name
ORDER BY students DESC;



-- =============================================================
-- Query 5: Outstanding Balance (/api/report/OustandingBalance)
-- =============================================================
SELECT st.student_id, st.name, st.email, st.major,
       ROUND(COALESCE(tuition.total_tuition,0) - COALESCE(payments.total_paid,0), 2) AS outstanding
FROM Student st
LEFT JOIN (
    SELECT e.student_id, SUM(c.credit_hours * 300.00) AS total_tuition
    FROM Enrollment e
    JOIN Section s ON e.section_id = s.section_id
    JOIN Course c ON s.course_id = c.course_id
    GROUP BY e.student_id
) AS tuition ON tuition.student_id = st.student_id
LEFT JOIN (
    SELECT p.student_id, SUM(p.amount) AS total_paid
    FROM Payment p
    GROUP BY p.student_id
) AS payments ON payments.student_id = st.student_id
WHERE COALESCE(tuition.total_tuition,0) - COALESCE(payments.total_paid,0) > 0
ORDER BY outstanding DESC;

-- =============================================================
-- Query 6: Simulated Enrollments (/api/report/simulatedEnrollments)
-- =============================================================
SELECT 
  sim.student_id,
  st.name AS student_name,
  sim.section_id,
  c.course_name,
  sim.credit_hours,
  sim.amount,
  sem.year,
  sem.term
FROM SimulatedResults sim
JOIN Student st ON st.student_id = sim.student_id
JOIN Section s ON s.section_id = sim.section_id
JOIN Course c ON c.course_id = s.course_id
JOIN Semester sem ON sem.semester_id = sim.semester_id
ORDER BY sim.result_id;
