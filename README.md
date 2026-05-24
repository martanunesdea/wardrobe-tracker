# Wardrobe App

Full-stack personal wardrobe organiser: React frontend + Python/Flask backend + SQLite database.

## Architecture

```
wardrobe-app/
├── backend/
│   ├── server.py                  # App factory + entry point
│   ├── middleware/auth.py         # JWT + require_auth decorator
│   ├── models/database.py         # SQLite connection + schema init
│   ├── routes/
│   │   ├── auth_routes.py         # /api/auth/register|login
│   │   ├── collection_routes.py   # CRUD /api/collections
│   │   ├── item_routes.py         # CRUD /api/items + photo upload
│   │   └── wishlist_routes.py     # Wishlist + shopping priority
│   └── uploads/                   # User photos (gitignored)
├── frontend/src/
│   ├── api/client.js              # All HTTP calls centralised
│   ├── hooks/
│   │   ├── useAuth.js             # Auth context + JWT storage
│   │   ├── useWardrobe.js         # Collections + items state
│   │   └── useWishlist.js         # Wishlist + priority state
│   └── components/
│       ├── AuthPage.jsx           # Login/Register
│       ├── WardrobeView.jsx       # File-tree wardrobe
│       ├── WishlistView.jsx       # Wishlist + shopping priority
│       ├── ItemModal.jsx          # Create/edit item modal
│       └── shared/
│           ├── Modal.jsx          # Generic accessible modal
│           └── StarRating.jsx     # Reusable star + rating bar
└── database/
    ├── schema.sql                 # Table definitions
    └── wardrobe.db                # Auto-created on first run
```

## Quick Start

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python server.py
# Runs on http://localhost:5000
```
If you already use a global environment, skip the `venv` lines and run `pip install -r requirements.txt` there instead.

### Frontend
```bash
cd frontend
npm install
npm start
# Opens http://localhost:3000
```

## iOS Refactoring Notes
- `api/client.js` → Swift NetworkService (one swap)
- `hooks/` → Swift ViewModels (already pure data logic)
- Components only receive props/callbacks — easy to re-skin in SwiftUI
- Backend routes are thin and stateless — no changes needed
- SQLite can stay for local storage or migrate to PostgreSQL

## Environment Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| JWT_SECRET | *(none — required unless FLASK_DEBUG=true)* | Signing key for JWTs |
| FLASK_DEBUG | *(unset)* | Set to `true` for development |
| DB_PATH | ../database/wardrobe.db | SQLite path |
| PORT | 5000 | Backend port |
| CORS_ORIGINS | http://localhost:3000 | Comma-separated allowed origins |
| REACT_APP_API_URL | *(empty — uses proxy)* | API base for frontend |

## Deployment (Fly.io)

The app is configured for single-container deployment on [Fly.io](https://fly.io).
At build time, React is compiled to static files and served by Flask alongside the API.
SQLite and uploads live on a persistent volume.

### One-time setup

```bash
# Install the Fly CLI
brew install flyctl          # macOS (or see https://fly.io/docs/flyctl/install/)

# Authenticate
fly auth login

# Create the app (pick a unique name if "wardrobe-app" is taken)
fly apps create wardrobe-app

# Create a 1 GB persistent volume in London (change region if needed)
fly volumes create wardrobe_data --size 1 --region lhr

# Set the JWT signing secret
fly secrets set JWT_SECRET=$(openssl rand -base64 32)

# Deploy
fly deploy
```

### Subsequent deploys

```bash
fly deploy
```

### Useful commands

```bash
fly status                    # VM status
fly logs                      # Live logs
fly ssh console               # SSH into the running machine
fly volumes list              # Check volume status
```

## Known Technical Debt
- `react-scripts` 5.0.1 should be upgraded or replaced with Vite (CRA is no longer maintained).
