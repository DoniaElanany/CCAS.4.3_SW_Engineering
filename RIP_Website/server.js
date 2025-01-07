const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const app = express();
const port = 3000;

// MySQL connection setup
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'e_learning_platform',
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        return console.error('Error connecting to the database:', err);
    }
    console.log('Connected to the database');
});

// Middleware setup
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve static files from 'uploads' directory
app.use(cookieParser());

// Session management setup
app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// Middleware to check if user is logged in
function checkLoggedIn(req, res, next) {
    if (req.session.loggedIn) {
        return next();
    }
    res.redirect('/login');
}

// API endpoint to check the session status
app.get('/api/session', (req, res) => {
    if (req.session.loggedIn) {
        return res.json({
            loggedIn: true
        });
    }
    return res.json({
        loggedIn: false
    });
});

// Handle user signup
app.post('/signup', (req, res) => {
    const {
        email,
        password,
        full_name,
        role
    } = req.body;

    if (role !== 'student' && role !== 'instructor') {
        return res.status(400).send('Invalid role specified');
    }

    // Check if the email is already registered
    const checkEmailQuery = `
    SELECT 'student' AS role FROM students WHERE email = ?
    UNION
    SELECT 'instructor' AS role FROM instructors WHERE email = ?
  `;

    db.query(checkEmailQuery, [email, email], (err, results) => {
        if (err) {
            return console.error('Error querying database:', err);
        }

        if (results.length > 0) {
            return res.status(400).send('Email is already registered as a student or instructor');
        }

        const table = role === 'student' ? 'students' : 'instructors';

        // Hash the password and insert user into database
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return console.error('Error hashing password:', err);
            }

            const query = `INSERT INTO ${table} (email, password_hash, full_name) VALUES (?, ?, ?)`;
            db.query(query, [email, hashedPassword, full_name], (err) => {
                if (err) {
                    return console.error(`Error inserting ${role} into database:`, err);
                }
                res.redirect('/login');
            });
        });
    });
});


// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

// Serve homepage
app.get('/home', (req, res) => {
    res.sendFile(__dirname + '/public/home.html');
});

// Serve payment page for authenticated users
app.get('/payment', checkLoggedIn, (req, res) => {
    res.sendFile(__dirname + '/public/payment.html');
});

// Serve profile page for authenticated users
app.get('/profile', checkLoggedIn, (req, res) => {
    res.sendFile(__dirname + '/public/profile.html');
});


// Handle login POST request
app.post('/login', (req, res) => {
    const {
        email,
        password
    } = req.body;
    // Query to fetch the user based on the email
    const query = `
      SELECT * FROM (
          SELECT student_id AS userId, full_name, email, password_hash, 'student' AS role FROM students
          UNION ALL
          SELECT instructor_id AS userId, full_name, email, password_hash, 'instructor' AS role FROM instructors
      ) users
      WHERE email = ? LIMIT 1
  `;

    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).send('Internal Server Error');
        }

        if (results.length === 0) {
            return res.status(401).send('Invalid email or password');
        }

        const user = results[0];

        // Verify password
        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).send('Internal Server Error');
            }

            if (!isMatch) {
                return res.status(401).send('Invalid email or password');
            }

            // Set session data for the user
            req.session.userId = user.userId;
            req.session.role = user.role;
            req.session.loggedIn = true;
            res.redirect('/profile');
        });
    });
});

// API endpoint to handle user logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Logout failed');
        }
        res.clearCookie('connect.sid');
        res.redirect('/home');
    });
});

// API endpoint to fetch profile data for a logged-in user
app.get('/api/profile', checkLoggedIn, (req, res) => {
    const userId = req.session.userId;
    const role = req.session.role;

    console.log(`Fetching profile for ${role} with ID ${userId}`);

    const table = role === 'student' ? 'students' : 'instructors';

    // Fetch basic profile data for the user
    db.query(`SELECT * FROM ${table} WHERE ${role}_id = ?`, [userId], (err, result) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).send('Internal Server Error');
        }

        if (result.length === 0) {
            return res.status(404).send(`${role.charAt(0).toUpperCase() + role.slice(1)} not found`);
        }

        const user = result[0];
        console.log('Fetched user data:', user);

        // Fetch courses based on the user's role
        let courseQuery;

        if (role === 'student') {
            courseQuery = `
              SELECT c.course_name, c.course_id
              FROM courses c
              JOIN enrollments e ON c.course_id = e.course_id
              WHERE e.student_id = ?
          `;
        } else if (role === 'instructor') {
            courseQuery = `
              SELECT course_id, course_name
              FROM courses
              WHERE instructor_id = ?
          `;
        }

        // Fetch courses for the user
        db.query(courseQuery, [userId], (err, courses) => {
            if (err) {
                console.error('Error fetching courses:', err);
                return res.status(500).send('Internal Server Error');
            }
            // Respond with user profile and courses
            res.json({
                user: {
                    email: user.email,
                    full_name: user.full_name,
                    date_joined: user.date_joined,
                },
                role,
                courses,
            });
        });
    });
});

// Handle profile update submission
app.post('/submit-profile-update', checkLoggedIn, (req, res) => {
    const userId = req.session.userId;
    const {
        full_name,
        removed_courses,
        role
    } = req.body;

    if (!role) {
        return res.status(400).send('Role is required');
    }

    let updateProfileQuery;
    let getExistingEmailQuery;
    if (role === 'student') {
        updateProfileQuery = 'UPDATE students SET full_name = ?, email = ? WHERE student_id = ?';
        getExistingEmailQuery = 'SELECT email FROM students WHERE student_id = ?';
    } else if (role === 'instructor') {
        updateProfileQuery = 'UPDATE instructors SET full_name = ?, email = ? WHERE instructor_id = ?';
        getExistingEmailQuery = 'SELECT email FROM instructors WHERE instructor_id = ?';
    } else {
        return res.status(400).send('Invalid role');
    }

    // Get the existing email address
    db.query(getExistingEmailQuery, [userId], (err, result) => {
      if (err) {
          console.error('Error querying database for email:', err);
          return res.status(500).send('Internal Server Error');
      }
      if (result.length === 0) {
        return res.status(404).send('User not found');
      }

      const existingEmail = result[0].email;

       // Update profile data
      db.query(updateProfileQuery, [full_name, existingEmail, userId], (err) => {
          if (err) {
              return console.error('Error updating profile:', err);
          }

          // Handle removal of courses from a user's profile
          if (removed_courses && removed_courses.trim() !== '') {
              const coursesToRemove = removed_courses.split(',').filter(Boolean);

              if (coursesToRemove.length > 0) {
                  let removeCoursesQuery;

                  if (role === 'student') {
                      const placeholders = coursesToRemove.map(() => '?').join(',');
                      removeCoursesQuery = `DELETE FROM enrollments WHERE student_id = ? AND course_id IN (${placeholders})`;
                      db.query(removeCoursesQuery, [userId, ...coursesToRemove], (err) => {
                          if (err) {
                              return console.error('Error removing courses from enrollments:', err);
                          }
                      });
                  }
              }
          }
          res.redirect('/profile'); // Redirect after updating
      });
    });
});

// API endpoint to fetch all courses
app.get('/api/courses', (req, res) => {
    db.query('SELECT course_id, course_name FROM courses', (err, result) => {
        if (err) {
            console.error('Error fetching courses:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.json(result);
    });
});

// API endpoint to fetch a list of all courses
app.get('/courses/list', (req, res) => {
    const query = `
    SELECT courses.course_id, courses.course_name, courses.description, courses.price, instructors.full_name AS instructor_name, instructors.email AS instructor_email, courses.instructor_id
    FROM courses
    LEFT JOIN instructors ON courses.instructor_id = instructors.instructor_id;
  `;

    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching courses:', err);
            return res.status(500).json({
                error: 'Failed to fetch courses'
            });
        }
        res.json(result); // Send courses as JSON
    });
});

// API endpoint to get user ID for the frontend
app.get('/api/getUserId', (req, res) => {
    const userId = req.session.userId;
    const role = req.session.role;
    if (userId) {
        res.json({
            userId,
            role
        });
    } else {
        res.status(401).json({
            error: 'User not authenticated'
        });
    }
});


// Function to generate a random reset token
function generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Function to send a password reset email
function sendResetEmail(email, resetToken) {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'rip.elearning.platform@gmail.com',
            pass: 'wsqe ffjg kdxw gnzg',
        },
    });

    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
    const mailOptions = {
        from: 'rip.elearning.platform@gmail.com',
        to: email,
        subject: 'Password Reset Request',
        text: `Click the following link to reset your password: ${resetLink}`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending email:', err);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

// Serve forgot password page
app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/forgot-password.html'));
});

// Handle forgot password POST request
app.post('/forgot-password', (req, res) => {
    const {
        email
    } = req.body;

    console.log("Forgot password email:", email);

    // Check if the email exists in student or instructor table
    db.query('SELECT * FROM students WHERE email = ?', [email], (err, studentResults) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Server error');
        }

        if (studentResults.length > 0) {
            console.log("Found student:", studentResults[0]);
            handlePasswordReset('students', email, res);
        } else {
            db.query('SELECT * FROM instructors WHERE email = ?', [email], (err, instructorResults) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send('Server error');
                }

                if (instructorResults.length > 0) {
                    console.log("Found instructor:", instructorResults[0]);
                    handlePasswordReset('instructors', email, res);
                } else {
                    console.log("Email not found:", email);
                    res.status(404).send('Email not found');
                }
            });
        }
    });
});

// Serve reset password page
app.get('/reset-password', (req, res) => {
    res.sendFile(__dirname + '/public/reset-password.html');
});

// Handle reset password POST request
app.post('/reset-password', (req, res) => {
    const {
        token,
        new_password,
        confirm_password
    } = req.body;

    if (new_password !== confirm_password) {
        return res.status(400).send('Passwords do not match');
    }

    const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Query to verify the reset token is valid and has not expired
    const query = `
    SELECT * FROM (
        SELECT student_id AS userId, 'students' AS tableName, reset_token_expiry 
        FROM students 
        WHERE reset_token = ?
        UNION ALL
        SELECT instructor_id AS userId, 'instructors' AS tableName, reset_token_expiry 
        FROM instructors 
        WHERE reset_token = ?
    ) AS combined 
    WHERE reset_token_expiry > ? 
    LIMIT 1
`;

    db.query(query, [token, token, currentDateTime], (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).send('Internal Server Error');
        }

        if (results.length === 0) {
            return res.status(400).send('Invalid or expired link');
        }

        const {
            userId,
            tableName
        } = results[0];

        // Hash the new password and update the user
        bcrypt.hash(new_password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing password:', err);
                return res.status(500).send('Internal Server Error');
            }

            const updateQuery = `
            UPDATE ${tableName} 
            SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL 
            WHERE ${tableName === 'students' ? 'student_id' : 'instructor_id'} = ?
        `;

            db.query(updateQuery, [hashedPassword, userId], (err) => {
                if (err) {
                    console.error('Error updating password:', err);
                    return res.status(500).send('Internal Server Error');
                }

                res.sendFile(path.join(__dirname, '/public/reset-password-success.html'))
            });
        });
    });
});

// Function to handle password reset logic
function handlePasswordReset(table, email, res) {
    const resetToken = generateResetToken();

    // Save the token in the respective table with an expiration time
    const query = `UPDATE ${table} SET reset_token = ?, reset_token_expiry = ? WHERE email = ?`;
    const expiryTime = Date.now() + 3600000;
    const expiryDate = new Date(expiryTime);
    const reset_token_expiry = expiryDate.toISOString().slice(0, 19).replace('T', ' ');

    db.query(query, [resetToken, reset_token_expiry, email], (err) => {
        if (err) {
            console.error('Error updating reset token:', err);
            return res.status(500).send('Server error');
        }
        sendResetEmail(email, resetToken);
        res.send('Password reset instructions have been sent to your email.');
    });
}

// Handle payment submission
app.post('/submit-payment', checkLoggedIn, (req, res) => {
    const studentId = req.session.userId;
    const courseId = req.body.course;
    const price = req.body.price;
    const cardNumber = req.body['card-number'];
    const billingAddress = req.body['billing-address'];
    const expiryDate = req.body['expiry-date'];

    // Validate payment info on the server
    if (!courseId || !price || !cardNumber || !billingAddress || !expiryDate) {
        return res.status(400).json({
            error: 'Missing required payment information'
        });
    }
    if (cardNumber.length !== 16) {
        return res.status(400).json({
            error: 'Card number must be 16 digits.'
        });
    }
    if (billingAddress.trim() === '') {
        return res.status(400).json({
            error: 'Billing address cannot be empty.'
        });
    }

    const [month, year] = expiryDate.split('/').map(Number);
    const expiry = new Date(`20${year}`, month - 1, 1);
    const now = new Date();
    if (isNaN(expiry.getTime()) || expiry <= now) {
        return res.status(400).json({
            error: 'Invalid expiry date.'
        });
    }
    // Check if the user is already enrolled
    const checkEnrollmentQuery = 'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?';
    db.query(checkEnrollmentQuery, [studentId, courseId], (err, results) => {
        if (err) {
            return res.status(500).json({
                error: 'Error checking enrollment status'
            });
        }

        if (results.length > 0) {
            return res.status(400).json({
                error: 'You are already enrolled in this course'
            });
        }

        // Get the course name for invoice email
        const getCourseNameQuery = 'SELECT course_name FROM courses WHERE course_id = ?';
        db.query(getCourseNameQuery, [courseId], (err, courseResults) => {
            if (err) {
                console.error('Error retrieving course name:', err);
                return res.status(500).json({
                    error: 'Failed to retrieve course name'
                });
            }
            if (courseResults.length === 0) {
                return res.status(404).json({
                    error: 'Course not found'
                });
            }
            const courseName = courseResults[0].course_name;

            // Start a database transaction
            db.beginTransaction((err) => {
                if (err) {
                    return res.status(500).json({
                        error: 'Failed to start transaction'
                    });
                }

                // Insert payment and invoice record
                const paymentInvoiceQuery = `
                INSERT INTO payments_invoices (student_id, course_id, amount, transaction_id, card_number, billing_address) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
                const paymentTransactionId = generateTransactionId();

                db.query(paymentInvoiceQuery, [studentId, courseId, price, paymentTransactionId, cardNumber, billingAddress], (err, result) => {
                    if (err) {
                        console.error("Error inserting payment and invoice record:", err);
                        return db.rollback(() => {
                            res.status(500).json({
                                error: 'Failed to insert payment and invoice record'
                            });
                        });
                    }

                    // Insert enrollment record to link student to course
                    const enrollmentQuery = 'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)';
                    db.query(enrollmentQuery, [studentId, courseId], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                res.status(500).json({
                                    error: 'Failed to insert enrollment record'
                                });
                            });
                        }

                        // Commit transaction
                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => {
                                    res.status(500).json({
                                        error: 'Failed to commit transaction'
                                    });
                                });
                            }
                            sendInvoiceEmail(studentId, courseId, courseName, price, paymentTransactionId);
                            res.redirect('/payment-success.html');
                        });
                    });
                });
            });
        });
    });
});

// Function to send an invoice via email
function sendInvoiceEmail(studentId, courseId, courseName, amount, transactionId) {
    const getStudentEmailQuery = 'SELECT email FROM students WHERE student_id = ?';
    db.query(getStudentEmailQuery, [studentId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Error retrieving student email address:', err);
            return;
        }

        const studentEmail = results[0].email;

        const emailContent = `
  <h2>Payment Successful</h2>
  <p>Dear Student,</p>
  <p>Thank you for enrolling in the course. Below are your payment and enrollment details:</p>
  <ul>
    <li><strong>Course Name:</strong> ${courseName}</li>
    <li><strong>Amount Paid:</strong> $${amount}</li>
    <li><strong>Transaction ID:</strong> ${transactionId}</li>
  </ul>
  <p>Your enrollment is now complete. We're excited to have you on board!</p>
`;

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'rip.elearning.platform@gmail.com',
                pass: 'wsqe ffjg kdxw gnzg',
            },
        });

        const mailOptions = {
            from: 'rip.elearning.platform@gmail.com',
            to: studentEmail,
            subject: 'Invoice - Payment Confirmation',
            html: emailContent
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Invoice email sent:', info.response);
            }
        });
    });
}

// Function to generate unique transaction IDs
function generateTransactionId() {
    return 'txn-' + Date.now();
}

// Serve the course page
app.get('/course', checkLoggedIn, (req, res) => {
    const courseId = req.query.course_id;
    if (!courseId) {
        return res.status(400).send('Course ID is required');
    }
    // Get course details including instructor info
    const query = `
  SELECT courses.*, instructors.full_name AS instructor_name
  FROM courses
  LEFT JOIN instructors ON courses.instructor_id = instructors.instructor_id
  WHERE courses.course_id = ?
  `;

    db.query(query, [courseId], (err, results) => {
        if (err) {
            console.error('Error fetching course details:', err);
            return res.status(500).send('Internal Server Error');
        }
        if (results.length === 0) {
            return res.status(404).send('Course not found.');
        }
        res.sendFile(path.join(__dirname, '/public/course.html'));
    });
});

// API endpoint to fetch course details
app.get('/api/course-details', checkLoggedIn, (req, res) => {
    const courseId = req.query.course_id;
    const userId = req.session.userId;
    const role = req.session.role;

    if (!courseId) {
        return res.status(400).send('Course ID is required');
    }

    // Get course details including instructor name and email
    const query = `
   SELECT courses.*, instructors.full_name AS instructor_name, instructors.email AS instructor_email
   FROM courses
   LEFT JOIN instructors ON courses.instructor_id = instructors.instructor_id
   WHERE courses.course_id = ?
   `;

    db.query(query, [courseId], (err, results) => {
        if (err) {
            console.error('Error fetching course details:', err);
            return res.status(500).send('Internal Server Error');
        }
        if (results.length === 0) {
            return res.status(404).json({
                error: 'Course not found.'
            });
        }
        const courseDetails = results[0];


        // Check if the student is enrolled
        let isEnrolled = false;
        if (role === 'student') {
            const enrollmentCheckQuery = 'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?';
            db.query(enrollmentCheckQuery, [userId, courseId], (err, enrollmentResults) => {
                if (err) {
                    console.error('Error checking enrollment:', err);
                    return res.status(500).json({
                        error: 'Error checking enrollment status',
                    });
                }
                isEnrolled = enrollmentResults.length > 0;
                fetchCourseInfo(isEnrolled, courseDetails, res, courseId)
            });
        } else {
            fetchCourseInfo(isEnrolled, courseDetails, res, courseId);
        }
    });
});

function fetchCourseInfo(isEnrolled, courseDetails, res, courseId) {
    // Get the learning materials for a given course
    const materialQuery = `SELECT material_id, title, file_path FROM learning_materials WHERE course_id = ?`;
    db.query(materialQuery, [courseId], (err, materials) => {
        if (err) {
            console.error('Error fetching learning materials:', err);
            return res.status(500).json({
                error: 'Error fetching learning materials'
            });
        }
        // Get the assignments for a given course
        const assignmentQuery = `SELECT assignment_id, title, file_path, due_date, maximum_grade FROM assignments WHERE course_id = ?`;
        db.query(assignmentQuery, [courseId], (err, assignments) => {
            if (err) {
                console.error('Error fetching assignments:', err);
                return res.status(500).json({
                    error: 'Error fetching assignments'
                });
            }
            // Send course details, materials and assignments
            res.json({
                ...courseDetails,
                learningMaterials: materials,
                assignments: assignments,
                isEnrolled
            });

        })
    });
}

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage
});

// API endpoint to handle uploading of course learning materials and assignments
app.post('/api/upload-material', checkLoggedIn, upload.fields([{
    name: 'material',
    maxCount: 1
}, {
    name: 'assignment',
    maxCount: 1
}]), (req, res) => {
    const courseId = req.body.course_id;
    const materialFile = req.files && req.files['material'] ? req.files['material'][0] : null;
    const assignmentFile = req.files && req.files['assignment'] ? req.files['assignment'][0] : null;
    const dueDate = req.body['due_date'];
    const maximumGrade = req.body['maximum_grade'];

    if (!courseId) {
        return res.status(400).send('Course ID is required');
    }
    if (!materialFile && !assignmentFile) {
        return res.status(400).send('No material or assignment file provided');
    }
    // Start a transaction for all db operations
    db.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).send('Internal server error');
        }
        // Insert learning material if a file is present
        if (materialFile) {
            const relativeMaterialPath = path.relative(__dirname, materialFile.path);
            const materialQuery = `INSERT INTO learning_materials (course_id, title, file_path) VALUES (?, ?, ?)`;
            db.query(materialQuery, [courseId, materialFile.originalname, relativeMaterialPath], (err) => {
                if (err) {
                    console.error('Error saving learning material:', err);
                    return db.rollback(() => {
                        res.status(500).send('Error saving learning material');
                    });
                }
            });
        }
        // Insert assignment if a file is present
        if (assignmentFile) {
            if (dueDate) {
                const due = new Date(dueDate)
                const now = new Date();
                if (due <= now) {
                    return db.rollback(() => {
                        res.status(400).send('Due date must be in the future');
                    })
                }
            }
            const relativeAssignmentPath = path.relative(__dirname, assignmentFile.path);
            const assignmentQuery = `INSERT INTO assignments (course_id, title, file_path, due_date, maximum_grade) VALUES (?, ?, ?, ?, ?)`;
            db.query(assignmentQuery, [courseId, assignmentFile.originalname, relativeAssignmentPath, dueDate, maximumGrade], (err) => {
                if (err) {
                    console.error('Error saving assignment:', err);
                    return db.rollback(() => {
                        res.status(500).send('Error saving assignment');
                    });
                }
            });
        }
        // Commit the transaction
        db.commit(err => {
            if (err) {
                console.error('Error committing transaction:', err)
                return db.rollback(() => {
                    res.status(500).send('Error completing transaction');
                });
            }
            res.send('Files uploaded successfully.');
        });
    });
});

// API endpoint to handle assignment submissions
app.post('/api/submit-assignment', checkLoggedIn, upload.single('submission'), async (req, res) => {
    const assignmentId = req.body.assignment_id;
    const studentId = req.body.student_id;
    const submissionFile = req.file;

    if (!assignmentId || !studentId || !submissionFile) {
        return res.status(400).send('Missing required parameters');
    }
    // Fetch due date
    const assignmentQuery = 'SELECT due_date FROM assignments WHERE assignment_id = ?';
    db.query(assignmentQuery, [assignmentId], (err, results) => {
        if (err) {
            console.error('Error fetching assignment due date:', err);
            return res.status(500).send('Internal Server Error');
        }
        if (results.length === 0) {
            return res.status(404).send('Assignment Not found');
        }

        const dueDate = results[0].due_date;
        const now = new Date();
        // Check if the submission is after the due date
        if (dueDate && now > dueDate) {
            return res.status(400).send('Due date has passed!');
        }
        const relativeSubmissionPath = path.relative(__dirname, submissionFile.path);
        // Insert the submission info
        const query = `INSERT INTO assignment_submissions (assignment_id, student_id, file_path, title) VALUES (?, ?, ?, ?)`;
        db.query(query, [assignmentId, studentId, relativeSubmissionPath, submissionFile.originalname], (err) => {
            if (err) {
                console.error('Error saving submission:', err);
                return res.status(500).send('Error saving assignment');
            }
            res.send('Assignment submitted successfully.');
        });
    });
});

// API endpoint to remove a student's submission
app.post('/api/remove-submission', checkLoggedIn, (req, res) => {
    const studentId = req.body.student_id;
    const assignmentId = req.body.assignment_id;

    if (!studentId || !assignmentId) {
        return res.status(400).send('Missing required parameters');
    }

    const query = `DELETE FROM assignment_submissions WHERE student_id = ? AND assignment_id = ?`;
    db.query(query, [studentId, assignmentId], (err) => {
        if (err) {
            console.error('Error deleting submission:', err);
            return res.status(500).send('Error removing submission')
        }
        res.send('Submission removed successfully.');
    });
});

// API endpoint to grade a student's submission
app.post('/api/grade-submission', checkLoggedIn, (req, res) => {
    const submissionId = req.body.submission_id;
    const grade = req.body.grade;

    if (!submissionId || !grade) {
        return res.status(400).send('Missing required parameters');
    }

    // Fetch the maximum grade for the assignment associated with this submission
    const getMaxGradeQuery = `
    SELECT a.maximum_grade
    FROM assignments a
    INNER JOIN assignment_submissions s ON a.assignment_id = s.assignment_id
    WHERE s.submission_id = ?
`;

    db.query(getMaxGradeQuery, [submissionId], (err, results) => {
        if (err) {
            console.error('Error fetching maximum grade:', err);
            return res.status(500).send('Error grading submission');
        }

        if (results.length === 0) {
            return res.status(404).send('Submission not found');
        }

        const maximumGrade = results[0].maximum_grade;
        if (parseInt(grade) > maximumGrade) {
            return res.status(400).send(`Grade cannot exceed maximum grade of ${maximumGrade}`);
        }

        const query = `UPDATE assignment_submissions SET grade = ? WHERE submission_id = ?`;
        db.query(query, [grade, submissionId], (err) => {
            if (err) {
                console.error('Error grading submission:', err);
                return res.status(500).send('Error grading submission');
            }
            res.send('Submission graded successfully.');
        });
    });
});

// API endpoint to get a student's submissions for a specific course
app.get('/api/student-submissions', checkLoggedIn, (req, res) => {
    const studentId = req.query.studentId;
    const courseId = req.query.courseId

    if (!studentId || !courseId) {
        return res.status(400).send('Missing required parameters');
    }

    const query = `
      SELECT  a.assignment_id, a.title, a.due_date, s.submission_id, s.file_path, s.submission_date, s.title AS submission_title, s.grade
      FROM assignments a
      LEFT JOIN assignment_submissions s ON a.assignment_id = s.assignment_id
       WHERE a.course_id = ? AND s.student_id = ?
  `;
    db.query(query, [courseId, studentId], (err, results) => {
        if (err) {
            console.error('Error fetching student submissions:', err);
            return res.status(500).send('Error fetching student submissions');
        }
        res.json(results);
    });
});

// API endpoint to get courses taught by an instructor
app.get('/api/instructor-courses', checkLoggedIn, (req, res) => {
    const instructorId = req.query.instructorId;

    if (!instructorId) {
        return res.status(400).send('Instructor ID is required');
    }

    const query = `
      SELECT course_id
      FROM courses
      WHERE instructor_id = ?
  `;
    db.query(query, [instructorId], (err, results) => {
        if (err) {
            console.error('Error fetching instructor courses:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.json(results);
    });
});

// API endpoint to remove a learning material
app.post('/api/remove-material', checkLoggedIn, (req, res) => {
    const materialId = req.body.material_id;
    console.log(`Server received request to remove material with ID: ${materialId}`);

    if (!materialId) {
        return res.status(400).send('Missing material id');
    }

    const query = `DELETE FROM learning_materials WHERE material_id = ?`;
    db.query(query, [materialId], (err) => {
        if (err) {
            console.error('Error deleting material:', err);
            return res.status(500).send('Error deleting material');
        }
        res.send('Material removed successfully.');
    });
});

// API endpoint to remove an assignment and its submissions
app.post('/api/remove-assignment', checkLoggedIn, (req, res) => {
    const assignmentId = req.body.assignment_id;

    if (!assignmentId) {
        return res.status(400).send('Missing assignment id');
    }

    // Use a transaction to ensure data consistency
    db.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).send('Internal server error');
        }
        // Delete associated submissions
        const deleteSubmissionsQuery = `DELETE FROM assignment_submissions WHERE assignment_id = ?`;
        db.query(deleteSubmissionsQuery, [assignmentId], (err) => {
            if (err) {
                console.error('Error deleting submissions:', err);
                return db.rollback(() => {
                    res.status(500).send('Error deleting submissions');
                });
            }
            // Delete the assignment itself
            const query = `DELETE FROM assignments WHERE assignment_id = ?`;
            db.query(query, [assignmentId], (err) => {
                if (err) {
                    console.error('Error deleting assignment:', err);
                    return db.rollback(() => {
                        res.status(500).send('Error deleting assignment');
                    });
                }
                // Commit the transaction if everything is successful
                db.commit(err => {
                    if (err) {
                        console.error('Error committing transaction:', err);
                        return db.rollback(() => {
                            res.status(500).send('Error completing transaction');
                        });
                    }
                    res.send('Assignment removed successfully.');
                });
            });
        });
    });
});

// API endpoint to get all student submissions for a specific assignment with user details
app.get('/api/all-student-submissions-by-assignment', checkLoggedIn, (req, res) => {
    const assignmentId = req.query.assignmentId;
    if (!assignmentId) {
        return res.status(400).send('Missing assignment id');
    }
    const query = `
        SELECT
            s.student_id,
            s.full_name AS student_name,
            a.title AS submission_title,
            ass.file_path,
            ass.submission_date,
            ass.grade,
            ass.submission_id
        FROM
            assignment_submissions ass
        INNER JOIN assignments a ON ass.assignment_id = a.assignment_id
        INNER JOIN students s ON ass.student_id = s.student_id
        WHERE a.assignment_id = ?;
    `;
    db.query(query, [assignmentId], (err, results) => {
        if (err) {
            console.error('Error fetching all student submissions:', err);
            return res.status(500).send('Error fetching student submissions');
        }
        res.json(results);
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});