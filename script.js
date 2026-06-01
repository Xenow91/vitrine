// WebGL aurora removed by request

document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Logic ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            
            if (targetId === 'chat-view') {
                const chatHistory = document.getElementById('chat-history');
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
        });
    });

    // --- WebGL Soft Aurora removed ---

    // --- 3D Card Interactive Logic ---
    const wrappers = document.querySelectorAll('.project-card-wrapper');
    
    wrappers.forEach(wrapper => {
        const card = wrapper.querySelector('.project-card');
        let isHovered = false;

        wrapper.addEventListener('mouseenter', () => {
            isHovered = true;
            card.style.transition = 'none'; 
        });

        wrapper.addEventListener('mousemove', e => {
            if(!isHovered) return;
            const rect = wrapper.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -12;
            const rotateY = ((x - centerX) / centerX) * 12;
            
            card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
        
        wrapper.addEventListener('mouseleave', () => {
            isHovered = false;
            card.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'; 
            card.style.transform = `rotateX(0deg) rotateY(0deg)`;
        });
        
        wrapper.addEventListener('click', () => {
            const href = wrapper.getAttribute('data-href');
            if(href) {
                window.location.href = href;
            }
        });
    });

    // --- Chatbot Logic ---
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatHistory = document.getElementById('chat-history');

    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if(this.value === '') {
            this.style.height = 'auto'; 
        }
    });

    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        chatInput.value = '';
        chatInput.style.height = 'auto';

        appendMessage(text, 'user-message', false);
        showTypingIndicator();

        try {
            const response = await generateAIResponse(text);
            removeTypingIndicator();
            appendMessage(response, 'assistant-message', true);
        } catch (error) {
            removeTypingIndicator();
            console.error("Erreur API:", error);
            appendMessage("Désolé, impossible de joindre le modèle LLM pour le moment. L'API est peut-être hors ligne.", 'assistant-message', false);
        }
    }

    function appendMessage(text, className, isStreaming = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        messageDiv.appendChild(bubble);
        chatHistory.appendChild(messageDiv);
        
        const formattedText = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        if (isStreaming) {
            const tokens = formattedText.split(/(<[^>]*>|\s+)/).filter(t => t !== '');
            let currentHTML = "";
            let i = 0;
            
            const interval = setInterval(() => {
                if (i >= tokens.length) {
                    clearInterval(interval);
                    return;
                }
                
                currentHTML += tokens[i];
                bubble.innerHTML = currentHTML;
                
                chatHistory.scrollTo({
                    top: chatHistory.scrollHeight,
                    behavior: 'auto'
                });
                
                i++;
            }, 35); 
        } else {
            bubble.innerHTML = formattedText;
            chatHistory.scrollTo({
                top: chatHistory.scrollHeight,
                behavior: 'smooth'
            });
        }
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

    const API_URL = "https://TON_PSEUDO-TON_REPO.hf.space/generate"; // Remplacer par l'URL de votre Space HF

    async function generateAIResponse(userMessage) {
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
        
        const data = await response.json();
        return data.response || "Aucune réponse générée.";
    }
});
