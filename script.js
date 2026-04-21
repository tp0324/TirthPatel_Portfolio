async function run(endpoint) {
  append(`▶ Running: ${endpoint}`);
  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const contentType = res.headers.get("content-type");
    let data;

    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
      append(JSON.stringify(data, null, 2));
    } else {
      data = await res.text();
      append(data);
    }
  } catch (err) {
    append("❌ Server/DB Error: " + err.message);
  }
}

function append(text) {
  const out = document.getElementById("output");
  out.textContent += text + "\n";
  out.scrollTop = out.scrollHeight;
}

function clearOutput() {
  document.getElementById("output").textContent = "";
}

// View Grades for Student
async function viewGrades() {
  const sid = document.getElementById("sid").value.trim();
  if (!sid) { append("⚠️ Enter Student ID."); return; }

  await run(`/api/grades?student_id=${encodeURIComponent(sid)}`);
}

// View Bill
async function viewBill() {
  const sid = document.getElementById("sid").value.trim();
  if (!sid) { append("⚠️ Enter Student ID."); return; }

  await run(`/api/bill?student_id=${encodeURIComponent(sid)}`);
}
// Enroll student into a section
async function enroll() {
  const sid = document.getElementById('sid').value.trim();
  const sect = document.getElementById('sect').value.trim();

  if (!sid || !sect) {
    alert("Please enter both Student ID and Section ID.");
    return;
  }

  // Call backend API to enroll student
  run(`/api/enroll?student_id=${encodeURIComponent(sid)}&section_id=${encodeURIComponent(sect)}`);
}

// Pay tuition (partial or full)
async function pay() {
  const sid = document.getElementById('sid').value.trim();

  if (!sid) {
    alert("Please enter Student ID.");
    return;
  }

  // Fetch current balance first
  const res = await fetch(`/api/bill?student_id=${encodeURIComponent(sid)}`);
  const data = await res.json();
  const balance = parseFloat(data[0]?.outstanding_balance || 0);

  if (balance <= 0) {
    alert("No outstanding balance to pay.");
    return;
  }

  // Fill payment form
  const paymentDiv = document.getElementById('paymentDiv');
  const balanceSpan = document.getElementById('currentBalance');
  const payAmountInput = document.getElementById('payAmount');
  const fullCheckbox = document.getElementById('fullBalance');
  const resultSpan = document.getElementById('paymentResult');

  balanceSpan.textContent = balance.toFixed(2);
  payAmountInput.value = '';
  fullCheckbox.checked = false;
  resultSpan.textContent = '';

  // Show the form
  paymentDiv.classList.remove('hidden');

  // Checkbox for full balance
  fullCheckbox.onchange = () => {
    payAmountInput.value = fullCheckbox.checked ? balance.toFixed(2) : '';
  };

  // Payment action
  window.makePayment = async () => {
    let amount = parseFloat(payAmountInput.value || "0");
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive number.");
      return;
    }
    if (amount > balance) {
      alert("Amount cannot exceed outstanding balance.");
      return;
    }

    try {
      const res = await fetch(
        `/api/pay?student_id=${encodeURIComponent(sid)}&amount=${amount}`
      );
      const data = await res.json();

      if (data.status === "success") {
        // Update remaining balance in the UI
        resultSpan.textContent = `${data.message} Remaining balance: $${data.remaining_balance.toFixed(2)}`;
        balanceSpan.textContent = data.remaining_balance.toFixed(2);

        // Clear inputs
        payAmountInput.value = '';
        fullCheckbox.checked = false;

        // If fully paid, optionally hide form
        if (data.remaining_balance <= 0) {
          alert("All dues cleared!");
          paymentDiv.classList.add('hidden');
        }
      } else {
        alert(data.message || "Payment failed.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while processing payment.");
    }
  };
}
