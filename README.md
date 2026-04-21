University 7 – COSC 3380 Final Project

This project is a full-stack web application for managing a University Admin & Student Portal. It uses a Node.js/Express backend to serve an HTML/Tailwind frontend and
run SQL queries against a PostgreSQL database.



Project Files
index.html: The frontend web application.
tailwind.config.js
output.css
input.css
script.js: Frontend logic for all buttons.
server.js: The backend Node.js server (contains all API routes).
university7_schema.sql: The DDL schema file (creates all 11 tables).
seed.sql: The DML script (populates tables with sample data).
package.json: Project dependencies and start script.
transaction.sql: (Submission File) A trace of the main transaction.
query.sql: (Submission File) A trace of the main report queries.
ER.pdf
team07.pdf
README.md



Video Link
https://drive.google.com/file/d/1lL7JH1bCIDdKnUau4blKC3BGtHJucuIq/view?usp=sharing




How to Run

Prerequisites:
Node.js (v18.0.0+ recommended)
PostgreSQL (running locally or on a server)

Step 1: Create the Database
You must create the empty database before starting the server.

# Run this command in your terminal
createdb university7
(If that command fails, you can use psql -U your_username -d postgres -c "CREATE DATABASE university7;")



Step 2: Install Dependencies

# In the project folder
npm install


Step 3: Configure Database Connection
Open the server.js file and edit the Pool configuration (lines 24-30) with your PostgreSQL credentials.
// server.js (lines 24-30)
const pool = new Pool({
  user: "YOUR_USERNAME",        // e.g., 'postgres'
  host: "localhost",            // or your class server hostname
  database: "university7",
  password: "YOUR_PASSWORD",
  port: 5432,
  ssl: { rejectUnauthorized: false } // Keep this if connecting to a remote server
});


Step 4: Start the Server
npm start
The terminal should show: 🎓 University7 server running at http://localhost:3000



Step 5: Use the Web App
Open your browser and go to: http://localhost:3000
Do not open the index.html file directly.

The app's buttons must be clicked in order to set up the database.
Click Create Tables. (Wait for ✅ Tables created successfully.)
Click Insert Sample Data. (Wait for ✅ OK)


All other buttons are now functional. You can now run reports, simulations, and student portal actions.
