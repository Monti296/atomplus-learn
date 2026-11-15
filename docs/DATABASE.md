# Database design (PostgreSQL on Neon, through Prisma)

All tables have a UUID primary key and `created_at` and `updated_at` (timestamptz). Names are `snake_case`.

## Tables

### users
| Column | Type | Notes |
|---|---|---|
| name | text | |
| email | text | unique, stored lowercase |
| password_hash | text | argon2 |
| role | enum employee, admin | |
| status | enum active, blocked | |
| must_change_password | boolean | true after create or reset |

### sessions
| Column | Type | Notes |
|---|---|---|
| id | text | random 256-bit value |
| user_id | uuid | foreign key to users, cascade on delete |
| expires_at | timestamptz | |
| last_activity_at | timestamptz | logout after 5 days without activity |

### login_attempts
| Column | Type | Notes |
|---|---|---|
| email | text | |
| ip | text | |
| failed_count | int | |
| window_start | timestamptz | 15-minute window |
| blocked_until | timestamptz | null when not blocked |

### courses
| Column | Type | Notes |
|---|---|---|
| title | text | |
| description | text | |
| cover_image_key | text | R2 object key |
| pass_mark_percent | int | 1 to 100 |
| exam_time_limit_minutes | int | |
| is_published | boolean | |

### sections
`course_id` (fk, cascade), `title`, `position` (int, unique per course).

### lectures
| Column | Type | Notes |
|---|---|---|
| section_id | uuid | fk, cascade |
| title | text | |
| position | int | unique per section |
| duration_seconds | int | set by the converter |
| source_key | text | original MP4; null after deletion |
| hls_prefix | text | R2 folder of the HLS files |
| status | enum uploaded, processing, ready, failed | only `ready` is shown to employees |
| failure_reason | text | |

### lecture_notes
`lecture_id` (fk, cascade), `file_key`, `file_name`.

### questions
`course_id` (fk, cascade), `type` (enum single, multiple, true_false), `text`, `position`.

### options
`question_id` (fk, cascade), `text`, `is_correct` (boolean), `position`.

### enrollments
`user_id` (fk, cascade), `course_id` (fk, cascade), `enrolled_at`, `completed_at` (null until the exam is passed). Unique on (user_id, course_id).

### lecture_progress
`enrollment_id` (fk, cascade), `lecture_id` (fk, cascade), `watched_seconds` (int), `last_position_seconds` (int), `completed_at` (null until 70% watched). Unique on (enrollment_id, lecture_id). A row is created the first time the employee opens the lecture.

### exam_attempts
| Column | Type | Notes |
|---|---|---|
| enrollment_id | uuid | unique: one row per enrollment, the latest try only |
| attempt_number | int | counts tries; a retake replaces the row's data |
| started_at, expires_at, submitted_at | timestamptz | server clock |
| score_percent | int | |
| passed | boolean | |
| question_order | jsonb | shuffled order for this try |
| answers | jsonb | saved as the employee goes |

### certificates
| Column | Type | Notes |
|---|---|---|
| enrollment_id | uuid | unique |
| user_id, course_id | uuid | |
| certificate_number | text | unique, for example AP-2026-0042 |
| issued_at | timestamptz | |
| user_name, course_title | text | snapshots at issue time |

## Relationships

A course has many sections; a section has many lectures; a lecture has many notes; a course has many questions; a question has many options; a user has many enrollments; an enrollment has many lecture_progress rows (one per lecture opened), at most one exam_attempts row and at most one certificate.

## Calculated, not stored

- **Item order:** sections by position, lectures by position, the exam last.
- **Unlocked:** an item is unlocked when every earlier item is complete.
- **Course progress percent:** completed items divided by total items (lectures plus the exam).

## Data lifecycle

- Blocking a user keeps all data and deletes their sessions.
- Removing a user deletes their enrollments, progress, attempt, certificates and sessions.
- Deleting a lecture removes its files from R2. Unpublishing a course hides it from the Courses page; enrolled users keep access.
- Backups: a daily dump of users, enrollments, lecture_progress, exam_attempts and certificates goes to a private R2 bucket (30 days). Courses, lectures and notes are not backed up by the platform; the owner keeps originals locally.
