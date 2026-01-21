import { supabaseAdmin } from '../src/config/supabase.js';

async function cleanupExpiredTrash() {
  const retentionDays = 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  console.log('🧹 Cleaning expired trash...');

  // Delete old files
  await supabaseAdmin
    .from('files')
    .delete()
    .eq('is_deleted', true)
    .lt('updated_at', cutoffDate.toISOString());

  // Delete old folders
  await supabaseAdmin
    .from('folders')
    .delete()
    .eq('is_deleted', true)
    .lt('updated_at', cutoffDate.toISOString());

  console.log('✅ Trash cleanup finished');
}

cleanupExpiredTrash()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Trash cleanup failed', err);
    process.exit(1);
  });
