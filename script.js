document.addEventListener('DOMContentLoaded', () => {

    // --- DESKTOP SIDEBAR COLLAPSE LOGIC ---
    const desktopToggleBtn = document.getElementById('desktop-sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (desktopToggleBtn) {
        desktopToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // --- MOBILE SIDEBAR LOGIC ---
    const openSidebarBtn = document.getElementById('mobile-menu-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function openMobileSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('open');
    }

    function closeMobileSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    }

    if (openSidebarBtn) openSidebarBtn.addEventListener('click', openMobileSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);

    // --- NAVIGATION LOGIC ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            
            if (window.innerWidth <= 768) {
                closeMobileSidebar();
            }
            
            if (targetId === 'chat-view') {
                const chatHistory = document.getElementById('chat-history');
                chatHistory.scrollTop = chatHistory.scrollHeight;
                setTimeout(() => document.getElementById('chat-input').focus(), 100);
            }
        });
    });

    // --- CHAT LOGIC ---
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatHistory = document.getElementById('chat-history');

    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Enable/Disable send button
        if (this.value.trim().length > 0) {
            sendBtn.disabled = false;
        } else {
            sendBtn.disabled = true;
        }
    });

    // Handle Enter to send, Shift+Enter for new line
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    let isGenerating = false;

    async function sendMessage() {
        if (isGenerating) return;

        const text = chatInput.value.trim();
        if (!text) return;

        isGenerating = true;
        chatInput.disabled = true;
        sendBtn.disabled = true;

        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Render user message directly using marked
        appendMessage(text, 'user-message');
        showTypingIndicator();

        try {
            await generateAIStream(text);
        } catch (error) {
            removeTypingIndicator();
            console.error("Erreur API:", error);
            appendMessage("Désolé, impossible de joindre le modèle LLM pour le moment.", 'assistant-message');
        } finally {
            isGenerating = false;
            chatInput.disabled = false;
            if (window.innerWidth > 768) {
                setTimeout(() => chatInput.focus(), 10);
            }
        }
    }

    function appendMessage(text, className) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble markdown-body';
        
        if (text) {
            bubble.innerHTML = marked.parse(text);
            applySyntaxAndMath(bubble);
        }
        
        messageDiv.appendChild(bubble);
        chatHistory.appendChild(messageDiv);
        
        chatHistory.scrollTo({
            top: chatHistory.scrollHeight,
            behavior: 'smooth'
        });
        
        return bubble;
    }

    function showTypingIndicator() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant-message';
        messageDiv.id = 'typing-indicator';
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble typing-indicator';
        
        for(let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            bubble.appendChild(dot);
        }
        
        messageDiv.appendChild(bubble);
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function applySyntaxAndMath(element) {
        if (window.Prism) {
            const codeBlocks = element.querySelectorAll('pre code');
            codeBlocks.forEach((block) => {
                Prism.highlightElement(block);
            });
        }
        
        if (window.renderMathInElement) {
            renderMathInElement(element, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
            });
        }
    }

    const API_URL = "https://xenow91-llm-api.hf.space/generate";

    async function generateAIStream(userMessage) {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: userMessage })
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        let isFirstToken = true;
        let responseBubble = null;
        let accumulatedText = "";
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            if (isFirstToken) {
                removeTypingIndicator();
                responseBubble = appendMessage("", 'assistant-message');
                isFirstToken = false;
            }
            
            const chunkText = decoder.decode(value, { stream: true });
            accumulatedText += chunkText;
            
            responseBubble.innerHTML = marked.parse(accumulatedText);
            
            chatHistory.scrollTo({
                top: chatHistory.scrollHeight,
                behavior: 'auto'
            });
        }
        
        if (isFirstToken) {
            removeTypingIndicator();
            appendMessage("Aucune réponse générée.", 'assistant-message');
        } else {
            applySyntaxAndMath(responseBubble);
        }
    }
});
