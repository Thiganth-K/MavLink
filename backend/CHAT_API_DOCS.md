# Chat API - Superadmin <> Admin

Design notes
- One superadmin to many admins. Each admin can send messages to the superadmin. Superadmin may reply to any admin.
- No admin-to-admin messaging.
- Authentication: prototype uses headers `x-role` and `x-admin-id` (see `authMiddleware.js`).

Schemas
- ChatMessage
  - from: Admin ObjectId
  - to: Admin ObjectId (recipient)
  - content: string
  - direction: enum `ADMIN_TO_SUPERADMIN` | `SUPERADMIN_TO_ADMIN`
  - read: boolean
- Notification
  - user: Admin ObjectId (recipient)
  - type: string (eg. `NEW_MESSAGE`)
  - messageRef: ChatMessage ObjectId
  - read: boolean

Endpoints
- POST `/api/chat/admin/send`
  - Headers: `x-role: ADMIN`, `x-admin-id: <adminId>`
  - Body: `{ content: string }`
  - Creates message from admin -> superadmin and a notification for superadmin.

- POST `/api/chat/superadmin/reply`
  - Headers: `x-role: SUPER_ADMIN`, `x-admin-id: <superAdminId>`
  - Body: `{ toAdminId: <adminId>, content: string }`
  - Creates message from superadmin -> admin and a notification for that admin.

- GET `/api/chat/messages?withAdminId=<adminId>`
  - Headers: `x-admin-id: <adminId>` required
  - Returns messages where `from` or `to` is the current admin. Optional `withAdminId` filters conversation.

- POST `/api/chat/:id/read`
  - Headers: `x-admin-id: <adminId>` required
  - Marks message as read (only recipient may mark).

- GET `/api/notifications`
  - Headers: `x-admin-id: <adminId>` required
  - Returns notifications for the admin.

- POST `/api/notifications/:id/read`
  - Headers: `x-admin-id: <adminId>` required
  - Marks notification as read (only owner may mark).

Notes & next steps
- Real-time: for immediate notifications consider adding WebSocket or server-sent events. Current implementation stores notifications which can be polled by the frontend.
- Security: replace header-based auth with JWT/session in production.
