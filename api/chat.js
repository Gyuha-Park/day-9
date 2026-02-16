import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Check configuration
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return response.status(500).json({ error: 'Server configuration error: Missing Supabase keys' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Authenticate User
    const authHeader = request.headers.authorization;
    let user = null;

    if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
            const { data: { user: u }, error } = await supabase.auth.getUser(token);
            if (!error && u) user = u;
        }
    }

    if (!user) {
        return response.status(401).json({ error: 'Unauthorized: Please login first' });
    }

    // 2. Handle Methods
    try {
        if (request.method === 'GET') {
            // Fetch latest 50 messages from 'messages' table
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            // Return in chronological order (oldest first) for chat UI
            const messages = data ? data.reverse() : [];
            return response.status(200).json({ messages });

        } else if (request.method === 'POST') {
            // Send new message
            const { content } = request.body;

            if (!content || typeof content !== 'string' || !content.trim()) {
                return response.status(400).json({ error: 'Message content is required' });
            }

            const { data, error } = await supabase
                .from('messages')
                .insert([
                    {
                        user_id: user.id,
                        user_email: user.email,
                        content: content.trim()
                    }
                ])
                .select();

            if (error) throw error;

            return response.status(200).json({ message: data[0] });

        } else {
            response.setHeader('Allow', ['GET', 'POST']);
            return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
        }
    } catch (error) {
        console.error('Chat API Error:', error);
        return response.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
