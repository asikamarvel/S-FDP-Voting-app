# SocialVote Validator Dashboard

A web-based dashboard that validates social-media votes by cross-checking post engagement (likes/comments) against verified followers or subscribers across multiple platforms.

## Project Structure

```
Voting app/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── adapters/       # Platform adapters (Instagram, Twitter, YouTube, TikTok)
│   │   ├── models/         # SQLAlchemy database models
│   │   ├── routers/        # API route handlers
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic (sync, validation)
│   │   ├── config.py       # Configuration
│   │   ├── database.py     # Database setup
│   │   └── main.py         # FastAPI application
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/               # Next.js React frontend
    ├── src/
    │   ├── app/           # Next.js app router
    │   ├── components/    # React components
    │   └── lib/           # API client
    ├── package.json
    └── tailwind.config.js
```

## Core Validation Logic

**A vote is VALID if and only if:**
1. The account has engaged (like or comment) with the post
2. AND that account exists in the official account's follower list

Otherwise, the vote is marked as INVALID.

## Prerequisites

Before running this project, ensure you have:

1. **Python 3.10+** installed
2. **Node.js 18+** installed
3. **PostgreSQL** database running
4. **Redis** (optional, for Celery background jobs)

## Setup Instructions

### 1. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE socialvote;
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and configure
cp .env.example .env
# Edit .env with your database URL and API keys

# Run the backend server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

### 4. Access the Dashboard

- **Frontend Dashboard:** http://localhost:3000
- **Backend API Docs:** http://localhost:8000/docs

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/campaigns/` | Create a new campaign |
| GET | `/campaigns/` | List all campaigns |
| GET | `/campaigns/{id}` | Get campaign details |
| POST | `/posts/` | Add a post to track |
| GET | `/posts/` | List posts |
| GET | `/platforms/{platform}/sync-followers/{campaign_id}` | Sync followers |
| GET | `/platforms/{platform}/sync-engagements/{post_id}` | Sync engagements |
| POST | `/validate/votes/{post_id}` | Validate votes for a post |
| POST | `/validate/campaign/{campaign_id}` | Validate entire campaign |
| GET | `/export/csv/{campaign_id}` | Export results as CSV |

## Platform API Keys Required

### Instagram (Business/Creator Account)
- `INSTAGRAM_ACCESS_TOKEN` - From Facebook Developer Portal
- `INSTAGRAM_BUSINESS_ACCOUNT_ID` - Your business account ID

### Twitter/X
- `TWITTER_BEARER_TOKEN` - From Twitter Developer Portal
- Requires Basic or Pro API access for full functionality

### YouTube
- `YOUTUBE_API_KEY` - From Google Cloud Console
- Note: YouTube doesn't expose subscriber lists (comment-only validation)

### TikTok
- `TIKTOK_ACCESS_TOKEN` - From TikTok for Developers
- Note: API is unstable (comment-based validation preferred)

## CSV Export Format

```csv
platform,post_id,username,engagement_type,is_valid
instagram,POST123,user_a,like,TRUE
instagram,POST123,user_b,comment,FALSE
```

## Platform Limitations

| Platform | Followers | Likes | Comments | Notes |
|----------|-----------|-------|----------|-------|
| Instagram | ✅ | ✅ | ✅ | Requires Business Account |
| Twitter/X | ✅ | ✅ | ✅ | Paid API tiers may apply |
| YouTube | ❌ | ❌ | ✅ | Comment-only validation |
| TikTok | ❌ | ❌ | ✅ | API unstable, comment-based |

## Development

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Adding a New Platform Adapter

1. Create a new file in `backend/app/adapters/`
2. Extend `BasePlatformAdapter` class
3. Implement required methods: `fetch_followers`, `fetch_post_likes`, `fetch_post_comments`
4. Register in `backend/app/adapters/__init__.py`

## License

MIT
