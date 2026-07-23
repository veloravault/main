-- vault_documents.size_bytes and storage_path were writable via direct
-- authenticated INSERT/UPDATE. Since RLS only scopes rows to their owner and
-- never validates size_bytes against reality, a technical user could call
-- the Data API directly (bypassing the app entirely) and either insert a row
-- claiming an arbitrary size_bytes for an object of any real size in R2, or
-- later UPDATE an existing row's storage_path/size_bytes to swap in a larger
-- object - defeating plan storage limits in both directions. The app itself
-- never updates this table and its inserts now go through
-- /api/storage/confirm-upload, which HEADs R2 for the object's real size
-- before inserting via the service role - direct authenticated write access
-- is no longer needed.

revoke insert, update on table public.vault_documents from authenticated;
