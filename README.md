# Khayal - AI-Powered Healthcare Platform

![Khayal](https://img.shields.io/badge/Khayal-Healthcare-22c55e?style=for-the-badge)

A production-grade AI-powered healthcare and hygiene full-stack application built with modern scalable architecture.

## Tech Stack

### Frontend
- **Next.js 14** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Recharts** for data visualization
- **ShadCN UI** components
- **Lucide React** icons

### Backend
- **FastAPI** (Python) with async architecture
- **PostgreSQL** with SQLAlchemy ORM
- **Redis** for caching
- **JWT Authentication**
- **WebSocket** support

### AI & Integrations
- **Groq API** for AI health assistant
- **Tesseract/EasyOCR** for prescription scanning
- **Google OAuth** for authentication
- **OpenStreetMap + Leaflet** for doctor & lab locations

## Features

### 1. Authentication System
- Email/Password signup with OTP verification
- Google OAuth login
- JWT with refresh tokens
- Remember me & session persistence
- Forgot/Reset password

### 2. User Dashboard
- Health summary widgets
- Upcoming appointments
- Medicine reminders
- Fitness tracking overview
- Interactive charts & graphs
- PDF health report export

### 3. AI Health Assistant
- Real-time AI chat powered by Groq API
- Symptom checker
- Health recommendations
- Chat history with markdown support
- Streaming response support

### 4. Doctor Appointment System
- Search doctors by specialization
- Disease-based recommendations
- Appointment booking & cancellation
- Ratings & reviews
- Interactive map with doctor & lab locations

### 5. Medicines & Lab Tests
- Medicine tracking with reminders
- Prescription OCR scanning
- Stock refill alerts
- Lab test booking
- Test report storage

### 6. Fitness & Gym
- Workout & diet tracking
- BMI calculator
- Step counter & calorie tracker
- Progress charts & analytics
- Water & sleep tracking

### 7. Admin Panel
- User management
- Analytics dashboard
- Activity monitoring
- Role-based access control

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### Installation

#### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker Deployment
```bash
docker-compose up --build
```

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | Database user | postgres |
| `POSTGRES_PASSWORD` | Database password | postgres |
| `POSTGRES_HOST` | Database host | localhost |
| `POSTGRES_DB` | Database name | khayal_db |
| `SECRET_KEY` | JWT secret key | (change in production) |
| `GROQ_API_KEY` | Groq AI API key | - |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| ~~`GOOGLE_MAPS_API_KEY`~~ | ~~Google Maps API key~~ | ~~-~~ |

### Frontend (`frontend/.env.local`)
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | http://localhost:8000/api/v1 |

## Project Structure

```
khayal/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # API route handlers
│   │   ├── core/               # Config, security, database
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   └── services/           # Business logic
│   ├── migrations/             # Alembic migrations
│   ├── tests/                  # Test suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js pages
│   │   ├── components/         # Reusable components
│   │   ├── lib/                # Utilities & API client
│   │   ├── types/              # TypeScript types
│   │   └── hooks/              # Custom hooks
│   ├── public/
│   └── package.json
└── docker-compose.yml
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Register
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/google` - Google OAuth
- `POST /api/v1/auth/send-otp` - Send OTP
- `POST /api/v1/auth/verify-otp` - Verify OTP
- `POST /api/v1/auth/refresh` - Refresh token

### Users
- `GET /api/v1/users/me` - Get profile
- `PUT /api/v1/users/me` - Update profile
- `POST /api/v1/users/upload-photo` - Upload photo

### Appointments
- `GET /api/v1/appointments` - List appointments
- `POST /api/v1/appointments` - Create appointment
- `PUT /api/v1/appointments/{id}/cancel` - Cancel

### Medicines
- `GET /api/v1/medicines` - List medicines
- `POST /api/v1/medicines` - Add medicine
- `DELETE /api/v1/medicines/{id}` - Delete medicine
- `POST /api/v1/medicines/scan-prescription` - OCR scan

### Chatbot
- `POST /api/v1/chatbot/chat` - Send message
- `GET /api/v1/chatbot/history` - Get history

### Fitness
- `GET /api/v1/fitness/progress` - Get progress
- `POST /api/v1/fitness/progress` - Log activity
- `POST /api/v1/fitness/bmi` - Calculate BMI

### Admin
- `GET /api/v1/admin/users` - List users
- `GET /api/v1/admin/analytics` - Platform analytics

## Security
- Password hashing with bcrypt
- JWT with access & refresh tokens
- CORS protection
- Rate limiting ready
- SQL injection prevention via ORM
- Environment variable management
- Secure file upload handling

## Testing
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

## Deployment
The application is deployment-ready for:
- **Vercel** (Frontend)
- **Render** (Backend)
- **Railway** (Full stack)
- **AWS** (Production)
- **DigitalOcean** (Production)

## License
MIT License - see LICENSE file for details
