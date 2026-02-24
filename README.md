# Healthcare Backend - Django REST API

A backend system for managing patients, doctors, and their assignments. Built with Django, DRF, PostgreSQL, and JWT auth.

## Setup

### 1. Create a virtual environment and install packages

```bash
python -m venv venv
source venv/bin/activate        # on linux/mac
venv\Scripts\activate           # on windows
pip install -r requirements.txt
```

### 2. Setup PostgreSQL

Create a database called `healthcare_db` in PostgreSQL (or change the name in `.env`).

```sql
CREATE DATABASE healthcare_db;
```

### 3. Configure environment variables

Edit the `.env` file in the project root and set your PostgreSQL credentials:

```
DB_NAME=healthcare_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

### 4. Run migrations and start the server

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

The API will be live at `http://127.0.0.1:8000/api/`.

---

## API Endpoints

### Auth

| Method | Endpoint              | What it does                    | Auth needed? |
|--------|-----------------------|---------------------------------|--------------|
| POST   | /api/auth/register/   | Register (name, email, password)| No           |
| POST   | /api/auth/login/      | Login, get JWT tokens           | No           |

### Patients (auth required)

| Method | Endpoint              | What it does                    |
|--------|-----------------------|---------------------------------|
| POST   | /api/patients/        | Add a patient                   |
| GET    | /api/patients/        | List your patients              |
| GET    | /api/patients/\<id\>/ | Get one patient                 |
| PUT    | /api/patients/\<id\>/ | Update a patient                |
| DELETE | /api/patients/\<id\>/ | Delete a patient                |

### Doctors (auth required)

| Method | Endpoint             | What it does                     |
|--------|----------------------|----------------------------------|
| POST   | /api/doctors/        | Add a doctor                     |
| GET    | /api/doctors/        | List all doctors                 |
| GET    | /api/doctors/\<id\>/ | Get one doctor                   |
| PUT    | /api/doctors/\<id\>/ | Update a doctor                  |
| DELETE | /api/doctors/\<id\>/ | Delete a doctor                  |

### Patient-Doctor Mappings (auth required)

| Method | Endpoint                      | What it does                          |
|--------|-------------------------------|---------------------------------------|
| POST   | /api/mappings/                | Assign a doctor to a patient          |
| GET    | /api/mappings/                | List all mappings                     |
| GET    | /api/mappings/\<patient_id\>/ | Get all doctors for a patient         |
| DELETE | /api/mappings/\<id\>/         | Remove a mapping                      |

---

## How to use (quick Postman walkthrough)

**1. Register**
```
POST /api/auth/register/
Body: { "name": "John", "email": "john@example.com", "password": "mypassword123" }
```

**2. Login**
```
POST /api/auth/login/
Body: { "email": "john@example.com", "password": "mypassword123" }
Response: { "access": "eyJ...", "refresh": "eyJ..." }
```

**3. Use the access token**

For all other endpoints, add this header:
```
Authorization: Bearer <your_access_token>
```

**4. Create a patient**
```
POST /api/patients/
Body: { "name": "Jane Doe", "age": 30, "gender": "Female" }
```

**5. Create a doctor**
```
POST /api/doctors/
Body: { "name": "Dr. Smith", "specialization": "Cardiology" }
```

**6. Assign doctor to patient**
```
POST /api/mappings/
Body: { "patient": 1, "doctor": 1 }
```

---

## Project structure

```
├── manage.py
├── requirements.txt
├── .env
├── .gitignore
├── README.md
├── healthcare/          # django project config
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
└── api/                 # single app - all the logic lives here
    ├── models.py        # Patient, Doctor, PatientDoctorMapping
    ├── serializers.py   # validation and data shaping
    ├── views.py         # API logic
    ├── urls.py          # route definitions
    └── admin.py         # register models in django admin
```
