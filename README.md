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

## Known Technical Debt
- `react-scripts` 5.0.1 should be upgraded or replaced with Vite (CRA is no longer maintained).
