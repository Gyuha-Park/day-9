-- Allow users to update their own messages
-- This is necessary to update avatar_url in past messages when profile changes
create policy "Users can update their own messages"
on messages for update
using ( auth.uid() = user_id );
