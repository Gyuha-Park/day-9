
// Supabase Client Initialization
const SUPABASE_URL = "https://srapnlzsodyfiesunptl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyYXBubHpzb2R5Zmllc3VucHRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Mzk1NTYsImV4cCI6MjA4NjExNTU1Nn0.5bvgv-AkZGYhRH19SWELZljLNM0DbOmW4Cr7VjUZObI";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    // Section Elements
    const loginSection = document.getElementById('login-section');
    const appSection = document.getElementById('app-section');

    // Auth Form Elements
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const googleBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userEmailSpan = document.getElementById('user-email');

    // App Elements
    const analyzeBtn = document.getElementById('analyze-btn');
    const diaryInput = document.getElementById('diary-input');
    const responseText = document.getElementById('response-text');
    const voiceBtn = document.getElementById('voice-btn');
    const historyList = document.getElementById('history-list');

    // Chat Elements
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatImageInput = document.getElementById('chat-image-input');
    const chatAttachBtn = document.getElementById('chat-attach-btn');
    let chatChannel = null;

    // Profile Elements
    const profileTrigger = document.getElementById('profile-trigger');
    const profileFileInput = document.getElementById('profile-file-input');
    const changePhotoBtn = document.getElementById('change-photo-btn');
    const chatProfileImg = document.getElementById('chat-profile-img');
    const chatProfileDefault = document.getElementById('chat-profile-default');

    // --- Helper Functions ---
    // (Must be defined before they are used in updateAuthUI)

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const createHistoryCard = (item) => {
        const card = document.createElement('div');
        card.className = 'history-card';

        card.innerHTML = `
            <div class="card-header">
                <span class="date">${formatDate(item.createdAt)}</span>
            </div>
            <div class="card-body">
                <div class="diary-content">
                    <p>${item.content}</p>
                </div>
                <div class="ai-content">
                    <span class="ai-label">AI의 답변</span>
                    <p>${item.aiMessage.replace(/\n/g, '<br>')}</p>
                </div>
            </div>
        `;
        return card;
    };

    const fetchHistory = async () => {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();

            if (!session) return; // 세션이 없으면 히스패치 안함

            const response = await fetch('/api/history', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (response.status === 401) {
                // 토큰 만료 등의 이슈로 401이면 로그인 화면으로 보낼 수도 있음
                console.error('Unauthorized access to history');
                return;
            }

            const data = await response.json();

            if (data.history && data.history.length > 0) {
                historyList.innerHTML = ''; // Clear loading message
                data.history.forEach(item => {
                    const card = createHistoryCard(item);
                    historyList.appendChild(card);
                });
            } else {
                historyList.innerHTML = '<p class="empty-message">아직 기록된 일기가 없습니다. 첫 일기를 작성해보세요!</p>';
            }
        } catch (error) {
            console.error('History fetch error:', error);
            historyList.innerHTML = '<p class="error-message">히스토리를 불러오지 못했습니다.</p>';
        }
    };

    // Chat Functions
    const fetchChatMessages = async () => {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) return;

            const response = await fetch('/api/chat', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch chat messages');

            const data = await response.json();
            const messages = data.messages || [];

            renderChatMessages(messages, session.user.email);
        } catch (error) {
            console.error('Error fetching chat messages:', error);
            chatMessages.innerHTML = '<div class="chat-placeholder">메시지를 불러오지 못했습니다.</div>';
        }
    };

    const renderChatMessages = (messages, userEmail) => {
        if (!messages || messages.length === 0) {
            chatMessages.innerHTML = '<div class="chat-placeholder">아직 메시지가 없습니다. 첫 대화를 시작해보세요!</div>';
            return;
        }

        chatMessages.innerHTML = messages.map(msg => {
            const isMine = msg.user_email === userEmail;
            const senderName = isMine ? '나' : (msg.user_email ? msg.user_email.split('@')[0] : '익명');

            const avatarHtml = msg.avatar_url
                ? `<img src="${msg.avatar_url}" class="chat-avatar" alt="profile" onerror="this.onerror=null; this.src='https://via.placeholder.com/32?text=?'">`
                : `<div class="chat-avatar-default">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                   </div>`;

            // Check for image message format ![image](url)
            let contentHtml = msg.content;
            const imageMatch = msg.content.match(/^!\[image\]\((.+)\)$/);

            if (imageMatch) {
                const imageUrl = imageMatch[1];
                contentHtml = `<img src="${imageUrl}" class="chat-image" alt="첨부 이미지" onerror="this.outerHTML='<div class=\\'chat-image-error\\'>⚠️ 이미지 로드 실패</div>'">`;
            } else {
                // Escape HTML to prevent XSS for text messages
                const div = document.createElement('div');
                div.textContent = msg.content;
                contentHtml = div.innerHTML;
            }

            return `
                <div class="message-row ${isMine ? 'row-mine' : 'row-others'}">
                    ${!isMine ? avatarHtml : ''}
                    <div class="message-bubble ${isMine ? 'message-mine' : 'message-others'}">
                        <span class="message-sender">${senderName}</span>
                        <div class="message-content">${contentHtml}</div>
                    </div>
                    ${isMine ? avatarHtml : ''}
                </div>
            `;
        }).join('');

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const addMessageToChat = (msg, userEmail) => {
        // Prevent duplicate messages
        if (msg.id && document.querySelector(`.message-row[data-message-id="${msg.id}"]`)) {
            return;
        }

        // Remove placeholder if exists
        const placeholder = chatMessages.querySelector('.chat-placeholder');
        if (placeholder) {
            chatMessages.innerHTML = '';
        }

        const isMine = msg.user_email === userEmail;
        const senderName = isMine ? '나' : (msg.user_email ? msg.user_email.split('@')[0] : '익명');

        const avatarHtml = msg.avatar_url
            ? `<img src="${msg.avatar_url}" class="chat-avatar" alt="profile" onerror="this.onerror=null; this.src='https://via.placeholder.com/32?text=?'">`
            : `<div class="chat-avatar-default">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
               </div>`;

        // Check for image message format ![image](url)
        let contentHtml = msg.content;
        const imageMatch = msg.content.match(/^!\[image\]\((.+)\)$/);

        if (imageMatch) {
            const imageUrl = imageMatch[1];
            contentHtml = `<img src="${imageUrl}" class="chat-image" alt="첨부 이미지" onerror="this.outerHTML='<div class=\\'chat-image-error\\'>⚠️ 이미지 로드 실패</div>'">`;
        } else {
            // Escape HTML to prevent XSS for text messages
            const div = document.createElement('div');
            div.textContent = msg.content;
            contentHtml = div.innerHTML;
        }

        const messageRow = document.createElement('div');
        messageRow.className = `message-row ${isMine ? 'row-mine' : 'row-others'}`;
        if (msg.id) messageRow.dataset.messageId = msg.id;

        messageRow.innerHTML = `
            ${!isMine ? avatarHtml : ''}
            <div class="message-bubble ${isMine ? 'message-mine' : 'message-others'}">
                <span class="message-sender">${senderName}</span>
                <div class="message-content">${contentHtml}</div>
            </div>
            ${isMine ? avatarHtml : ''}
        `;

        chatMessages.appendChild(messageRow);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const setupRealtimeChat = async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;

        // Unsubscribe from previous channel if exists
        if (chatChannel) {
            await supabaseClient.removeChannel(chatChannel);
            chatChannel = null;
        }

        // Create new channel and subscribe to INSERT events
        chatChannel = supabaseClient
            .channel('public:messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    console.log('Real-time message received:', payload);
                    if (payload.new) {
                        addMessageToChat(payload.new, session.user.email);
                    }
                }
            )
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to messages table');
                }
            });

        // Load existing messages
        await fetchChatMessages();
    };

    const cleanupRealtimeChat = async () => {
        if (chatChannel) {
            await supabaseClient.removeChannel(chatChannel);
            chatChannel = null;
        }
    };

    const sendChatMessage = async (e) => {
        e.preventDefault();
        const content = chatInput.value.trim();
        if (!content) return;

        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) {
                alert('로그인이 필요합니다.');
                return;
            }

            // Immediately clear input and disable temporary
            chatSendBtn.disabled = true;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '메시지 전송 실패');
            }

            const responseData = await response.json();

            // Immediate UI update for better UX
            if (responseData.message) {
                addMessageToChat(responseData.message, session.user.email);
            }

            // Clear input on success
            chatInput.value = '';

            // Real-time subscription will handle duplicate check via ID

        } catch (error) {
            console.error('Error sending message:', error);
            alert('메시지 전송에 실패했습니다: ' + error.message);
        } finally {
            chatSendBtn.disabled = false;
            chatInput.focus();
        }
    };

    // Chat Event Listeners
    chatForm.addEventListener('submit', sendChatMessage);

    // Chat Attachment Listeners
    chatAttachBtn.addEventListener('click', () => chatImageInput.click());

    chatImageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) {
                alert('로그인이 필요합니다.');
                return;
            }

            chatAttachBtn.disabled = true; // Prevent double click
            // Visual feedback (optional)
            chatAttachBtn.style.opacity = '0.5';

            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}/${Date.now()}_chat.${fileExt}`;

            // 1. Upload to 'chat-images' bucket
            const { error: uploadError } = await supabaseClient.storage
                .from('chat-images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabaseClient.storage
                .from('chat-images')
                .getPublicUrl(fileName);

            // 3. Send message with special format ![image](url)
            const content = `![image](${publicUrl})`;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '이미지 전송 실패');
            }

            const responseData = await response.json();

            // Immediate UI update
            if (responseData.message) {
                addMessageToChat(responseData.message, session.user.email);
            }

            // Clear input
            chatImageInput.value = '';

        } catch (error) {
            console.error('Error sending image:', error);
            alert('이미지 전송 실패: ' + error.message);
        } finally {
            chatAttachBtn.disabled = false;
            chatAttachBtn.style.opacity = '1';
        }
    });

    // Profile Event Listeners
    profileTrigger.addEventListener('click', () => profileFileInput.click());
    changePhotoBtn.addEventListener('click', () => profileFileInput.click());

    profileFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Image Preview (Immediate Feedback)
        const reader = new FileReader();
        reader.onload = (e) => {
            chatProfileImg.src = e.target.result;
            chatProfileImg.classList.remove('hidden');
            chatProfileDefault.classList.add('hidden');
        };
        reader.readAsDataURL(file);

        // 2. Upload to Supabase Storage
        try {
            changePhotoBtn.disabled = true;
            changePhotoBtn.textContent = '업로드 중...';

            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('로그인이 필요합니다.');

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            // Upload
            const { error: uploadError } = await supabaseClient.storage
                .from('avatars')
                .upload(fileName, file, {
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabaseClient.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Update Auth User Metadata
            const { error: updateError } = await supabaseClient.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) throw updateError;

            console.log('Profile updated successfully:', publicUrl);

            // 3. Update past messages in DB (Sync with new profile)
            const { error: msgUpdateError } = await supabaseClient
                .from('messages')
                .update({ avatar_url: publicUrl })
                .eq('user_id', user.id);

            if (msgUpdateError) {
                console.error('Failed to update past messages avatar:', msgUpdateError);
            } else {
                console.log('Past messages avatar updated');
            }

            // Update visible chat avatars immediately
            const myAvatars = document.querySelectorAll('.message-row.row-mine .chat-avatar');
            myAvatars.forEach(img => {
                img.src = publicUrl;
            });

        } catch (error) {
            console.error('Error uploading profile:', error);
            alert('프로필 변경 실패: ' + error.message);
            // Revert preview on failure if needed, or just let it stay
        } finally {
            changePhotoBtn.disabled = false;
            changePhotoBtn.textContent = '사진 변경';
        }
    });

    const loadSavedData = () => {
        // TODO: In the future, this should load from Supabase per user
        const savedDiary = localStorage.getItem('last_diary');
        const savedResponse = localStorage.getItem('last_ai_response');

        if (savedDiary) {
            diaryInput.value = savedDiary;
        }

        if (savedResponse) {
            responseText.textContent = savedResponse;
            responseText.style.fontStyle = 'normal';
            responseText.style.color = '#f8fafc';
        }
    };

    // --- Authentication Logic ---

    const updateAuthUI = (session) => {
        if (session) {
            // Logged in
            loginSection.classList.add('hidden');
            appSection.classList.remove('hidden');

            // Set user email
            if (userEmailSpan && session.user && session.user.email) {
                userEmailSpan.textContent = session.user.email;
            }

            // Update Profile Image UI
            if (session?.user?.user_metadata?.avatar_url) {
                chatProfileImg.src = session.user.user_metadata.avatar_url;
                chatProfileImg.classList.remove('hidden');
                chatProfileDefault.classList.add('hidden');
            } else {
                chatProfileImg.src = '';
                chatProfileImg.classList.add('hidden');
                chatProfileDefault.classList.remove('hidden');
            }

            // Load user data when logged in
            loadSavedData();
            fetchHistory();

            // Start Real-time Chat
            setupRealtimeChat();
        } else {
            // Logged out
            loginSection.classList.remove('hidden');
            appSection.classList.add('hidden');

            // Clear user info
            if (userEmailSpan) userEmailSpan.textContent = '';

            // Clear sensitive data from UI
            diaryInput.value = '';
            responseText.textContent = '여기에 AI의 답변이 표시됩니다.';
            historyList.innerHTML = '<div class="loading-spinner">히스토리를 불러오는 중...</div>';

            // Stop Real-time Chat
            cleanupRealtimeChat();
            chatMessages.innerHTML = '';
        }
    };

    // Listen for auth changes
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        updateAuthUI(session);
    });

    // Check initial session
    const { data: { session } } = await supabaseClient.auth.getSession();
    updateAuthUI(session);

    // Login Handler
    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            alert('이메일과 비밀번호를 입력해주세요.');
            return;
        }

        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            alert('로그인 실패: ' + error.message);
        }
    });

    // Signup Handler
    signupBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            alert('가입하실 이메일과 비밀번호를 입력해주세요.');
            return;
        }

        const { error } = await supabaseClient.auth.signUp({
            email,
            password
        });

        if (error) {
            alert('회원가입 실패: ' + error.message);
        } else {
            alert('가입 확인 이메일을 확인해주세요!');
        }
    });

    // Google Login Handler
    googleBtn.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });

        if (error) {
            alert('Google 로그인 실패: ' + error.message);
        }
    });

    // Logout Handler
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;

            // 명시적으로 UI 업데이트 (이벤트가 늦게 발생할 경우 대비)
            updateAuthUI(null);
        } catch (error) {
            console.error('Logout error:', error);
            alert('로그아웃 중 오류가 발생했습니다: ' + error.message);
        }
    });


    // --- Original App Logic ---

    analyzeBtn.addEventListener('click', async () => {
        const text = diaryInput.value.trim();

        if (!text) {
            alert('먼저 일기를 작성해주세요!');
            return;
        }

        // Get session for token
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
            alert('로그인이 필요합니다.');
            return;
        }

        // UI State: Loading
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span class="icon">⏳</span> 분석 중...';
        responseText.textContent = 'AI가 당신의 이야기를 읽고 답변을 준비하고 있어요...';
        responseText.style.fontStyle = 'italic';
        responseText.style.color = 'var(--text-muted)';

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ content: text })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || '서버 응답 오류가 발생했습니다.');
            }

            const aiMessage = data.analysis;

            // UI State: Success
            responseText.textContent = aiMessage;
            responseText.style.fontStyle = 'normal';
            responseText.style.color = '#f8fafc';

            // 2. 새로운 기록 로컬 스토리지에 저장
            localStorage.setItem('last_diary', text);
            localStorage.setItem('last_ai_response', aiMessage);

            // 히스토리 새로고침
            fetchHistory();

        } catch (error) {
            console.error('API Error:', error);
            responseText.textContent = error.message.includes('API 키')
                ? '서버 설정 오류입니다. 관리자에게 문의하세요.'
                : '죄송합니다. 답변을 가져오는 중에 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<span class="icon">✨</span> 분석 요청하기';
        }
    });

    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR'; // 한국어 설정
        recognition.continuous = false; // 한 문장씩 인식 (필요시 true로 변경 가능)
        recognition.interimResults = false;

        recognition.onstart = () => {
            voiceBtn.classList.add('recording');
            voiceBtn.innerHTML = '<span class="icon">🔴</span> 음성 인식 중...';
        };

        recognition.onend = () => {
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = '<span class="icon">🎙️</span> 음성으로 입력하기';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            diaryInput.value += (diaryInput.value ? ' ' : '') + transcript;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                alert('마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해주세요.');
            } else {
                alert('음성 인식 중 오류가 발생했습니다: ' + event.error);
            }
        };
    }

    voiceBtn.addEventListener('click', () => {
        if (!recognition) {
            alert('이 브라우저는 음성 인식을 지원하지 않습니다. 크롬 브라우저 사용을 권장합니다.');
            return;
        }

        try {
            recognition.start();
        } catch (e) {
            // 이미 실행 중인 경우 등 예외 처리
            recognition.stop();
        }
    });

    // Simple interaction feedback
    diaryInput.addEventListener('focus', () => {
        diaryInput.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    });

    diaryInput.addEventListener('blur', () => {
        diaryInput.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    });
});
