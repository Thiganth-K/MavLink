export async function dropLegacyAttendanceIndexes(db) {
  if (!db) throw new Error('db instance required');
  try {
    const coll = db.collection('attendances');
    const indexes = await coll.indexes();
    const dropped = [];
    for (const idx of indexes) {
      try {
        if (idx.name === 'studentId_1_date_1' || (idx.key && idx.key.studentId === 1 && idx.key.date === 1)) {
          await coll.dropIndex(idx.name);
          dropped.push(idx.name);
        }
      } catch (dropErr) {
        // Return the error for the caller to log if needed
        return { dropped, error: dropErr };
      }
    }
    return { dropped };
  } catch (err) {
    return { dropped: [], error: err };
  }
}
