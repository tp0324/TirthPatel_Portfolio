DO $$
DECLARE
  v_student INT := 1;       -- Example Student ID
  v_section INT := 1;       -- Example Section ID
  v_total NUMERIC(10,2);    -- Tuition for the course
  v_pay NUMERIC(10,2);      -- Payment amount
  v_semester INT;            -- Semester ID for the section
BEGIN
  -- 1️⃣ Get the cost of the course and semester
  SELECT c.credit_hours * 300.00, s.semester_id
  INTO v_total, v_semester
  FROM Section s
  JOIN Course c ON s.course_id = c.course_id
  WHERE s.section_id = v_section;

  IF v_total IS NULL THEN
    RAISE NOTICE 'Invalid section id %', v_section;
    RETURN;
  END IF;

  -- 2️⃣ Determine payment amount
  IF random() < 0.7 THEN
    -- 70% chance to pay partially (50–80% of tuition)
    v_pay := ROUND(v_total * (0.5 + random() * 0.3), 2);
  ELSE
    -- 30% chance to pay nothing
    v_pay := 0;
  END IF;

  -- 3️⃣ Start transaction
  BEGIN
    -- Enroll student (once)
    INSERT INTO Enrollment(student_id, section_id)
    VALUES (v_student, v_section)
    ON CONFLICT DO NOTHING;

    -- Insert payment only if > 0
    IF v_pay > 0 THEN
      INSERT INTO Payment(student_id, semester_id, amount, payment_time)
      VALUES (v_student, v_semester, v_pay, CURRENT_TIMESTAMP);

      -- Deduct from student bank account
      UPDATE BankAccount
      SET balance = balance - v_pay
      WHERE student_id = v_student;

      RAISE NOTICE '✅ Paid $% for section %, remaining bank balance: $%', v_pay, v_section,
        (SELECT balance FROM BankAccount WHERE student_id = v_student);
    ELSE
      RAISE NOTICE '💤 No payment made this time for section %', v_section;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Transaction failed: %', SQLERRM;
  END;
END $$;
