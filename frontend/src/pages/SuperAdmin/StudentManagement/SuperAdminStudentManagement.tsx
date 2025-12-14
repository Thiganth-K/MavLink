 
import StudentManagement from './StudentManagement';

export default function SuperAdminStudentManagement() {
  // Lightweight wrapper so Super Admins get their own route.
  // We reuse the existing `StudentManagement` component to avoid duplicating logic.
  return <StudentManagement />;
}
