# AtomPlus Learning Platform – Product Requirements Document

Version 1.0 (approved) · Prepared with the software-builder workflow, Step 4

## 1. Product overview

AtomPlus Technologies Pvt. Ltd. designs and delivers biogas upgrading and Bio-CNG plants (VPSA and membrane technology), plus operations, consultancy and CO2 recovery. This product is an **internal learning platform** where AtomPlus employees learn from recorded lectures made by senior colleagues, pass an exam for each course, and earn a certificate.&#32;

## 2. Problem statement

Employees currently learn mainly on the job from senior colleagues. Each explanation or walkthrough costs senior staff time, new joiners wait on them to get up to speed, and there is no structured path for learning newer technologies. Company knowledge lives in people's heads.

## 3. Goals and non-goals

### Goals

- G1. Let new joiners and existing staff learn on their own, without taking seniors away from their work.
- G2. Give employees a structured way to learn core biogas knowledge and newer technology: SCADA/PLC automation, IoT and remote monitoring, AI and data analytics, and software tools (ERP, CAD, simulation).
- G3. Verify learning with a timed exam per course and recognise it with a certificate.
- G4. Keep all content and data private to AtomPlus.
- G5. Be easy to use on both phones and laptops.

### Non-goals (MVP)

- Access for clients, partners or the public.
- Manager role, team dashboards, or assigning courses by role.
- Self-service "forgot password" by email.

## 4. Users

| User | Description | Main needs |
| --- | --- | --- |
| Employee | Plant operators and technicians, design and commissioning engineers, sales and business staff, managers and leadership | Find a course, learn from lectures, pass the exam, keep proof of completion |
| Admin | AtomPlus staff who run the platform | Add users, publish courses, upload lectures, build exams, see progress |
| Senior colleague (content source) | Records lectures; the admin uploads them | Share knowledge once instead of repeatedly |

There are fewer than 50 users in total.

## 5. Key use cases

1. A new joiner logs in, enrolls in an onboarding course, watches the lectures, passes the exam and downloads the certificate.
2. An engineer self-enrolls in an IoT or SCADA course to learn a new technology.
3. An admin adds a new employee, creates a course, uploads its lectures and builds the exam.
4. An employee fails an exam, rewatches a lecture and retakes the exam.
5. An admin checks which employees have completed which courses.

## 6. Functional requirements

Each requirement has an ID so it can be traced to tasks and tests later.

### FR-1 Authentication

- FR-1.1 Users log in with company email and password.
- FR-1.2 There is no public sign-up. Only admins create accounts.
- FR-1.3 Deactivated users cannot log in.
- FR-1.4 Pages and videos are inaccessible without logging in only landing page(with login form) is accessible.

* FR-1.5 **Password rules**, whenever a password is set or changed: longer than 6 characters, at least one uppercase letter, one number and one symbol, and no character repeated three times in a row.
* FR-1.6 The first admin account is created in a one-time setup process. After that, admins add all other users.
* FR-1.7 There can be more than one admin.

**Acceptance criteria**

- A correct email and password logs the user in; a wrong one shows a clear error without saying which part was wrong.
- A deactivated user's login attempt is rejected.
- Opening any page or video link while logged out redirects to the login page.

* A password that breaks any rule is rejected with a message saying which rule failed.
* The one-time setup cannot be run again once the first admin exists.

### FR-2 My Profile page (one page, all users)

- FR-2.1 Shows the user’s name and email. Email is not editable.
- FR-2.2 User can edit their name.
- FR-2.3 User can change their password by entering the current password and a new one.
- FR-2.4 Shows three summary **cards** with counts only: **Ongoing courses**, **Completed courses** and **Earned certificates**.
- FR-2.5 Clicking the Ongoing or Completed card opens the **My Batch** page. Clicking the Earned certificates card opens the **Certificates** page.

**Acceptance criteria**

- Changing the name updates it everywhere it is displayed.
- Password change fails if the current password is wrong.
- The profile page shows only the three counts, not the courses or certificates themselves.
- Clicking a count card opens the matching page (My Batch or Certificates).

### FR-3 Course catalog and enrollment

- FR-3.1 The **Courses** page shows every course the employee has not yet enrolled in, as cards. Each card has an image, title, short description and an **Enroll** button.
- FR-3.2 Clicking **Enroll** works in the background: the course moves from the Courses page to the **My Batch** page, where its button becomes **Continue**, and the employee is taken straight to the play screen of that course.

* FR-3.3 The **My Batch** page shows the employee’s enrolled courses as cards in two sections, **Ongoing** and **Completed**. Each card shows the image, title and progress. Ongoing cards have a **Continue** button; completed cards show a Completed label.
* FR-3.4 The **Certificates** page lists the employee’s earned certificates, each with a PDF download.
* FR-3.5 A **top navigation bar** on every page after login links to **Courses**, **My Batch**, **Certificates** and **My Profile**. Admins also see a link to the admin dashboard.

**Acceptance criteria**

- Clicking Enroll moves the course from Courses to My Batch without a page reload and opens the play screen of that course.
- In My Batch the enrolled course shows a Continue button, and a course already enrolled in no longer appears on the Courses page.
- A course moves from Ongoing to Completed after the exam is passed.
- Every passed course has a certificate on the Certificates page, downloadable as a PDF.

### FR-4 Lectures

- FR-4.1 Admin organises a course into numbered sections and uploads recorded video lectures into them, in a set order.
- FR-4.2 Employees stream lectures as HLS (HTTP Live Streaming) in the browser on phone and laptop.
- FR-4.3 Videos are private: access through a dashboard(progress, list of lectures, video player for playing videos) in the website to a logged-in, enrolled user.
- FR-4.4 The platform records which lectures an employee has watched.

* FR-4.5 **Course player screen:** a sidebar shows the course title, a progress bar with the completion percentage, and the numbered sections. Each section expands and collapses and lists its lectures (title, type and duration). The course exam is the last item.
* FR-4.6 Each completed item shows a check mark.
* FR-4.7 The sidebar has a **Back to My Batch** link and a button to collapse it. The video area has a **Next** button that opens the next unlocked item.
* FR-4.8 **Strict order:** each item unlocks only when the previous one is complete. Locked items are visible but cannot be opened.
* FR-4.9 A lecture counts as watched after 70% of it has been played.
* FR-4.10 The player has play and pause, a progress bar that cannot be dragged forward (going back is allowed), volume, fullscreen, **playback speed** and **video quality** selection.

- FR-4.11 **No download:** employees cannot download lecture videos. The player has no download option, a video has no direct file link, and every stream is served as HLS through a short-lived signed link.

* FR-4.12 Admins upload lectures as MP4 files under 1 GB. No other video format is accepted.
* FR-4.13 Admins can attach PDF notes to a lecture. Employees can open and download the notes from that lecture.

**Acceptance criteria**

- after playing the 70% of the video.
- The lecture list shows a watched or not-watched state per lecture.

* Opening a locked item is refused, including by pasting its link while logged in.
* The progress percentage updates after a lecture is watched or the exam is passed.
* Playback speed and video quality can be changed during playback, and the video continues from the same point.
* On a phone, the sidebar can be collapsed so the video fills the screen width.

- The player shows no download option, and no direct link to a video file can be found or reused after the signed link expires.

* Dragging the progress bar forward past the point already played is blocked.
* An upload that is not an MP4, or is over 1 GB, is rejected with a clear message.

### FR-5 Exams

- FR-5.1 Each course has one exam created by an admin, with questions, a fixed pass mark and a time limit.
- FR-5.2 Employees can take exam only after completion of all lectures and retake the exam an unlimited number of times.
- FR-5.3 The timer is enforced by the server. When time runs out, the attempt is submitted automatically.
- FR-5.4 Question order and answer-option order are randomized on every attempt.
- FR-5.5 The result (score, pass or fail) is shown at the end, and only latest attempt is recorded.

* FR-5.6 Exam questions can be single-answer multiple choice, multiple-answer multiple choice, or true/false. A multiple-answer question counts as correct only when all correct options are selected.
* FR-5.7 When time runs out, the questions answered so far are graded as submitted.

**Acceptance criteria**

- Two attempts of the same exam show questions or options in different orders.
- Submitting after the time limit is not accepted as a normal submission, even if the browser timer is altered.
- A score at or above the pass mark is a pass; below it is a fail, and a retake is immediately available.

### FR-6 Certificates

- FR-6.1 A certificate is issued automatically only when the employee passes the course exam.
- FR-6.2 The certificate is a downloadable PDF showing the employee's name, course name, date, a unique certificate ID, the AtomPlus logo, the signatory’s name and title, and standard certificate wording.
- FR-6.3 No certificate exists for a failed or unattempted exam.

**Acceptance criteria**

- Passing creates exactly one certificate per employee per course.
- A failed attempt creates no certificate.

### FR-7 Progress tracking

- FR-7.1 The platform stores per employee: enrolled courses, lectures watched, the latest exam attempt with its score, and completion status.
- FR-7.2 A course is complete when the exam is passed.

### FR-8 Admin dashboard

- FR-8.1 **Users:** add an employee (name, company email, initial password), deactivate or reactivate, remove, and reset a password.
- FR-8.2 **Courses:** create, edit, publish or unpublish courses (each with a cover image, title and short description); add sections; upload and order lectures in them; create and edit the exam.
- FR-8.3 **Overview:** view each employee's progress, latest exam score.
- FR-8.4 Only admins can open the admin dashboard.

* FR-8.5 Deactivating (blocking) an employee keeps their progress, exam result and certificates. Removing an employee permanently deletes them.

**Acceptance criteria**

- An employee who opens an admin page directly is denied.
- A newly added employee can log in with the credentials the admin set.
- A reset password lets the user log in with the new password and not the old one.

* Removing an employee deletes their progress, exam result and certificates; deactivating does not.

## 7. User stories

| ID | Story | Covers |
| --- | --- | --- |
| US-1 | As a new joiner, I want to learn from recorded lectures so I don't need to interrupt seniors. | FR-3, FR-4 |
| US-2 | As an employee, I want to take a timed exam and retake it if I fail, so I can prove I learned the material. | FR-5 |
| US-3 | As an employee, I want a certificate when I pass, so my learning is recognised. | FR-6 |
| US-4 | As an employee, I want one page showing my name, password settings, the counts of my ongoing courses, completed courses and certificates, each linking to its own page. | FR-2 |
| US-5 | As an admin, I want to add users so only AtomPlus staff can access the platform. | FR-1, FR-8.1 |
| US-6 | As an admin, I want to create courses with lectures and an exam. | FR-8.2 |
| US-7 | As an admin, I want to see who has completed what. | FR-8.3 |
| US-8 | As an employee on my phone, I want to watch lectures and take exams without zooming or sideways scrolling. | NFR-1 |

## 8. Non-functional requirements

- **NFR-1 Responsive usability:** one responsive design that works on phone and laptop browsers; large tappable controls; readable text; no horizontal scrolling or zooming; the video player and exam screen are fully usable on a phone; simple navigation needing no training.
- **NFR-2 Performance:** lectures start playing and stream smoothly on average mobile connections; recommended recording is 720p.
- **NFR-3 Privacy and security:** internal only; passwords stored securely hashed; videos accessible only through short-lived signed links; admin pages restricted to admins.
- **NFR-4 Reliability:** progress and exam attempts must not be lost if the browser closes or the connection drops.
- **NFR-5 Maintainability:** simplest workable design, since a solo developer maintains it.

## 9. MVP scope

**In scope:** FR-1 to FR-8 as above, including question shuffling and one-page My Profile.

**Out of scope (later):** forgot-password email flow, a rank system based on employee progress, an employee-email watermark over videos, random question pool, admin reports, client or public access.

**Build order:** (1) login, users and profile; (2) courses and video; (3) exams and certificates; (4) admin overview and polish.

## 10. Success measures

Targets are to be set by AtomPlus; suggested measures only:

- Share of employees who have enrolled in at least one course.
- Share of enrolled employees who pass an exam.
- Time for a new joiner to complete onboarding courses.
- Senior time freed up (reported by seniors).
- Zero cases of videos or data reachable without logging in.

## 11. Assumptions

- Admins create all accounts; there is no public sign-up.
- Employees can edit their name but not their email.
- A forgotten password is reset by an admin.
- Each course has exactly one exam.
- Fewer than 50 users in total.
- Videos are stored in AtomPlus-controlled cloud storage and uploaded as MP4 (under 1 GB), converted after upload to HLS in several resolutions, and streamed as HLS.

* Course progress percentage = items completed (lectures watched plus the exam passed) divided by total items.
* The player’s quality menu lists the available HLS resolutions of each lecture, and employees can switch between them.
* The player screen follow the reference screenshot provided by the product owner.

- The set of video resolutions is chosen in the architecture step; the product owner accepts any sensible set.
- PDF notes are attached to individual lectures.

* During development the certificate uses a placeholder logo, signatory and wording. The product owner uploads the real ones in production.

## 12. Open questions

None. All earlier questions are answered and reflected in the requirements above.

Ans: to My Batch.

Ans: also download them.

Ans: all correct answer required.

Ans: use test items now, I will upload in production.
