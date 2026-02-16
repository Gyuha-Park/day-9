-- Add avatar_url column to messages table
alter table messages
add column if not exists avatar_url text;

-- (Optional) Update existing messages to have a default or NULL
-- No action needed as it defaults to null
