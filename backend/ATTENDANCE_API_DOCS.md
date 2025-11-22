# Attendance API Documentation - Session-Based System

## Overview
Complete session-based attendance management system supporting **FN (Forenoon)** and **AN (Afternoon)** sessions. Each student can have separate attendance records for both sessions per day.

## Database Schema

### Attendance Model
```javascript
{
  studentId: ObjectId (required) - Reference to Student
  regno: String (required) - Student registration number
  studentname: String (required) - Student name
  date: Date (required) - Attendance date (normalized to midnight UTC)
  session: String (required) - "FN" or "AN"
  status: String (required) - "Present", "Absent", or "On-Duty"
  markedBy: String (required) - Admin username who marked attendance
  markedAt: Date - Timestamp when marked/updated
  createdAt: Date - Auto-generated
  updatedAt: Date - Auto-generated
}
```

### Indexes
- **Compound Unique Index**: `{studentId: 1, date: 1, session: 1}` - Prevents duplicate records per session
- **Query Optimization**: `{date: 1, session: 1}` and `{studentId: 1, session: 1}`

---

## API Endpoints

### 1. Mark Attendance
**Endpoint**: `POST /api/attendance/mark`

Marks or updates attendance for multiple students in a specific session.

**Request Body**:
```json
{
  "attendanceData": [
    {
      "studentId": "507f1f77bcf86cd799439011",
      "regno": "2021CS001",
      "studentname": "John Doe",
      "date": "2025-01-15",
      "session": "FN",
      "status": "Present"
    },
    {
      "studentId": "507f1f77bcf86cd799439012",
      "regno": "2021CS002",
      "studentname": "Jane Smith",
      "date": "2025-01-15",
      "session": "FN",
      "status": "Absent"
    }
  ],
  "markedBy": "admin@test.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Attendance processed: 2 successful, 0 failed",
  "results": [
    {
      "studentId": "507f1f77bcf86cd799439011",
      "regno": "2021CS001",
      "studentname": "John Doe",
      "session": "FN",
      "status": "created",
      "attendanceStatus": "Present"
    }
  ],
  "totalProcessed": 2,
  "successCount": 2,
  "errorCount": 0
}
```

**Behavior**:
- If record exists for (studentId, date, session): **Updates** the status
- If record doesn't exist: **Creates** new record
- Validates session (FN/AN) and status (Present/Absent/On-Duty)

---

### 2. Get Attendance by Date (Both Sessions)
**Endpoint**: `GET /api/attendance/date?date=YYYY-MM-DD`

Returns all attendance records for a specific date (both FN and AN sessions).

**Example Request**:
```
GET /api/attendance/date?date=2025-01-15
```

**Response**:
```json
{
  "success": true,
  "message": "Found 6 total attendance records for 2025-01-15",
  "data": [
    {
      "_id": "691e131f6cc9df558c0af905",
      "studentId": "507f1f77bcf86cd799439013",
      "regno": "2021CS003",
      "studentname": "Bob Johnson",
      "date": "2025-01-15T00:00:00.000Z",
      "session": "AN",
      "status": "Present",
      "markedBy": "admin@test.com",
      "markedAt": "2025-11-19T18:57:35.766Z"
    }
    // ... more records
  ],
  "summary": {
    "date": "2025-01-15",
    "totalRecords": 6,
    "fnCount": 3,
    "anCount": 3
  }
}
```

---

### 3. Get Attendance by Date and Session (Session-Specific)
**Endpoint**: `GET /api/attendance/date/session?date=YYYY-MM-DD&session=FN|AN`

Returns attendance records for a specific date and session only.

**Example Request**:
```
GET /api/attendance/date/session?date=2025-01-15&session=FN
```

**Response**:
```json
{
  "success": true,
  "message": "Found 3 attendance records for FN session on 2025-01-15",
  "data": [
    {
      "_id": "691e129aa958159023a43866",
      "studentId": "507f1f77bcf86cd799439011",
      "regno": "2021CS001",
      "studentname": "John Doe",
      "date": "2025-01-15T00:00:00.000Z",
      "session": "FN",
      "status": "Present",
      "markedBy": "admin@test.com"
    }
    // ... more FN records only
  ],
  "summary": {
    "date": "2025-01-15",
    "session": "FN",
    "totalRecords": 3,
    "presentCount": 1,
    "absentCount": 1,
    "onDutyCount": 1
  }
}
```

**Use Case**: Perfect for Mark Attendance page when switching between FN/AN toggle.

---

### 4. Get Session Summary by Date (Statistics)
**Endpoint**: `GET /api/attendance/date/summary?date=YYYY-MM-DD`

Returns statistical summary for both FN and AN sessions without full record data.

**Example Request**:
```
GET /api/attendance/date/summary?date=2025-01-15
```

**Response**:
```json
{
  "success": true,
  "message": "Session summary for 2025-01-15",
  "date": "2025-01-15",
  "summary": {
    "FN": {
      "session": "FN",
      "totalRecords": 3,
      "presentCount": 1,
      "absentCount": 1,
      "onDutyCount": 1
    },
    "AN": {
      "session": "AN",
      "totalRecords": 3,
      "presentCount": 2,
      "absentCount": 1,
      "onDutyCount": 0
    },
    "totalRecords": 6
  }
}
```

**Use Case**: Display session cards in View Attendance page.

---

### 5. Get Attendance Summary by Multiple Dates
**Endpoint**: `GET /api/attendance/summary?dates=YYYY-MM-DD,YYYY-MM-DD,...`

Returns session-wise statistics for multiple dates (comma-separated).

**Example Request**:
```
GET /api/attendance/summary?dates=2025-01-15,2025-01-16,2025-01-17
```

**Response**:
```json
{
  "success": true,
  "message": "Summary for 3 dates",
  "data": [
    {
      "date": "2025-01-15",
      "FN": {
        "total": 3,
        "present": 1,
        "absent": 1,
        "onDuty": 1
      },
      "AN": {
        "total": 3,
        "present": 2,
        "absent": 1,
        "onDuty": 0
      }
    },
    {
      "date": "2025-01-16",
      "FN": { "total": 0, "present": 0, "absent": 0, "onDuty": 0 },
      "AN": { "total": 0, "present": 0, "absent": 0, "onDuty": 0 }
    }
  ]
}
```

**Use Case**: Attendance calendar view showing multiple days at once.

---

### 6. Get Attendance by Date Range
**Endpoint**: `GET /api/attendance/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Returns all attendance records within a date range, grouped by date and session.

**Example Request**:
```
GET /api/attendance/range?startDate=2025-01-15&endDate=2025-01-20
```

**Response**:
```json
{
  "success": true,
  "message": "Found 6 records from 2025-01-15 to 2025-01-20",
  "data": [
    // All attendance records in date order
  ],
  "groupedByDate": {
    "2025-01-15": {
      "FN": [ /* FN records */ ],
      "AN": [ /* AN records */ ]
    },
    "2025-01-16": {
      "FN": [],
      "AN": []
    }
  },
  "summary": {
    "startDate": "2025-01-15",
    "endDate": "2025-01-20",
    "totalRecords": 6,
    "datesCount": 2
  }
}
```

---

## Error Responses

### Validation Errors (400)
```json
{
  "success": false,
  "message": "session must be either 'FN' or 'AN'"
}
```

### Server Errors (500)
```json
{
  "success": false,
  "message": "Failed to mark attendance",
  "error": "Detailed error message"
}
```

---

## Usage Examples

### PowerShell Testing

#### Mark FN Session Attendance
```powershell
$body = @{
  attendanceData = @(
    @{
      studentId = "507f1f77bcf86cd799439011"
      regno = "2021CS001"
      studentname = "John Doe"
      date = "2025-01-15"
      session = "FN"
      status = "Present"
    }
  )
  markedBy = "admin@test.com"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:5001/api/attendance/mark" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

#### Get FN Session Attendance
```powershell
Invoke-RestMethod -Uri "http://localhost:5001/api/attendance/date/session?date=2025-01-15&session=FN"
```

### JavaScript/Frontend Example
```javascript
// Mark attendance
const markAttendance = async (attendanceData, session) => {
  const response = await fetch('http://localhost:5001/api/attendance/mark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attendanceData: attendanceData.map(student => ({
        ...student,
        session: session // 'FN' or 'AN'
      })),
      markedBy: adminUsername
    })
  });
  return response.json();
};

// Get session-specific attendance
const getAttendanceBySession = async (date, session) => {
  const response = await fetch(
    `http://localhost:5001/api/attendance/date/session?date=${date}&session=${session}`
  );
  return response.json();
};
```

---

## Key Features

✅ **Session Isolation**: FN and AN sessions are completely independent  
✅ **Duplicate Prevention**: Compound unique index prevents duplicate records  
✅ **Flexible Queries**: Get all sessions or specific session data  
✅ **Statistics**: Built-in counting for Present/Absent/On-Duty  
✅ **Bulk Operations**: Mark multiple students' attendance in one request  
✅ **Update Support**: Automatically updates existing records  
✅ **Validation**: Strict validation for session and status values  
✅ **Error Handling**: Comprehensive error messages with success/failure tracking  

---

## Database Migration

If upgrading from old single-session system, run:
```bash
node fix-indexes.js
```

This will:
1. Drop old `studentId_1_date_1` index
2. Create new `studentId_1_date_1_session_1` compound index
3. Verify all indexes are correct

---

## Notes

- All dates are normalized to midnight UTC
- Session field is **required** for all operations
- Status must be one of: "Present", "Absent", "On-Duty"
- Session must be one of: "FN", "AN"
- markedAt timestamp is auto-updated on every change
