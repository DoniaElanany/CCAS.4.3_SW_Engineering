*** Settings ***
Library    SeleniumLibrary

*** Variables ***
${BROWSER}    safari
${BASE_URL}     http://localhost:3000
${STUDENT_EMAIL}    am3023181@gmail.com
${STUDENT_PASSWORD}  ahmedkady12
${VALID_SEARCH_TERM}   "Data"  
${COURSE_NAME}    "Big Data"
${NEW_FULL_NAME}   Ahmed Mahmoud

*** Test Cases ***
Verify Home Page Loads
    Open Browser    ${BASE_URL}/home   ${BROWSER}
    Wait Until Page Contains Element    xpath=//div[@class="cta-container2"]
    Page Should Contain    Start Learning Today!
    [Teardown]    Close Browser

Student Login Successfully
    Open Browser    ${BASE_URL}/login   ${BROWSER}
    Input Text    id=email    ${STUDENT_EMAIL}
    Input Password  id=password    ${STUDENT_PASSWORD}
    Click Button  xpath=//button[@class="button-filled login-btn"]
    Wait Until Page Contains Element    xpath=//section[@class="profile-section"]
    Page Should Contain    Welcome,
    [Teardown]    Close Browser

Search Courses Successfully With Valid Results
    Open Browser    ${BASE_URL}/home   ${BROWSER}
    Wait Until Page Contains Element    xpath=//div[@class="cta-container2"]
    Click Button    xpath=//button[contains(@class, "nav-action1") and .//span[text()="Search Courses"]]
    Wait Until Element Is Visible    id=searchInput
    Input Text    id=searchInput    ${VALID_SEARCH_TERM}
    Wait Until Element Is Visible  id=courseList
    Wait Until Page Contains Element    xpath=//ul[@id="courseList"]/li/a
    Page Should Contain Element    xpath=//ul[@id="courseList"]/li/a[contains(text(), ${COURSE_NAME})]
    Click Button    xpath=//button[@class="close-button"]
    [Teardown]    Close Browser

Student Updates Full Name Successfully
    Open Browser    ${BASE_URL}/login   ${BROWSER}
    Input Text    id=email    ${STUDENT_EMAIL}
    Input Password  id=password    ${STUDENT_PASSWORD}
    Execute JavaScript    document.querySelector('button.button-filled.login-btn').scrollIntoView({block: "center"});
    Click Button  xpath=//button[@class="button-filled login-btn"]
    Wait Until Page Contains Element    xpath=//section[@class="profile-section"]
    Execute JavaScript    document.querySelector('button.update-profile-btn').scrollIntoView({block: "center"});
    Wait Until Element Is Visible    xpath=//section[@class="profile-section"]//button[contains(@class, "update-profile-btn")]
    Click Button    xpath=//button[contains(@class, "update-profile-btn") and .//span[text()="Update Profile"]]
    Wait Until Page Contains Element    xpath=//form[@id="profile-form"]
    Execute JavaScript    document.querySelector('form#profile-form button.button-filled').scrollIntoView({block: "center"});
    Input Text    id=full_name    ${NEW_FULL_NAME}
    Execute JavaScript    document.querySelector('form#profile-form button.button-filled').scrollIntoView({block: "center"});
    Click Button    xpath=//form[@id="profile-form"]//button[contains(@class, "button-filled") and contains(., "Update Profile")]
    Wait Until Page Contains Element    xpath=//section[@class="profile-section"]
    Page Should Contain  Welcome, ${NEW_FULL_NAME}!
    [Teardown]    Close Browser
