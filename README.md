# MANHAJ

### Multi-Tenant University E-Learning Platform

MANHAJ is a university-focused e-learning platform designed to support academic management, digital learning, assessment, grading, attendance, communication, analytics, and AI-powered educational features.

The platform is designed as a modular monolith with a Laravel backend and React frontend, using a shared MySQL database with tenant-based data isolation.

---

## 🚧 Project Status

**Currently under development.**

The project is being developed incrementally, with each feature implemented, tested, and verified before moving to the next stage.

### Current Phase

**Phase 0 — Foundation**

Current focus:

- Laravel project setup
- MySQL database configuration
- Authentication and authorization foundation
- Multi-tenancy foundation
- Database architecture
- Automated testing foundation
- Project documentation

---

## 🏗️ Architecture

MANHAJ follows a **modular monolith architecture**.

```text
                    MANHAJ
                       │
          ┌────────────┴────────────┐
          │                         │
       React                    Laravel
      Frontend                   Backend
          │                         │
          │                    ┌────┴────┐
          │                    │         │
          │                 MySQL      Redis
          │                    │
          │                    │
          └──────────── API ────┘
                       │
                       │ HTTP
                       ▼
                FastAPI AI Service
````

The Laravel application is responsible for the core platform.

The AI service is an external FastAPI service responsible for AI/ML functionality.

---

## 🛠️ Technology Stack

### Backend

* PHP 8.2+
* Laravel 12
* Laravel Eloquent ORM
* REST API

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Database

* MySQL 8
* XAMPP for local development

### AI Integration

* FastAPI
* HTTP-based integration between Laravel and the AI service

### Testing

* PHPUnit / Laravel Testing
* Playwright for end-to-end testing

### Infrastructure

Planned:

* Redis
* Docker
* Docker Compose
* GitHub Actions

---

# ✨ Core Features

## 🏢 Multi-Tenancy

MANHAJ supports multiple universities using a shared MySQL database.

Each university is represented as a tenant.

```text
Platform
│
├── University A
│   ├── Faculty
│   ├── Department
│   └── Programmes
│
└── University B
    ├── Faculty
    ├── Department
    └── Programmes
```

Tenant-owned data is isolated using `tenant_id`.

The platform does not use database-per-tenant architecture.

---

## 👥 Role-Based Access Control

The platform supports:

* Platform Administrator
* University Administrator
* Faculty Administrator
* Instructor
* Teaching Assistant
* Student
* Guest
* Auditor

Authorization is handled through Laravel's authorization mechanisms and protected routes.

---

## 🎓 Academic Management

The academic structure follows:

```text
University
    ↓
Faculty / College
    ↓
Department
    ↓
Programme
    ↓
Course
    ↓
Section
```

The system supports:

* Academic terms
* Courses
* Course sections
* Prerequisites
* Student enrolment
* Capacity management
* Waitlists
* Add/drop periods
* Bulk student import

---

## 📚 Learning Content

Courses can contain:

```text
Course
  ├── Module
  │    ├── Lesson
  │    ├── Lesson
  │    └── Lesson
  │
  └── Module
       ├── Lesson
       └── Lesson
```

Supported lesson types include:

* Video
* PDF / slides
* Text
* External links
* Downloadable materials

The system tracks learning progress and lesson completion.

---

## 📝 Assessments

MANHAJ supports:

### Question Types

* Multiple Choice
* Multiple Answer
* True / False
* Matching
* Short Answer
* Essay
* File Upload

### Quiz Features

* Question pools
* Random question selection
* Shuffled options
* Time limits
* Attempt limits
* Availability windows
* Autosave
* Server-side timing
* Feedback configuration

### Assignments

* Instructions
* Attachments
* Due dates
* Late submission policies
* Automatic penalties
* Resubmissions
* Group submissions

---

## 📊 Gradebook & GPA

The grading system supports:

* Weighted grade components
* Course totals
* Configurable grading scales
* Letter grades
* Term GPA
* Cumulative GPA
* Transcripts
* Grade publishing

Grade calculations are implemented in dedicated business logic/services rather than inside controllers or frontend components.

Students only see grades after they have been published.

---

## 📅 Attendance

The platform supports:

* Lecture schedules
* Instructor attendance marking
* Attendance records
* Attendance percentages
* Student attendance views

---

## 🔔 Communication

Planned communication features include:

* Course announcements
* Discussion boards
* Threaded discussions
* Pinned discussions
* In-app notifications
* Deadline notifications
* Grade notifications
* Risk notifications

---

## 📈 Dashboards

### Student Dashboard

Students can access:

* Enrolled courses
* Learning progress
* Deadlines
* Grades
* Attendance
* Notifications

### Instructor Dashboard

Instructors can access:

* Their sections
* Students
* Submission backlog
* Grading backlog
* Score distributions
* At-risk students

### Faculty / Administration Dashboard

Administrative users can access:

* Enrolment statistics
* Pass/fail rates
* Course performance
* Unusual course failure rates

---

# 🤖 AI Integration

MANHAJ integrates with an external FastAPI AI service.

Laravel communicates with the AI service through HTTP APIs.

Expected endpoints include:

```text
GET  /health

POST /v1/risk/score-batch

GET  /v1/risk/explain/{enrolment_id}

POST /v1/assistant/ask

POST /v1/assistant/index

POST /v1/similarity/check

POST /v1/quiz/item-analysis
```

The AI/ML implementation itself is handled separately.

Laravel is responsible for:

* Sending requests
* Validating responses
* Handling failures
* Retrying retryable operations
* Storing AI results
* Displaying AI-generated insights

If the AI service becomes unavailable, the core MANHAJ platform should continue operating.

---

# 🧠 Learning Events

The platform records learning events such as:

```text
lesson_viewed
video_progress
quiz_started
quiz_submitted
assignment_submitted
forum_posted
login
```

Events contain information such as:

* Tenant
* User
* Section
* Event type
* JSON payload
* Timestamp

These events can later be consumed by the AI/analytics system.

---

# 🔐 Security & Authorization

The platform uses:

* Authentication
* Role-based authorization
* Laravel Policies/Gates
* Protected routes
* Tenant isolation
* Request validation
* Rate limiting
* Audit logging

Privileged operations, especially grade changes, are recorded through audit logs.

---

# 🧪 Testing

Automated testing is a core part of the project.

### Backend Tests

Tests cover:

* Authentication
* Authorization
* Validation
* Tenant isolation
* Enrolment
* Prerequisites
* Quizzes
* Assignments
* Grade publishing
* Business rules
* GPA calculations

### End-to-End Tests

Critical user flows will be tested using browser automation.

Example:

```text
Student
  ↓
Login
  ↓
Dashboard
  ↓
Course
  ↓
Lesson
  ↓
Progress
```

Another critical flow:

```text
Instructor
  ↓
Login
  ↓
Section
  ↓
Students
  ↓
Grade
  ↓
Publish
```

Tenant isolation is also tested to ensure one university cannot access another university's data.

---

# 🗂️ Project Structure

The Laravel backend follows standard Laravel conventions.

```text
manhaj/
│
├── app/
│   ├── Http/
│   ├── Models/
│   ├── Services/
│   └── ...
│
├── bootstrap/
│
├── config/
│
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
│
├── public/
│
├── resources/
│   ├── js/
│   └── ...
│
├── routes/
│   ├── api.php
│   └── web.php
│
├── storage/
│
├── tests/
│
├── PROJECT_STATUS.md
├── composer.json
└── package.json
```

---

# 🚀 Local Development

## Requirements

Install:

* PHP 8.2+
* Composer
* Node.js
* npm
* XAMPP
* MySQL 8
* Git

---

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd manhaj
```

Install PHP dependencies:

```bash
composer install
```

Install frontend dependencies:

```bash
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Generate the application key:

```bash
php artisan key:generate
```

---

## Database Setup

Start **Apache** and **MySQL** from XAMPP.

Create a MySQL database:

```text
manhaj
```

Configure `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=manhaj
DB_USERNAME=root
DB_PASSWORD=
```

Run migrations:

```bash
php artisan migrate
```

When demo seeders are available:

```bash
php artisan db:seed
```

---

## Running the Application

Start Laravel:

```bash
php artisan serve
```

Start Vite:

```bash
npm run dev
```

The application will then be available through the Laravel development server.

---

# 🔄 Development Workflow

Development is performed incrementally.

Each feature follows:

```text
Plan
  ↓
Implement
  ↓
Test
  ↓
Fix
  ↓
Document
  ↓
Commit
  ↓
Push
```

A feature is not considered complete until it has been verified.

---

# 📝 Project Status

The file:

```text
PROJECT_STATUS.md
```

is used to maintain project continuity between development sessions.

It records:

* Current phase
* Current feature
* Completed work
* Work in progress
* Blockers
* Next task
* Important decisions
* Known issues
* Test status

---

# 🗺️ Development Roadmap

## Phase 0 — Foundation

* Laravel setup
* MySQL
* Git
* Tenancy design
* Database architecture
* Testing foundation
* AI API contract
* Project documentation

## Phase 1 — Academic Core

* Tenancy
* Roles & permissions
* Academic hierarchy
* Terms
* Courses
* Sections
* Prerequisites
* Enrolment
* Bulk import
* Learning content
* Progress tracking
* Student/instructor interfaces
* Demo data

## Phase 2 — Assessment & Grades

* Question bank
* Quiz engine
* Assignments
* Auto grading
* Manual grading
* Gradebook
* GPA
* Grade publishing
* Learning events
* AI integration

## Phase 3 — Communication & Dashboards

* Announcements
* Discussions
* Notifications
* Attendance
* Dashboards
* AI assistant
* Similarity reports
* Risk management
* Arabic RTL support

## Phase 4 — Hardening & Deployment

* Critical-path testing
* Performance review
* Authorization review
* Documentation
* Docker
* CI/CD
* Deployment
* Final demo preparation

---

# 🐳 Infrastructure

Docker and Redis are planned for later stages of development.

Local development currently uses:

```text
XAMPP
 └── MySQL

Laravel
 └── Local development server
```

Docker Compose will be introduced after the core application is stable.

---

# 🤝 Development Team

MANHAJ is developed as a collaborative internship project.

### Full Stack Developer Intern

Responsible for:

* Laravel
* React
* MySQL
* APIs
* Academic platform
* Authorization
* Testing
* AI integration

### Data Science / AI Intern

Responsible for:

* FastAPI
* Machine Learning
* AI models
* Feature engineering
* RAG
* Embeddings
* Similarity
* Model evaluation

---

# 📄 License

This project is currently developed as an internship/project deliverable.

License and distribution terms are to be determined.

```
```
