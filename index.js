    const express = require("express");
    const app = express();
    const mysql = require("mysql2");
    const session = require("express-session");
    const ZKLib = require("node-zklib");
    const admin = require("./admin");
    app.use('/admin',admin)
    const PORT_EXPRESS = 3000;
    const zkInstance = new ZKLib("192.168.1.201", 4370, 10000, 4000);

    // MySQL connection
    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "hr software",
    });

    connection.connect((error) => {
        if (error) {
            console.error("❌ Error connecting to the database:", error);
            return;
        }
        console.log("✅ Connected to database");
    });

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Session handling
    app.use(
        session({
            secret: "your-secret-key",
            resave: false,
            saveUninitialized: true,
            cookie: { maxAge: 60000, httpOnly: true, secure: false },
        })
    );



/////////////////////// attendence from biometrics device///////////////


   // Convert 12-hour format (AM/PM) to 24-hour format
function convertTo24Hour(time12h) {
  let [time, period] = time12h.split(" ");
  let [hours, minutes, seconds] = time.split(":").map(Number);

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Calculate duration between check-in and check-out (assumes both in HH:MM:SS format)
function calculateDuration(checkIn, checkOut) {
  // Use a fixed date (e.g., 1970-01-01) to compare times
  let checkInDate = new Date(`1970-01-01T${checkIn}Z`);
  let checkOutDate = new Date(`1970-01-01T${checkOut}Z`);
  
  // Calculate the difference in milliseconds
  let diffMs = checkOutDate - checkInDate;
  
  // Compute hours and minutes
  let hours = Math.floor(diffMs / (1000 * 60 * 60));
  let minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours} hours ${minutes} minutes`;
}

// Fetch user mapping from the device so we can match deviceUserId to the user name
async function getUserMapping() {
  try {
    // Assuming your SDK provides a method to fetch users.
    let usersResponse = await zkInstance.getUsers();
    if (!usersResponse || !Array.isArray(usersResponse.data)) {
      throw new Error("Users data not returned in expected format.");
    }
    
    let userMapping = {};
    usersResponse.data.forEach(user => {
      // Adjust the property names according to your device's API response.
      userMapping[user.userId] = user.name;
    });
    
    return userMapping;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return {};
  }
}

// Process attendance by grouping punches per employee per day and computing duration
async function processAttendance() {
  try {
    await zkInstance.createSocket();
    console.log("✅ Connected to eSSL K90 Pro successfully.");

    let logs = await zkInstance.getAttendances();
    if (!logs?.data || !Array.isArray(logs.data)) {
      console.error("❌ Error: Attendance data is not an array", logs);
      return null;
    }
    
    // Get user mapping from the device
    let userMapping = await getUserMapping();

    // Use a map to group punches by "userId_date"
    let attendanceMap = {};

    logs.data.forEach((log) => {
      let userId = log.deviceUserId;
      let timestamp = new Date(log.recordTime);

      if (isNaN(timestamp.getTime())) {
        console.error("❌ Invalid date for log:", log);
        return;
      }

      // Extract date in YYYY-MM-DD format
      let date = timestamp.toISOString().split("T")[0];
      // Get time in 12-hour format and convert it to 24-hour format
      let formattedTime = timestamp.toLocaleTimeString("en-US", { hour12: true }).toUpperCase();
      let time24h = convertTo24Hour(formattedTime);

      // Look up the user's name from the mapping; default to an empty string if not found.
      let name = userMapping[userId] || "";

      // Create a unique key for the employee and date
      let key = `${userId}_${date}`;
      if (!attendanceMap[key]) {
        attendanceMap[key] = { userId, name, date, punches: [] };
      }
      attendanceMap[key].punches.push(time24h);
    });

    // Process each group to determine check-in, check-out and duration
    let finalRecords = Object.values(attendanceMap).map((record) => {
      // Sort the punches so that the earliest time is first
      record.punches.sort();
      let checkIn = record.punches[0]; // First punch of the day
      let checkOut = record.punches[record.punches.length - 1]; // Last punch of the day
      
      // Calculate duration using the helper function
      let duration = calculateDuration(checkIn, checkOut);
      
      return {
        userId: record.userId,
        name: record.name,
        date: record.date,
        checkIn,
        checkOut,
        duration
      };
    });

    console.log("🕒 Final Attendance Records:", finalRecords);
    await zkInstance.disconnect();
    return finalRecords;
  } catch (error) {
    console.error("❌ Error fetching attendance data:", error);
    return null;
  }
}

// Store the computed check-in, check-out, and duration records in MySQL
async function storeAttendanceData() {
  let attendanceRecords = await processAttendance();
  if (!attendanceRecords) return;

  let promises = [];

  attendanceRecords.forEach((record) => {
    let sql = `
  INSERT INTO attendance (userID, name, date, checkIn, checkOut, duration) 
  VALUES (?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE checkIn = VALUES(checkIn), checkOut = VALUES(checkOut), duration = VALUES(duration);
`;


    let values = [
      record.userId,
      record.name,
      record.date,
      record.checkIn,
      record.checkOut,
      record.duration
    ];

    promises.push(
      new Promise((resolve, reject) => {
        connection.query(sql, values, (err) => {
          if (err) {
            console.error("❌ MySQL Insert Error:", err);
            reject(err);
          } else {
            console.log(`✅ Attendance saved for user ${record.userId} on ${record.date}: Check-In at ${record.checkIn}, Check-Out at ${record.checkOut}, Duration: ${record.duration}`);
            resolve();
          }
        });
      })
    );
  });

  await Promise.all(promises);
}

// API endpoint to sync attendance data
app.get("/sync-attendance", async (req, res) => {
  try {
    await storeAttendanceData();
    res.json({ success: true, message: "Attendance data synced successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to sync attendance data", error });
  }
});


// API to retrieve attendance
app.get("/attendance", (req, res) => {
  connection.query("SELECT * FROM attendance", (err, results) => {
      if (err) return res.status(500).json({ message: "Database error", error: err });
      res.json(results);
  });
});







///////////////////////////////apply leave//////////////////



app.post("/apply-leave", (req, res) => {
    const { Employee_ID, leave_date, end_date, leave_type, reason } = req.body;
    console.log(req.body);


    if (!Employee_ID || !leave_date  || !end_date || !leave_type) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const sql = `INSERT INTO leave_requests (Employee_ID, leave_date, end_date, leave_type, reason) VALUES (?, ?, ?, ?, ?)`;

    connection.query(sql, [Employee_ID, leave_date, end_date, leave_type, reason], (err, result) => {
        if (err) {
            console.error("❌ MySQL Error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ success: true, message: "Leave request submitted successfully", leave_id: result.insertId });
    });
});





app.post("/applications", (req, res) => {
    const { job_id, candidate_name, email, phone, resume_url } = req.body;

    // ✅ Check for missing fields
    if (!job_id || !candidate_name || !email || !phone || !resume_url) {
        return res.status(400).json({ 
            success: false, 
            message: "All fields (job_id, candidate_name, email, phone, resume_url) are required!" 
        });
    }

    const sql = "INSERT INTO applications (job_id, candidate_name, email, phone, resume_url) VALUES (?, ?, ?, ?, ?)";

    connection.query(sql, [job_id, candidate_name, email, phone, resume_url], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        res.json({ success: true, message: "Application submitted!", applicationId: result.insertId });
    });
});




admin.get("/interviews/:job_id", (req, res) => {
    const { job_id } = req.params;

    const sql = `
        SELECT i.*, a.candidate_name, a.email, a.phone, j.title AS job_title 
        FROM interviews i
        JOIN applications a ON i.application_id = a.id
        JOIN jobs j ON a.job_id = j.id
        WHERE j.id = ?
        ORDER BY i.interview_date ASC
    `;

    connection.query(sql, [job_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "No interviews found for this job!" });
        }

        res.json({ success: true, interviews: results });
    });
});








// Start the server
app.listen(PORT_EXPRESS, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT_EXPRESS}`);
});