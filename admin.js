const  express = require ("express");
const admin = express.Router()
const mysql = require('mysql2');
admin.use(express.json());
admin.use(express.urlencoded({ extended: true }));
const nodemailer = require("nodemailer");
;



////////////////mysql connection//////////////////

const connection = mysql.createConnection({
    host : 'localhost',
    user : 'root',
    password : '',
    database : 'hr software'
});
connection.connect((error)=>{
    if(error){console.error('error database connecting')
        return;
    };
    console.log('connected'+connection.threadId);
});




///////////////////////insert data/////////////////////



admin.post('/insert', (req, res) => {
    
    
    const {
        Employee_ID,
        full_name,
        date_of_birth,
        gender,
        adress,
        contact_number,
        email_address,
        department,
        designation,
        date_of_joining,
        base_salary,
        bank_account_details,
        degree,
        institution_name,
        year_of_graduation,
        previous_employers,
        job_titles,
        employment_duration,
        id_proof,
        resume,
        offer_letter_appointment_letter
    } = req.body;
    

    console.log(
        Employee_ID,
        full_name,
        date_of_birth,
        gender,
        adress,
        contact_number,
        email_address,
        department,
        designation,
        date_of_joining,
        base_salary,
        bank_account_details,
        degree,
        institution_name,
        year_of_graduation,
        previous_employers,
        job_titles,
        employment_duration,
        id_proof,
        resume,
        offer_letter_appointment_letter
    );

    // Validation to ensure all fields are provided
    if (
        !Employee_ID ||
        !full_name ||
        !date_of_birth ||
        !gender ||
        !adress ||
        !contact_number ||
        !email_address ||
        !department ||
        !designation ||
        !date_of_joining ||
        !base_salary ||
        !bank_account_details ||
        !degree ||
        !institution_name ||
        !year_of_graduation ||
        !previous_employers ||
        !job_titles ||
        !employment_duration ||
        !id_proof ||
        !resume ||
        !offer_letter_appointment_letter
    ) {
        return res.status(400).json({
            message: 'All fields are required. Please provide complete information.',
        });
    }

    try {
        const query = `
            INSERT INTO employeerecords 
            (Employee_ID, Full_Name, Date_of_Birth, Gender, Adress, Contact_Number, Email_Address, Department, Designation_Role, Date_of_Joining, Base_Salary, Bank_Account_Details, Degree, Institution_Name, Year_of_Graduation, Previous_Employers, Job_Titles, Employment_Duration, ID_Proof, Resume, Offer_Letter_Appointment_Letter) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
        `;

        const values = [
            Employee_ID,
            full_name,
            date_of_birth,
            gender,
            adress,
            contact_number,
            email_address,
            department,
            designation,
            date_of_joining,
            base_salary,
            bank_account_details,
            degree,
            institution_name,
            year_of_graduation,
            previous_employers,
            job_titles,
            employment_duration,
            id_proof,
            resume,
            offer_letter_appointment_letter,
        ];

        // Use async/await with a promise-based query function
        connection.query(query, values);

        return res.status(200).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error inserting into database:', error);
        return res.status(500).json({ message: 'Error posting to database', error });
    }
});


////////////////////update data////////////////
   

admin.put('/update/:id', (req, res) => {
    const ID = req.params.id;
    const { name, Email_Address } = req.body;

    connection.query(
        'UPDATE employeerecords SET Full_Name = ?, Email_Address = ? WHERE Employee_ID = ?',
        [name, Email_Address, ID], // Correct order of values
        (error, results) => {
            if (error) {
                console.error("Error updating database:", error);
                return res.status(500).json({
                    message: 'Error updating database',
                    error
                });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({
                    message: 'No employee found with the given ID.'
                });
            }

            return res.status(200).json({
                message: 'Updated successfully',
                results
            });
        }
    );
});




///////////////////////delete records//////////////////


admin.delete('/delete/:id',  (req, res) => {
    const ID = req.params.id;

    try {
        connection.query('DELETE FROM employeerecords WHERE Employee_ID=?', [ID], (err, results) => {
            if (err) {
                console.error("Error deleting:", err);
                return res.status(500).json({
                    message: 'Error deleting from database',
                    error: err
                });
            }

            if (results.affectedRows === 0) {
                // No record found with the given ID
                return res.status(404).json({ message: 'No data found to delete with the given ID.' });
            }

            // Successfully deleted
            return res.status(200).json({ message: 'Successfully deleted' });
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        res.status(500).json({ message: 'Unexpected error occurred.', error });
    }
});


///////////////////////display records/////////////////////

admin.get('/display',  (req, res) => {
     connection.query('SELECT * FROM employeerecords', (error, results) => {
        if (error) {
            console.error("Error fetching data:", error);
            return res.status(500).json({ message: 'Error fetching data from database', error });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'No employees found' });
        }

        return res.status(200).json({ message: 'Successfully fetched employees', data: results });
    });
});


/////////////////////////////////retrive pending requests////////////////////////


admin.get("/pending-leaves", (req, res) => {
    const sql = "SELECT * FROM leave_requests WHERE status = 'pending'";
    
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error", error: err });
        
        res.json({ success: true, data: results });
    });
});








//////////////////////////approve or reject///////////////////////////


admin.put("/approve-leave", (req, res) => {
    const { leave_id, manager_id, status } = req.body;

    // Normalize status to lowercase for validation
    const normalizedStatus = status.toLowerCase();

    if (!leave_id || !manager_id || !['approved', 'rejected'].includes(normalizedStatus)) {
        return res.status(400).json({ success: false, message: "Invalid request data" });
    }

    // Corrected SQL Query (removed extra comma)
    const sql = "UPDATE leave_requests SET status = ? WHERE id = ?";

    connection.query(sql, [normalizedStatus, leave_id], (err, result) => {
        if (err) {
            console.error("❌ MySQL Update Error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        res.json({ 
            success: true, 
            message: `Leave ${normalizedStatus} successfully`, 
            manager_id: manager_id // Just for reference, not saved in DB
        });
    });
});



///////////////////add credit ////////////////////////



admin.post("/credit", (req, res) => {
    const { employee_id, credit_amount, status } = req.body;
    console.log(req.body);
    

    if (!employee_id || !credit_amount || !status) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const sql = `
        INSERT INTO credit (employee_id, credit_amount, credit_date, status) 
        VALUES (?, ?, NOW(), ?)
    `;

    connection.query(sql, [employee_id, credit_amount, status], (err, result) => {
        if (err) {
            console.error("❌ MySQL Error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        res.json({ success: true, message: "Credit added successfully!" });
    });
});



////////////////////////insert to payment structure/////////////////////////


admin.post("/salary-structure", (req, res) => {
    const { employee_id, salary_type, base_salary, bonus, incentive } = req.body;
    
    // Check if all required fields are provided
    if (!employee_id || !salary_type || !base_salary) {
        return res.status(400).json({ success: false, message: "Employee ID, Salary Type, and Base Salary are required" });
    }

    // First, check if the employee exists in employeerecords
    const checkEmployeeQuery = "SELECT id FROM employeerecords WHERE id = ?";
    connection.query(checkEmployeeQuery, [employee_id], (err, results) => {
        if (err) {
            console.error("❌ Database Error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        if (results.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid Employee ID" });
        }

        // Insert into salary_structure
        const insertQuery = `
            INSERT INTO salary_structure (employee_id, salary_type, base_salary, bonus, incentive) 
            VALUES (?, ?, ?, ?, ?)
        `;

        connection.query(insertQuery, [employee_id, salary_type, base_salary, bonus || 0, incentive || 0], (err, result) => {
            if (err) {
                console.error("❌ MySQL Error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }

            res.json({ success: true, message: "salary structure added successfully!" });
        });
    });
});



/////////////////////////payroll management///////////////////////////////



// ✅ Process Salary
admin.post("/process-salary/:Employee_ID", (req, res) => {
    console.log("Received Body:", req.body);
    const { Employee_ID } = req.params;
    console.log("Employee ID:", Employee_ID);
    
    const sql = `
        SELECT ss.employee_id, e.Full_Name AS employee_name, ss.salary_type, ss.base_salary, ss.bonus, ss.incentive,
               COALESCE(a.total_hours, 0) AS total_hours,
               COALESCE(l.leave_days, 0) AS leave_days,
               COALESCE(c.credit_amount, 0) AS credit_deducted  
        FROM salary_structure ss
        JOIN employeerecords e ON ss.employee_id = e.id  -- ✅ Fetch employee name
        LEFT JOIN (
            SELECT userID, SUM(hours_woked) AS total_hours 
            FROM attendance
            WHERE MONTH(date) = MONTH(CURDATE()) 
            AND YEAR(date) = YEAR(CURDATE())
            GROUP BY userID
        ) a ON ss.employee_id = a.userID
        LEFT JOIN (
            SELECT employee_id, COUNT(*) AS leave_days 
            FROM leave_requests 
            WHERE status = 'Approved' 
            AND MONTH(leave_date) = MONTH(CURDATE()) 
            AND YEAR(leave_date) = YEAR(CURDATE())
            GROUP BY employee_id
        ) l ON ss.employee_id = l.employee_id
        LEFT JOIN (  
            SELECT employee_id, SUM(credit_amount) AS credit_amount 
            FROM credit 
            WHERE status = 'pending'  
            GROUP BY employee_id
        ) c ON ss.employee_id = c.employee_id
        WHERE ss.employee_id = ?
    `;

    connection.query(sql, [Employee_ID], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error", error: err });
        if (result.length === 0) return res.status(404).json({ success: false, message: "No salary record found!" });

        let salary = result[0];
        let gross_salary = 0;

        if (salary.salary_type === "hourly") {
            let hourly_salary = parseFloat(salary.base_salary) / (30 * 8);
            gross_salary = parseFloat(salary.total_hours) * hourly_salary;
        } else if (salary.salary_type === "daily") {
            let daily_salary = parseFloat(salary.base_salary) / 30;
            let leave_deduction = parseFloat(salary.leave_days) * daily_salary;
            gross_salary = parseFloat(salary.base_salary) - leave_deduction;
        } else {
            gross_salary = parseFloat(salary.base_salary);
        }

        // ✅ Ensure numeric values
        gross_salary += parseFloat(salary.bonus) + parseFloat(salary.incentive);
        let credit_deducted = parseFloat(salary.credit_deducted) || 0;

        // ✅ Deduct credit amount from net salary
        let net_salary = gross_salary - credit_deducted;

        console.log("Calculated Values:", { gross_salary, credit_deducted, net_salary });

        // Ensure values are valid numbers
        if (isNaN(gross_salary) || isNaN(net_salary)) {
            return res.status(400).json({ success: false, message: "Invalid salary calculation" });
        }

        const insertSql = `
            INSERT INTO salary_payments 
            (employee_id, employee_name, salary_month, gross_salary, bonus, incentive, credit_deducted, net_salary, payment_status, payment_date) 
            VALUES (?, ?, DATE_FORMAT(NOW(), '%Y-%m-28'), ?, ?, ?, ?, ?, 'pending', NOW())
        `;

        console.log("Insert Query Values:", [Employee_ID, salary.employee_name, gross_salary, salary.bonus, salary.incentive, credit_deducted, net_salary]);

        connection.query(insertSql, [Employee_ID, salary.employee_name, gross_salary, salary.bonus, salary.incentive, credit_deducted, net_salary], (err) => {
            if (err) {
                console.error("Insert Error:", err);
                return res.status(500).json({ success: false, message: "Failed to insert salary payment", error: err });
            }
            res.json({ 
                success: true, 
                message: "Salary processed successfully!", 
                salary_details: { 
                    Employee_ID, 
                    employee_name: salary.employee_name,
                    salary_type: salary.salary_type, 
                    gross_salary, 
                    bonus: salary.bonus, 
                    incentive: salary.incentive, 
                    credit_deducted, 
                    net_salary 
                } 
            });
        });
    });
});


// ✅ Send Payslip Route (Using Callbacks)
admin.post("/send-payslip", (req, res) => {
    const { Employee_ID, email } = req.body;
    console.log(req.body);
    

    // Fetch latest salary payment
    const sql = `SELECT * FROM salary_payments WHERE employee_id = ? ORDER BY payment_date DESC LIMIT 1`;

    connection.query(sql, [Employee_ID], (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "No salary record found!" });
        }

        let salary = result[0];

        // ✅ Prepare HTML email content
        const emailContent = `
            <h2>Payslip - ${salary.salary_month}</h2>
            <p><strong>Employee ID:</strong> ${salary.employee_id}</p>
            <p><strong>Employee Name:</strong> ${salary.employee_name}</p>
            <p><strong>Gross Salary:</strong> ${salary.gross_salary}</p>
            <p><strong>Bonus:</strong> ${salary.bonus}</p>
            <p><strong>Incentive:</strong> ${salary.incentive}</p>
            <p><strong>Credit Deducted:</strong> ${salary.credit_deducted}</p>
            <p><strong>Net Salary:</strong> ${salary.net_salary}</p>
            <p><strong>Payment Status:</strong> ${salary.payment_status}</p>
            <p><strong>Payment Date:</strong> ${salary.payment_date}</p>
        `;

        // ✅ Send Email Without SMTP
        sendPayslipEmail(email, emailContent, (emailErr) => {
            if (emailErr) {
                console.error("Email Error:", emailErr);
                return res.status(500).json({ success: false, message: "Failed to send email" });
            }
            res.json({ success: true, message: "Payslip sent successfully!" });
        });
    });
});

// ✅ Function to Send Email (Using Callback)
function sendPayslipEmail(toEmail, htmlContent, callback) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "justforuse6865@gmail.com",  // Replace with your Gmail
            pass: "uwnr xegs yujh yrwo"    // Use your Gmail App Password
        }
    });

    const mailOptions = {
        from: "justforuse6865@gmail.com",
        to: toEmail,
        subject: "Your Payslip",
        html: htmlContent
    };

    transporter.sendMail(mailOptions, callback);
}







/////////job openings/////////////

admin.post("/jobs", (req, res) => {
    const { title, description, location, department } = req.body;

    // ✅ Check for missing fields
    if (!title || !description || !location || !department) {
        return res.status(400).json({ success: false, message: "All fields (title, description, location, department) are required!" });
    }

    const sql = "INSERT INTO jobs (title, description, location, department) VALUES (?, ?, ?, ?)";

    connection.query(sql, [title, description, location, department], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        res.json({ success: true, message: "Job posted successfully!", jobId: result.insertId });
    });
});


admin.get("/jobs", (req, res) => {
    const sql = "SELECT * FROM jobs ORDER BY posted_date DESC";

    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "No jobs found!" });
        }

        res.json({ success: true, jobs: results });
    });
});



admin.get("/jobs/:id", (req, res) => {
    const { id } = req.params;

    const sql = "SELECT * FROM jobs WHERE id = ?";
    connection.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "Job not found!" });
        }

        res.json({ success: true, job: result[0] });
    });
});


admin.get("/applications/:job_id", (req, res) => {
    const { job_id } = req.params;

    // Check if the job exists
    const checkSql = "SELECT COUNT(*) AS count FROM jobs WHERE id = ?";
    connection.query(checkSql, [job_id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        if (result[0].count === 0) {
            return res.status(404).json({ success: false, message: "Job ID not found!" });
        }

        // If job exists, fetch applications
        const fetchSql = "SELECT * FROM applications WHERE job_id = ?";
        connection.query(fetchSql, [job_id], (err, results) => {
            if (err) return res.status(500).json({ success: false, error: err.message });

            res.json({ success: true, applications: results });
        });
    });
});


// 🟢 6️⃣ Update Application Status
admin.put("/applications/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const checkSql = "SELECT COUNT(*) AS count FROM applications WHERE id = ?";
    connection.query(checkSql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        if (result[0].count === 0) {
            return res.status(404).json({ success: false, message: "Application ID not found!" });
        }

        const updateSql = "UPDATE applications SET status = ? WHERE id = ?";
        connection.query(updateSql, [status, id], (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, message: "Application status updated!" });
        });
    });
});


// 🔴 7️⃣ Delete a Job
admin.delete("/jobs/:id", (req, res) => {
    const { id } = req.params;

    // Check if the job exists
    const checkSql = "SELECT COUNT(*) AS count FROM jobs WHERE id = ?";
    connection.query(checkSql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        if (result[0].count === 0) {
            return res.status(404).json({ success: false, message: "Job ID not found!" });
        }

        // If job exists, proceed with deletion
        const deleteSql = "DELETE FROM jobs WHERE id = ?";
        connection.query(deleteSql, [id], (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, message: "Job deleted successfully!" });
        });
    });
});




admin.post("/interviews", (req, res) => {
    const { application_id, interview_date, interviewer, location } = req.body;

    // ✅ Check for missing fields
    if (!application_id || !interview_date || !interviewer || !location) {
        return res.status(400).json({ 
            success: false, 
            message: "All fields (application_id, interview_date, interviewer, location) are required!" 
        });
    }

    // ✅ Check if application exists before scheduling an interview
    connection.query("SELECT * FROM applications WHERE id = ?", [application_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Application not found!" });
        }

        // ✅ Insert interview details
        const sql = `INSERT INTO interviews (application_id, interview_date, interviewer, location) VALUES (?, ?, ?, ?)`;
        connection.query(sql, [application_id, interview_date, interviewer, location], (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err.message });

            res.json({ success: true, message: "Interview scheduled!", interviewId: result.insertId });
        });
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




admin.put("/interviews/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ success: false, message: "Status field is required!" });
    }

    connection.query("UPDATE interviews SET status = ? WHERE id = ?", [status, id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Interview not found!" });
        }

        res.json({ success: true, message: "Interview status updated!" });
    });
});




admin.delete("/interviews/:id", (req, res) => {
    const { id } = req.params;

    connection.query("DELETE FROM interviews WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Interview not found!" });
        }

        res.json({ success: true, message: "Interview deleted!" });
    });
});


///////////////////issues notify//////////////////


admin.post("/issues", (req, res) => {
    const { employee_id, title, description, category } = req.body;
    
    if (!employee_id || !title || !description || !category) {
        return res.status(400).json({ success: false, message: "All fields are required!" });
    }
    
    const sql = "INSERT INTO issues (employee_id, title, description, category) VALUES (?, ?, ?, ?)";
    
    connection.query(sql, [employee_id, title, description, category], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: "Issue reported successfully!", issueId: result.insertId });
    });
});



admin.get("/issues", (req, res) => {
    connection.query("SELECT * FROM issues ORDER BY reported_date DESC", (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, issues: results });
    });
});



admin.get("/issues/:id", (req, res) => {
    const { id } = req.params;
    
    connection.query("SELECT * FROM issues WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (result.length === 0) return res.status(404).json({ success: false, message: "Issue not found" });
        res.json({ success: true, issue: result[0] });
    });
});


   

admin.put("/issues/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!["Open", "In Progress", "Resolved", "Closed"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const sql = "UPDATE issues SET status = ?, resolved_date = (CASE WHEN status = 'Resolved' THEN NOW() ELSE NULL END) WHERE id = ?";
    
    connection.query(sql, [status, id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Issue not found" });
        
        res.json({ success: true, message: "Issue status updated!" });
    });
});





admin.delete("/issues/:id", (req, res) => {
    const { id } = req.params;
    
    connection.query("DELETE FROM issues WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Issue not found" });
        
        res.json({ success: true, message: "Issue deleted successfully!" });
    });
});





module.exports = admin;
