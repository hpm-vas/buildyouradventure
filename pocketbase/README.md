# PocketBase Setup for Plot-smithy

## Quick Start

1. **Download PocketBase** from [pocketbase.io/docs](https://pocketbase.io/docs/)
   - Windows: `pocketbase_X.X.X_windows_amd64.zip`
   - Extract to this `pocketbase/` folder

2. **Start PocketBase**
   ```bash
   cd pocketbase
   ./pocketbase serve
   ```
   
3. **Open Admin UI** at `http://127.0.0.1:8090/_/`
   - Create your admin account on first visit

4. **Create the `users` collection** (Auth collection):
   
   | Field | Type | Options |
   |-------|------|---------|
   | `pin` | Text | Required, Unique, Min: 6, Max: 6, Pattern: `^\d{6}$` |
   | `role` | Select | Required, Values: `player`, `reader`, `admin` |
   | `name` | Text | Optional |

   **Important:** Create as "Auth collection" (not "Base collection")

5. **Add test users** via Admin UI:
   
   | Email (required for auth) | PIN | Role | Name |
   |---------------------------|-----|------|------|
   | `admin@local` | `000000` | `admin` | Game Master |
   | `player@local` | `123456` | `player` | Test Player |
   | `reader@local` | `111111` | `reader` | Test Reader |

6. **Start Angular app**
   ```bash
   ng serve
   ```

7. **Test login** at `http://localhost:4200` with PIN `000000`

---

## File Structure

```
pocketbase/
├── pocketbase.exe      # Downloaded binary (not in git)
├── pb_hooks/
│   └── main.pb.js      # Custom PIN login endpoint
├── pb_data/            # SQLite database (auto-created, not in git)
└── README.md           # This file
```

## Custom Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pin-login` | POST | Authenticate with `{ "pin": "123456" }` |
| `/api/health` | GET | Health check |

## API Examples

```bash
# Login with PIN
curl -X POST http://127.0.0.1:8090/api/pin-login \
  -H "Content-Type: application/json" \
  -d '{"pin": "000000"}'

# Response:
# { "token": "eyJ...", "user": { "id": "...", "role": "admin", "name": "Game Master" } }
```
