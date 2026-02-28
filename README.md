# SocialVote Validator

Vote validation dashboard for social media campaigns. Tracks engagement across Twitter, YouTube, Instagram, and Facebook.

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Environment Variables

Create `backend/.env`:
```
DATABASE_URL=sqlite+aiosqlite:///./socialvote.db
TWITTER_BEARER_TOKEN=your_token
YOUTUBE_API_KEY=your_key
INSTAGRAM_ACCESS_TOKEN=your_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_id
FACEBOOK_ACCESS_TOKEN=your_token
FACEBOOK_PAGE_ID=your_page_id
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| POST /campaigns/ | Create campaign |
| GET /campaigns/ | List campaigns |
| POST /posts/ | Add post to track |
| GET /platforms/{platform}/sync-engagements/{post_id} | Sync engagements |
| POST /validate/votes/{post_id} | Validate votes |
| GET /export/csv/{campaign_id} | Export CSV |

## Platform Support

| Platform | Followers | Likes | Comments |
|----------|-----------|-------|----------|
| Twitter | Yes | Yes | Yes |
| YouTube | No | No | Yes |
| Instagram | No | No | Yes |
| Facebook | No | Yes | Yes |

## License

MIT
