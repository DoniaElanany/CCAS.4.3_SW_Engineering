// Function to toggle the visibility of the search bar overlay
function toggleSearchBar() {
    const searchOverlay = document.getElementById("searchOverlay");
    // Toggles the display of the search overlay between 'flex' and 'none'
    searchOverlay.style.display = searchOverlay.style.display === "none" ? "flex" : "none";
    const courseList = document.getElementById("courseList");
    // Clears the list of courses when the search bar is opened/closed
    courseList.innerHTML = '';
}

// Function to filter courses based on user input in the search bar
function filterCourses() {
    // Gets the value from the search input field and converts to lower case
    const searchInput = document.getElementById("searchInput").value.toLowerCase();
    const courseList = document.getElementById("courseList");
    // Clears the list of courses before adding the filtered results
    courseList.innerHTML = '';

    // Fetches courses from the server
    fetch('/api/courses')
        .then(response => response.json())
        .then(courses => {
            // Filters the courses based on the search input
            const filteredCourses = courses.filter(course => course.course_name.toLowerCase().includes(searchInput));

            // Check if there are any filtered courses
             if (filteredCourses.length === 0) {
                const noResultsMessage = document.createElement('li');
                noResultsMessage.textContent = "No matching courses found. Please try a different search term.";
                courseList.appendChild(noResultsMessage);
            } else {
                 // Creates a list item for each filtered course and adds it to the course list
                filteredCourses.forEach(course => {
                    const courseItem = document.createElement("li");
                    const courseLink = document.createElement("a");
                    courseLink.href = `/course?course_id=${course.course_id}`;
                    courseLink.textContent = course.course_name;
                    courseItem.appendChild(courseLink)
                    courseList.appendChild(courseItem);
                });
            }
        })
        .catch(error => {
            console.error("Error fetching courses:", error);
        });
}

// Function to close the search bar overlay
function closeSearchBar() {
    const searchOverlay = document.getElementById("searchOverlay");
    // Hides the search bar overlay
    searchOverlay.style.display = "none";
    // Clears the search input field
    document.getElementById("searchInput").value = "";
}

// Function to scroll to the pricing section of the page
function scrollToPricing() {
    const pricingSection = document.querySelector('.prices-wrapper');
    if (pricingSection) {
        // Scrolls smoothly to the pricing section
        pricingSection.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    } else {
        console.log('Pricing section not found!');
    }
}

// Timeout function to handle displaying success message after payment is processed
setTimeout(function () {
    // Hides the loading message
    document.getElementById('loading').classList.add('hide');
    // Displays the success header
    document.getElementById('success-header').classList.remove('hide');
    // Displays the success emoji
    document.getElementById('success-emoji').classList.remove('hide');
    // Displays the success message
    document.getElementById('success-message').classList.remove('hide');
    // Displays the button to go back to homepage
    document.getElementById('success-btn').classList.remove('hide');
}, 2000);


// Event listener for when the document is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Password matching validation for signup form
    const signupForm = document.querySelector('.signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', function (e) {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const errorDisplay = document.getElementById('signup-error');

            if (password !== confirmPassword) {
                errorDisplay.textContent = 'Passwords do not match';
                e.preventDefault();
            } else {
                errorDisplay.textContent = '';
            }
        });
    }

    // Password matching validation for reset password form
    const resetPasswordForm = document.querySelector('.reset-password-form');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', function (e) {
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const errorDisplay = document.getElementById('reset-password-error');
            if (newPassword !== confirmPassword) {
                errorDisplay.textContent = 'Passwords do not match';
                e.preventDefault();
            } else {
                errorDisplay.textContent = '';
            }
        });
    }
    // Fetches user ID and role from the server
    fetch('/api/getUserId')
        .then(response => response.json())
        .then(data => {
            const userId = data.userId;
            const role = data.role;
            // Set to keep track of removed courses
            const removedCourses = new Set();
            // Function to update the set of removed courses
            function updateRemovedCourses(courseId, isAdding) {
                // Adds or removes a course id from the set
                if (isAdding) {
                    removedCourses.add(courseId);
                } else {
                    removedCourses.delete(courseId);
                }
                // Update the hidden field with the courses to be removed
                document.getElementById('removed-courses').value = [...removedCourses].join(',');
                // Logs the removed courses to the console
                console.log('Updated Removed Courses:', document.getElementById('removed-courses').value);
            }
            // Fetch the user profile information
            fetch(`/api/profile?userId=${userId}`)
                .then((response) => response.json())
                .then((data) => {
                    const user = data.user;
                    const courses = data.courses || [];
                    console.log('User:', user);
                    console.log('Courses:', courses);
                    // Populate profile update form with user data
                    document.getElementById('full_name').value = user.full_name;
                    document.getElementById('email').textContent = user.email;
                    document.getElementById('role').value = role;
                    const courseList = document.getElementById('course-list');
                    // Clear the previous courses listed in update profile
                    courseList.innerHTML = '';
                    // Handle case of no enrolled courses
                    if (courses.length === 0) {
                        const noCoursesMessage = document.createElement('li');
                        noCoursesMessage.textContent = 'No courses available.';
                        courseList.appendChild(noCoursesMessage);
                    }

                    // Creates list item for each course with option to remove
                    courses.forEach((course) => {
                        const courseItem = document.createElement('li');
                        courseItem.classList.add('course-item-update');
                        courseItem.id = `course-${course.course_id}`;
                        const courseName = document.createElement('span');
                        courseName.textContent = `${course.course_name}`;
                        courseName.classList.add('course-name');
                        const removeButton = document.createElement('button');
                        removeButton.textContent = '✖';
                        removeButton.classList.add('remove-course-btn');
                        // Event listener to toggle the clicked class and update the set of removed courses
                        removeButton.addEventListener('click', (e) => {
                            e.preventDefault();
                            courseItem.classList.toggle('clicked');
                            if (courseItem.classList.contains('clicked')) {
                                updateRemovedCourses(course.course_id, true);
                            } else {
                                updateRemovedCourses(course.course_id, false);
                            }
                        });

                        if (role === 'student') {
                            courseItem.appendChild(courseName);
                            courseItem.appendChild(removeButton);
                            courseList.appendChild(courseItem);
                        } else {
                            courseItem.appendChild(courseName);
                            courseList.appendChild(courseItem)
                        }
                    });
                })
                .catch(error => {
                    console.error('Error fetching profile:', error);
                });
            // Event listener to update the profile when submitting update form
            document.getElementById('profile-update-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                fetch('/submit-profile-update', {
                    method: 'POST',
                    body: formData
                })
                    .then(response => {
                        if (response.ok) {
                            //Redirects the user to the profile page upon successful update
                            window.location.href = '/profile';
                        } else {
                            //Displays alert in case of failed profile update
                            alert('Failed to update profile');
                        }
                    })
                    .catch(error => {
                        //Logs the error in console and displays alert if there is a problem submitting
                        console.error('Error submitting profile update:', error);
                        alert('An error occurred while submitting your profile update.');
                    });
            });
        });
});


// Fetch user session status
fetch('/api/session')
    .then(response => response.json())
    .then(data => {
        const isLoggedIn = data.loggedIn;
        const authBtn = document.getElementById('auth-btn');
        // If logged in, change the login button to logout
        if (isLoggedIn) {
            authBtn.textContent = 'Log Out';
            authBtn.addEventListener('click', () => {
                // Handles logging out by calling the logout api route
                fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'include'
                })
                    .then(response => {
                        if (response.ok) {
                            // Redirects to homepage after successful logout
                            window.location.href = 'home.html';
                        } else {
                            // Displays alert if logout fails
                            alert('Logout failed. Please try again.');
                        }
                    })
            });
            // If not logged in, changes the login button text and redirects user to login page
        } else {
            authBtn.textContent = 'Log In';
            authBtn.addEventListener('click', () => {
                window.location.href = '/login';
            });
        }
        // Changes the cta buttons to navigate user to courses page if already logged in
        const ctaSignupButton = document.getElementById('cta-signup-btn');
        const stepsSignupButton = document.getElementById('steps-signup-btn');
        if (isLoggedIn) {
            ctaSignupButton.textContent = 'Go to Courses';
            stepsSignupButton.textContent = 'Go to Courses';
            ctaSignupButton.onclick = () => {
                window.location.href = '/courses.html';
            };
            stepsSignupButton.onclick = () => {
                window.location.href = '/courses.html';
            };
            // Changes the cta buttons to navigate user to signup page if not logged in
        } else {
            ctaSignupButton.textContent = 'Sign Up Now!';
            stepsSignupButton.textContent = 'Sign Up';
            ctaSignupButton.onclick = () => {
                window.location.href = '/signup.html';
            };
            stepsSignupButton.onclick = () => {
                window.location.href = '/signup.html';
            };
        }

    })
    .catch(err => {
        console.error('Error fetching session status:', err);
    });


// Fetches the user profile info to display the profile page info
fetch('/api/profile')
    .then(response => {
        // Handles failed profile data retrieval
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Failed to load profile');
        }
    })
    .then(data => {
        // Gets the necessary user info from fetched data
        const {
            user,
            role,
            courses
        } = data;
        // Sets the user info in profile section of the profile page
        document.getElementById('user-full_name').textContent = user.full_name;
        document.getElementById('user-email').textContent = user.email;
        document.getElementById('member-since').textContent = new Date(user.date_joined).toLocaleDateString('en-GB');
        document.getElementById('role-info').textContent = role === 'student' ? "Student" : "Instructor";
        const courseList = document.getElementById('course-list');
        // Handles case of no courses enrolled by the user
        if (courses.length === 0) {
            courseList.textContent = "No courses found.";
        } else {
            // Creates a list item for each of the enrolled courses
            courses.forEach(course => {
                const li = document.createElement('li');
                li.textContent = `${course.course_name}`; // Display course details
                courseList.appendChild(li);
            });
        }
        // Shows the logout button once profile info is successfully fetched
        document.getElementById('logout-btn').style.display = 'block';
    })
    .catch(error => {
        console.error('Error fetching profile:', error);
    });

// Function to handle logout
function logout() {
    // Logs out and redirects to homepage
    fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
    })
        .then(response => {
            if (response.ok) {
                // Redirects to homepage upon successful logout
                window.location.href = 'home.html';
            } else {
                // Displays alert upon failed logout
                alert('Logout failed. Please try again.');
            }
        })
}
// Handles the logout when the logout button is clicked
document.getElementById('logout-btn').addEventListener('click', logout);
