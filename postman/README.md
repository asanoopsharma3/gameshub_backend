# Postman — GamesHub Backend

## Import

1. Open Postman → **Import**
2. Add both files:
   - `GamesHub-Backend.postman_collection.json`
   - `GamesHub-Local.postman_environment.json`
3. Select environment **GamesHub Local**

## Run

Use **Collection Runner** on the **Callback** folder, or run requests individually.

- `requestNo` is auto-generated in pre-request scripts (unique per run).
- Default `baseUrl`: `http://localhost:3003/api/v1`

## Tests included

| Request | Expected |
|---------|----------|
| SUBSCRIBE — flat query params | 200, `ok: true` |
| UNSUB — flat query params | 200 |
| SUBSCRIBE — envelope (`data` JSON) | 200 |
| SUBSCRIBE — partner `code` JSON fragment | 200 |
| Missing params | 400 |
| POST not allowed | 404 |

Duplicate `requestNo` values are inserted every time (no skip). Run `scripts/drop-requestno-unique.sql` on the DB if inserts fail with a unique constraint error.
