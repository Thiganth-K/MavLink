# Test: /api/admin/profile

This file contains quick examples to validate the `/api/admin/profile` endpoint.

Note: the endpoint requires headers used by `verifyAdmin` middleware:
- `X-Role`: should be `ADMIN`
- `X-Admin-Id`: the `adminId` of an existing Admin in the database

Replace `HOST`/`PORT` and `ADMIN_ID` with your environment values.

Expected successful JSON response:

```json
{
  "message": "Profile fetched",
  "profile": {
    "username": "adminusername",
    "adminId": "ADMIN001",
    "assignedBatchIds": ["BATCH2023A", "BATCH2023B"],
    "role": "ADMIN",
    "password": "plaintext_password"
  }
}
```

---

1) curl (Linux/macOS/Windows with curl):

```bash
# Replace host, port and ADMIN_ID
HOST=localhost
PORT=3000
ADMIN_ID=ADMIN001

curl -i -X GET "http://${HOST}:${PORT}/api/admin/profile" \
  -H "X-Role: ADMIN" \
  -H "X-Admin-Id: ${ADMIN_ID}"
```

If you have `jq` installed and want pretty output:

```bash
curl -s "http://${HOST}:${PORT}/api/admin/profile" -H "X-Role: ADMIN" -H "X-Admin-Id: ${ADMIN_ID}" | jq
```

2) PowerShell (Windows):

```powershell
$headers = @{
  'X-Role' = 'ADMIN'
  'X-Admin-Id' = 'ADMIN001'
}
Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/profile' -Headers $headers -Method Get
```

3) Node (fetch) — Node 18+ has global `fetch`:

```js
// save as scripts/testAdminProfile.js and run `node scripts/testAdminProfile.js`
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || '3000';
const ADMIN_ID = process.env.ADMIN_ID || 'ADMIN001';

async function run() {
  const url = `http://${HOST}:${PORT}/api/admin/profile`;
  const res = await fetch(url, {
    headers: {
      'X-Role': 'ADMIN',
      'X-Admin-Id': ADMIN_ID
    }
  });
  const body = await res.json();
  console.log('status', res.status);
  console.log(JSON.stringify(body, null, 2));
}

run().catch(err => { console.error(err); process.exit(1); });
```

4) Quick checklist if you get 403/404:
- Ensure the Admin with `adminId` exists in the DB.
- Ensure the backend server is running on the host/port you are calling.
- Confirm `verifyAdmin` header names (`X-Role` and `X-Admin-Id`) are present and correct.

---

If you want, I can add the small Node script above to `scripts/testAdminProfile.js` as an executable file too.
