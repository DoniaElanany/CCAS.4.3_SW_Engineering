# E-Learning Platform Project

This project is an e-learning platform designed to facilitate online courses, user management, and payment processing. It allows students to enroll in courses, access learning materials, submit assignments, and enables instructors to manage courses, materials, and student grades.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [User Roles and Functionality](#user-roles-and-functionality)


## Prerequisites

Before you begin, make sure you have the following installed on your system:

-   **Node.js** (v14 or higher): [https://nodejs.org/](https://nodejs.org/)
-   **npm** (comes with Node.js): [https://www.npmjs.com/](https://www.npmjs.com/)
-   **MySQL** (v8 or higher): [https://www.mysql.com/](https://www.mysql.com/)
-   **Git** : [https://git-scm.com/](https://git-scm.com/) 

## Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/DoniaElanany/CCAS.4.3_SW_Engineering.git
    cd CCAS.4.3_SW_Engineering
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

    This command installs all the necessary Node.js packages defined in `package.json`, including `express`, `mysql2`, `body-parser`, `bcryptjs`, `express-session`, `crypto`, `path`, `nodemailer`, `cookie-parser`, `multer`.

3.  **Database Configuration:**
    - Create a new database in MySQL, for example, `e_learning_platform`.
    -   Update the database credentials in `server.js`:

        ```javascript
        const db = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '', // Your MySQL Password
            database: 'e_learning_platform', // Your database name
        });
        ```

4. **Database Setup**
    - Before running the project, you'll need to set up the database schema. Run the following SQL queries in your MySQL database to create the necessary tables: 

        ```sql 
        CREATE TABLE `students` (
        `student_id` int NOT NULL AUTO_INCREMENT,
        `full_name` varchar(100) NOT NULL,
        `email` varchar(100) NOT NULL,
        `password_hash` varchar(255) NOT NULL,
        `date_joined` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        `reset_token` varchar(255) DEFAULT NULL,
        `reset_token_expiry` datetime DEFAULT NULL,
        PRIMARY KEY (`student_id`),
        UNIQUE KEY `email` (`email`)
        );

        CREATE TABLE `instructors` (
        `instructor_id` int NOT NULL AUTO_INCREMENT,
        `full_name` varchar(100) NOT NULL,
        `email` varchar(100) NOT NULL,
        `password_hash` varchar(255) NOT NULL,
        `date_joined` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        `reset_token` varchar(255) DEFAULT NULL,
        `reset_token_expiry` datetime DEFAULT NULL,
        PRIMARY KEY (`instructor_id`),
        UNIQUE KEY `email` (`email`)
        );

        CREATE TABLE `courses` (
        `course_id` int NOT NULL AUTO_INCREMENT,
        `course_name` varchar(255) NOT NULL,
        `description` text,
        `instructor_id` int DEFAULT NULL,
        `price` decimal(10,2) DEFAULT '0.00',
        PRIMARY KEY (`course_id`),
        KEY `instructor_id` (`instructor_id`),
        CONSTRAINT `courses_ibfk_1` FOREIGN KEY (`instructor_id`) REFERENCES `instructors` (`instructor_id`)
        );

        CREATE TABLE `enrollments` (
        `enrollment_id` int NOT NULL AUTO_INCREMENT,
        `student_id` int DEFAULT NULL,
        `course_id` int DEFAULT NULL,
        `date_enrolled` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`enrollment_id`),
        KEY `student_id` (`student_id`),
        KEY `course_id` (`course_id`),
        CONSTRAINT `enrollments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`),
        CONSTRAINT `enrollments_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`)
        ); 

        CREATE TABLE `payments_invoices` (
        `student_id` int NOT NULL,
        `course_id` int NOT NULL,
        `amount` decimal(10,2) NOT NULL,
        `transaction_id` varchar(255) NOT NULL,
        `card_number` varchar(16) NOT NULL,
        `billing_address` text NOT NULL,
        `payment_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`transaction_id`)
        ); 

        CREATE TABLE `learning_materials` (
        `material_id` int NOT NULL AUTO_INCREMENT,
        `course_id` int DEFAULT NULL,
        `title` varchar(255) NOT NULL,
        `file_path` varchar(255) DEFAULT NULL,
        `upload_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`material_id`),
        KEY `course_id` (`course_id`),
        CONSTRAINT `learning_materials_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`)
        ); 

        CREATE TABLE `assignments` (
        `assignment_id` int NOT NULL AUTO_INCREMENT,
        `course_id` int DEFAULT NULL,
        `title` varchar(255) NOT NULL,
        `due_date` timestamp NULL DEFAULT NULL,
        `maximum_grade` int DEFAULT NULL,
        `file_path` varchar(255) DEFAULT NULL,
        PRIMARY KEY (`assignment_id`),
        KEY `course_id` (`course_id`),
        CONSTRAINT `assignments_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`)
        ); 

        CREATE TABLE `assignment_submissions` (
        `submission_id` int NOT NULL AUTO_INCREMENT,
        `assignment_id` int DEFAULT NULL,
        `student_id` int DEFAULT NULL,
        `submission_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        `grade` decimal(5,2) DEFAULT NULL,
        `file_path` varchar(255) DEFAULT NULL,
        `title` varchar(255) DEFAULT NULL,
        PRIMARY KEY (`submission_id`),
        KEY `assignment_id` (`assignment_id`),
        KEY `student_id` (`student_id`),
        CONSTRAINT `assignment_submissions_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`assignment_id`),
        CONSTRAINT `assignment_submissions_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
        )
        ```


## Running the Project

1.  **Start the Server:**
    ```bash
    node server.js
    ```

2.  **Access the Application:**

    -   Open your web browser and navigate to `http://localhost:3000/home`.
    -   You should see the home page of the e-learning platform.

3.  **Sign Up as an Instructor:**  
        
    - Navigate to the signup page (`http://localhost:3000/signup`) and select "Instructor" as the role.  
    - Create a new instructor account. Note the `instructor_id` that is generated by the database.  

4.  **Add a Course:** 
    
    - After creating an instructor account, use the following SQL statement to add courses to the `courses` table. Replace the placeholders with your desired values and the `instructor_id` you noted:
    
        ```sql
        INSERT INTO courses (course_name, description, instructor_id, price)
        VALUES ('Your Course Name', 'Your Course Description', [your_instructor_id], [Your Price]);
        ```
        Note: `Your Price` should be a decimal value, e.g., `99.99`
5.  **Sign Up as a Student:**  

    - Navigate to the signup page (`http://localhost:3000/signup`) and select "Student" as the role.  
    - Create a new student account.  
6. **Enroll in a Course:**  

    - Log in with the newly created student account.  
    - Navigate to the courses page (`http://localhost:3000/courses`).  
    - Enroll in course by clicking on "Enroll Now" and inserting your payment information.

You can now proceed to test the different functionalities of the website such as: adding assignments, adding learning material, submitting assignments, grading students' submissions, and removing submissions.

## Project Structure

The project structure is organized as follows:

-   `public/`: Contains all client-side files: HTML files, CSS (`style.css`, `reset.css`), JavaScript (`scripts.js`), images, and other static assets.
    -   HTML files are the different pages of the website: `home.html`, `courses.html`, `login.html`, `signup.html`, `profile.html`, `payment.html`, `course.html`, etc..
    -   `reset.css` normalizes default browser styles.
    -   `style.css` holds the main styles for the platform.
    -   `scripts.js` contains JavaScript code for client-side interactions.
-   `server.js`: Contains the server-side logic using Node.js and Express.js, including routing, database interactions, user authentication, and payment processing.
-   `uploads/`: Stores uploaded learning materials and assignment submissions. 

## API Endpoints

Here's a breakdown of the main API endpoints in `server.js`:

-   **User Authentication:**
    -   `POST /signup`: Registers a new user (student or instructor).
    -   `POST /login`: Logs in an existing user.
    -   `POST /api/logout`: Logs out the current user.
    -   `GET /api/session`: Checks if a user is logged in.
-   **User Profile:**
    -   `GET /api/profile`: Fetches the current user's profile data and enrolled courses.
    -   `POST /submit-profile-update`: Updates the current user's profile.
    -   `GET /api/getUserId`: Gets user Id
    -   `GET /api/instructor-courses`: Gets courses taught by an instructor.
-   **Courses:**
    -   `GET /courses/list`: Lists all courses.
    -   `GET /api/courses`: Lists all course name and ids.
    -   `GET /api/course-details`: Fetches details of a specific course, including materials and assignments.
-   **Payments:**  
    -   `POST /submit-payment`: Processes a payment and enrolls a student in a course.
-   **Learning Materials and Assignments:**
    -   `POST /api/upload-material`: Uploads learning materials and assignments (instructors only).
    -   `POST /api/submit-assignment`: Submits an assignment (students only).
    -   `GET /api/student-submissions`: Fetches a student's submissions for a specific course.
    -   `GET /api/all-student-submissions-by-assignment`: Fetches all student submissions for a specific assignment, along with user details (instructors only).
    -    `POST /api/remove-submission`: Removes student submissions.
    -    `POST /api/grade-submission`: Grades student submissions.
    -   `POST /api/remove-material`: Removes learning material.
    -   `POST /api/remove-assignment`: Removes an assignment and associated submissions.
-  **Password Reset**:
    -   `POST /forgot-password`: Initiates the password reset process.
    -   `POST /reset-password`: Resets the user's password.

## User Roles and Functionality

-   **Students**:
    -   Can browse available courses.
    -   Can enroll in courses and make payments.
    -   Can access learning materials.
    -   Can submit assignments.
    -   Can remove assignment submissions.
    -   Can view their profile.
-   **Instructors**:
    -   Can browse available courses.
    -   Can view the courses that they are instructors for.
    -   Can upload course materials.
    -   Can upload and remove assignments.
    -   Can view student submissions and grade them.
    -   Can remove graded assignments and student submissions
    -   Can remove course learning materials
-   **Both**:
    -   Can log in using email and password
    -   Can update profile information
    -   Can reset their passwords

