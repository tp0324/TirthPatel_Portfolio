// ===========================================================
// server.js — University 7 Backend (Complete & Fixed)
// COSC 3380 • Team 7
// ===========================================================

import express from "express";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import url from "url";

const app = express();
const port = 3000;

// -----------------------------------------------------------
// Path + Static setup
// -----------------------------------------------------------
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
app.use(express.static(__dirname));

// -----------------------------------------------------------
// PostgreSQL connection
// -----------------------------------------------------------
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "university7",
  password: "PASSWORD",
  port: 5432,
});

// Generic SQL runner
async function runSQL(sql) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql);
    return result.rows;
  } catch (err) {
    return { error: err.message };
  } finally {
    client.release();
  }
}

// -----------------------------------------------------------
// Root
// -----------------------------------------------------------
app.get("/", (_, res) => res.sendFile(path.join(__dirname, "index.html")));

// -----------------------------------------------------------
// 1. Create tables
// -----------------------------------------------------------
app.get("/api/createTables", async (_, res) => {
  try {
    const schema = fs.readFileSync(path.join(__dirname, "university7_schema.sql"), "utf8");
    const client = await pool.connect();
    await client.query(schema);
    client.release();
    res.send("✅ Tables created successfully.");
  } catch (e) {
    res.send("❌ " + e.message);
  }
});

// -----------------------------------------------------------
// 2. Seed / Insert base data
// -----------------------------------------------------------
app.get("/api/insertData", async (_, res) => {
  try{
  const sql = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");
  const result = await runSQL(sql);
  res.send("✅ Sample data inserted successfully!");}
  catch (err){
    res.send("❌ Failed to insert sample data!");
  }
});

// -----------------------------------------------------------
// 3. Semester control
// -----------------------------------------------------------
app.get("/api/openSemester", async (_, res) => {
  try {
    // Get the latest semester
    const semesters = await runSQL(`
      SELECT semester_id, term, year 
      FROM Semester 
      ORDER BY semester_id DESC 
      LIMIT 1
    `);

    let newTerm, newYear;

    if (!semesters.length) {
      // No semesters yet, start with Spring of current year
      newTerm = 'Spring';
      newYear = new Date().getFullYear();
    } else {
      const last = semesters[0];
      // Determine next term
      const termOrder = ['Spring', 'Summer', 'Fall'];
      const lastIndex = termOrder.indexOf(last.term);
      newTerm = termOrder[(lastIndex + 1) % termOrder.length];
      // Increment year if we cycled back to Spring
      newYear = lastIndex + 1 >= termOrder.length ? last.year + 1 : last.year;
    }

    // Insert new semester and get the inserted row
    const result = await runSQL(`
      INSERT INTO Semester (term, year, status)
      VALUES ('${newTerm}', ${newYear}, 'open')
      RETURNING semester_id, term, year, status
    `);

    res.send(result); // Send as table (JSON array)

  } catch (err) {
    res.send({
      error: "❌ Failed to open semester: " + err.message
    });
  }
});


app.get("/api/closeSemester", async (_, res) => {
  try {
    const result = await runSQL(`
      UPDATE Semester 
      SET status = 'closed'
      WHERE status = 'open'
      RETURNING term, year;
    `);

    // Use result.rows if exists, otherwise fallback to result
    const rows = result.rows || result;

    if (!rows || rows.length === 0) {
      return res.send("⚠️ No open semesters to close." );
    }
    res.send(result);

  } catch (err) {
    res.send({ error: "❌ Failed to close semester: " + err.message });
  }
});



// -----------------------------------------------------------
// 5. Simulation: Random enrollments
// -----------------------------------------------------------
app.get("/api/simulateEnrollments", async (_, res) => {
  try {
    // 1️⃣ Run the simulation (DO block)
    const simulateSql = `
      DROP TABLE IF EXISTS SimulatedResults;

      CREATE TABLE SimulatedResults (
        result_id SERIAL PRIMARY KEY,
        student_id INT,
        section_id INT,
        semester_id INT,
        credit_hours INT,
        amount NUMERIC(10,2),
        status TEXT
      );

      DO $$
      DECLARE sid INT; sect INT; v_amount NUMERIC(10,2); sem_id INT; ch INT;
      BEGIN
        FOR i IN 1..50 LOOP
          SELECT student_id INTO sid FROM Student ORDER BY RANDOM() LIMIT 1;
          SELECT section_id INTO sect FROM Section ORDER BY RANDOM() LIMIT 1;

          SELECT c.credit_hours, c.credit_hours * 300.00, s.semester_id
          INTO ch, v_amount, sem_id
          FROM Section s
          JOIN Course c ON s.course_id = c.course_id
          WHERE s.section_id = sect;

          BEGIN
            INSERT INTO Enrollment(student_id, section_id)
            VALUES (sid, sect)
            ON CONFLICT DO NOTHING;

            INSERT INTO Payment(student_id, semester_id, amount)
            VALUES (sid, sem_id, v_amount)
            ON CONFLICT DO NOTHING;

            UPDATE BankAccount 
            SET balance = balance - v_amount
            WHERE student_id = sid;

            INSERT INTO SimulatedResults(student_id, section_id, semester_id, credit_hours, amount, status)
            VALUES (sid, sect, sem_id, ch, v_amount, 'OK');

          EXCEPTION WHEN OTHERS THEN
            INSERT INTO SimulatedResults(student_id, section_id, semester_id, credit_hours, amount, status)
            VALUES (sid, sect, sem_id, ch, v_amount, 'FAILED');
          END;
        END LOOP;
      END $$;
    `;

    await runSQL(simulateSql); // ✅ only runs simulation

    // 2️⃣ Run SELECT separately to actually get the table
    const resultsSql = `
      SELECT 
        sim.result_id,
        sim.student_id,
        st.name AS student_name,
        sim.section_id,
        c.course_name,
        sim.credit_hours,
        sim.amount,
        sem.year,
        sem.term,
        sim.status
      FROM SimulatedResults sim
      JOIN Student st ON st.student_id = sim.student_id
      JOIN Section sec ON sec.section_id = sim.section_id
      JOIN Course c ON c.course_id = sec.course_id
      JOIN Semester sem ON sem.semester_id = sim.semester_id
      ORDER BY sim.result_id;
    `;

    const results = await runSQL(resultsSql); // ✅ this returns the table

    res.send(results); // ✅ now you get a table in the browser
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Simulation failed" });
  }
});

// -----------------------------------------------------------
// 6. Reports / Queries (Updated)
// -----------------------------------------------------------

// GPA per Student
app.get("/api/report/gpaPerStudent", async (_, res) => {
  const sql = `
    WITH points AS (
      SELECT student_id,
             CASE letter
               WHEN 'A' THEN 4.0 WHEN 'B' THEN 3.0 WHEN 'C' THEN 2.0
               WHEN 'D' THEN 1.0 WHEN 'F' THEN 0.0 END AS gp
      FROM Grade
    )
    SELECT s.student_id, s.name, ROUND(AVG(p.gp),2) AS gpa, COUNT(p.gp) AS classes_taken
    FROM Student s LEFT JOIN points p ON s.student_id = p.student_id
    GROUP BY s.student_id, s.name
    ORDER BY gpa DESC NULLS LAST;
  `;
  res.send(await runSQL(sql));
});

// Tuition Collected per Semester
app.get("/api/report/tuitionPerSemester", async (_, res) => {
  const sql = `
    SELECT sem.year, sem.term, COUNT(*) AS num_payments,
           ROUND(SUM(p.amount),2) AS tuition_collected
    FROM Payment p
    JOIN Semester sem ON p.semester_id = sem.semester_id
    GROUP BY sem.year, sem.term
    ORDER BY sem.year DESC, sem.term DESC;
  `;
  res.send(await runSQL(sql));
});

// Instructor Load
app.get("/api/report/instructorLoad", async (_, res) => {
  const sql = `
    SELECT i.instructor_id, i.name, sem.term, sem.year, COUNT(*) AS sections_taught
    FROM Teaching t
    JOIN Instructor i ON t.instructor_id = i.instructor_id
    JOIN Semester sem ON t.semester_id = sem.semester_id
    GROUP BY i.instructor_id, i.name, sem.term, sem.year
    ORDER BY sem.year DESC, sem.term DESC, sections_taught DESC;
  `;
  res.send(await runSQL(sql));
});

// Students per Section / Course
app.get("/api/report/studentsPerSection", async (_, res) => {
  const sql = `
    SELECT s.section_id, c.course_name, s.schedule, s.mode,
           COUNT(e.student_id) AS students_enrolled
    FROM Section s
    JOIN Course c ON s.course_id = c.course_id
    LEFT JOIN Enrollment e ON s.section_id = e.section_id
    GROUP BY s.section_id, c.course_name, s.schedule, s.mode
    ORDER BY students_enrolled DESC;
  `;
  res.send(await runSQL(sql));
});

// Outstanding Balances per Student
app.get("/api/report/outstandingBalances", async (_, res) => {
  const sql = `
    SELECT st.student_id, st.name, st.email, st.major,
           COALESCE(t.total_tuition,0) AS total_tuition,
           COALESCE(p.total_paid,0) AS total_paid,
           ROUND(COALESCE(t.total_tuition,0) - COALESCE(p.total_paid,0),2) AS outstanding_balance
    FROM Student st
    LEFT JOIN (
        SELECT e.student_id, SUM(c.credit_hours * 300.00) AS total_tuition
        FROM Enrollment e
        JOIN Section s ON e.section_id = s.section_id
        JOIN Course c ON s.course_id = c.course_id
        GROUP BY e.student_id
    ) AS t ON t.student_id = st.student_id
    LEFT JOIN (
        SELECT p.student_id, SUM(p.amount) AS total_paid
        FROM Payment p
        GROUP BY p.student_id
    ) AS p ON p.student_id = st.student_id
    WHERE COALESCE(t.total_tuition,0) - COALESCE(p.total_paid,0) > 0
    ORDER BY outstanding_balance DESC;
  `;
  res.send(await runSQL(sql));
});

// -----------------------------------------------------------
// 7. Browse Routes
// -----------------------------------------------------------
app.get("/api/browseStudents", async (_, res) => {
  res.send(await runSQL(`SELECT student_id, name, email, major FROM Student ORDER BY student_id DESC;`));
});

app.get("/api/browseSections", async (_, res) => {
  res.send(await runSQL(`
    SELECT s.section_id, c.course_name, s.schedule, s.mode
    FROM Section s
    JOIN Course c ON s.course_id = c.course_id;
  `));
});

// -----------------------------------------------------------
// 8. Back Office Routes
// -----------------------------------------------------------
app.get("/api/postRandomGrades", async (_, res) => {
  try {
    // Pick a random student with ungraded classes
    const students = await runSQL(`
      SELECT st.student_id, st.name
      FROM Student st
      WHERE st.student_id IN (
        SELECT e.student_id
        FROM Enrollment e
        LEFT JOIN Grade g 
          ON e.student_id = g.student_id AND e.section_id = g.section_id
        WHERE g.letter IS NULL
      )
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (!students.length) {
      return res.send("✔️ Every enrolled class already has a grade. No updates made.");
    }

    const student_id = students[0].student_id;

    const classResult = await runSQL(`
      SELECT e.section_id
      FROM Enrollment e
      LEFT JOIN Grade g 
        ON e.student_id = g.student_id AND e.section_id = g.section_id
      WHERE e.student_id = ${student_id} AND g.letter IS NULL
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (!classResult.length) {
      return res.send("❌ No ungraded classes found for this student.");
    }

    const section_id = classResult[0].section_id;
    const grades = ["A", "B", "C", "D", "F"];
    const randomGrade = grades[Math.floor(Math.random() * grades.length)];

    // Insert new grade only if not exists
    await runSQL(`
      INSERT INTO Grade(student_id, section_id, letter)
      SELECT ${student_id}, ${section_id}, '${randomGrade}'
      WHERE NOT EXISTS (
        SELECT 1 FROM Grade 
        WHERE student_id = ${student_id} AND section_id = ${section_id}
      )
    `);

    // AFTER table
    const afterTable = await runSQL(`
      SELECT e.student_id AS student_id, s.section_id AS course_id, c.course_name, COALESCE(g.letter, '') AS grade
      FROM Enrollment e
      JOIN Section s ON e.section_id = s.section_id
      JOIN Course c ON s.course_id = c.course_id
      LEFT JOIN Grade g 
        ON e.student_id = g.student_id AND e.section_id = g.section_id
      WHERE e.student_id = ${student_id}
      ORDER BY s.section_id
    `);

      res.send(afterTable);

  } catch (err) {
    res.send({
      error: "❌ Error posting random grade: " + err.message,
    });
  }
});


// -----------------------------------------------------------
// 9. Student Portal Routes
// -----------------------------------------------------------

// View grades
// View grades (including newly enrolled courses with empty grades)
app.get("/api/grades", async (req, res) => {
  const student_id = parseInt(req.query.student_id, 10);
  if (!student_id) return res.send("❌ Invalid Student ID");

  const sql = `
    SELECT s.section_id, c.course_name, 
           COALESCE(g.letter, '') AS letter
    FROM Enrollment e
    JOIN Section s ON e.section_id = s.section_id
    JOIN Course c ON s.course_id = c.course_id
    LEFT JOIN Grade g ON e.student_id = g.student_id AND e.section_id = g.section_id
    WHERE e.student_id = ${student_id}
    ORDER BY s.section_id;
  `;
  res.send(await runSQL(sql));
});


// Enroll a student (with duplicate check)
// Enroll a student (with duplicate and existence check)
app.get("/api/enroll", async (req, res) => {
  const student_id = parseInt(req.query.student_id || "1", 10);
  const section_id = parseInt(req.query.section_id || "1", 10);

  // Check if the section exists
  const sectionCheckSql = `SELECT 1 FROM Section WHERE section_id = ${section_id};`;
  const sectionResult = await runSQL(sectionCheckSql);
  if (sectionResult.length === 0) {
    return res.send(`❌ Section ID ${section_id} not found`);
  }

  // Check for duplicate enrollment
  const checkSql = `
    SELECT 1 FROM Enrollment 
    WHERE student_id = ${student_id} AND section_id = ${section_id};
  `;
  const result = await runSQL(checkSql);
  if (result.length > 0) {
    return res.send("You are already enrolled in this class!");
  }

  // Enroll the student
  await runSQL(`
    INSERT INTO Enrollment(student_id, section_id)
    VALUES (${student_id}, ${section_id});
  `);

  res.send("Enrollment successful!");
});

// Make a payment
// Make a payment
app.get("/api/pay", async (req, res) => {
  const student_id = parseInt(req.query.student_id, 10);
  const amount = parseFloat(req.query.amount);
  if (isNaN(student_id) || isNaN(amount) || amount <= 0)
    return res.send( "❌ Invalid payment amount." );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get open semester
    const sem = await client.query(
      `SELECT semester_id FROM Semester WHERE status='open' LIMIT 1`
    );
    if (!sem.rows.length) throw new Error("No open semester available.");
    const semester_id = sem.rows[0].semester_id;

    // Insert payment
    await client.query(
      `INSERT INTO Payment(student_id, semester_id, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [student_id, semester_id, amount]
    );

    // Deduct from bank
    await client.query(
      `UPDATE BankAccount SET balance = balance - $1 WHERE student_id = $2`,
      [amount, student_id]
    );

    await client.query('COMMIT');

    // Return remaining balance
    const result = await client.query(
      `
      SELECT ROUND(
        COALESCE(t.total_tuition,0) - COALESCE(p.total_paid,0), 2
      ) AS remaining_balance
      FROM Student st
      LEFT JOIN (
        SELECT e.student_id, SUM(c.credit_hours * 300.00) AS total_tuition
        FROM Enrollment e
        JOIN Section s ON e.section_id = s.section_id
        JOIN Course c ON s.course_id = c.course_id
        WHERE e.student_id = $1
        GROUP BY e.student_id
      ) t ON t.student_id = st.student_id
      LEFT JOIN (
        SELECT student_id, SUM(amount) AS total_paid
        FROM Payment
        WHERE student_id = $1
        GROUP BY student_id
      ) p ON p.student_id = st.student_id
      WHERE st.student_id = $1
      `,
      [student_id]
    );

    res.send({
      status: "success",
      message: "Payment processed successfully.",
      remaining_balance: parseFloat(result.rows[0].remaining_balance || 0)
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.send("❌ Payment failed: " + err.message );
  } finally {
    client.release();
  }
});



// View student bill
app.get("/api/bill", async (req, res) => {
  const student_id = parseInt(req.query.student_id, 10);
  if (!student_id) return res.send("❌ Invalid Student ID");

  const sql = `
    SELECT 
        st.student_id,
        st.name,
        COALESCE(tuition.total_tuition, 0.00) AS total_tuition,
        COALESCE(payments.total_paid, 0.00) AS total_paid,
        ROUND(
            COALESCE(tuition.total_tuition, 0.00) - COALESCE(payments.total_paid, 0.00), 
            2
        ) AS outstanding_balance
    FROM Student st
    LEFT JOIN (
        SELECT e.student_id, SUM(c.credit_hours * 300.00) AS total_tuition
        FROM Enrollment e
        JOIN Section s ON e.section_id = s.section_id
        JOIN Course c ON s.course_id = c.course_id
        WHERE e.student_id = ${student_id} 
        GROUP BY e.student_id
    ) AS tuition ON tuition.student_id = st.student_id
    LEFT JOIN (
        SELECT p.student_id, SUM(p.amount) AS total_paid
        FROM Payment p
        WHERE p.student_id = ${student_id} 
        GROUP BY p.student_id
    ) AS payments ON payments.student_id = st.student_id
    WHERE st.student_id = ${student_id};
  `;
  res.send(await runSQL(sql));
});

// -----------------------------------------------------------
app.listen(port, () => console.log(`University7 server running at http://localhost:${port}`));
