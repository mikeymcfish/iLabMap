document.addEventListener('DOMContentLoaded', function() {
    // ... (existing code)

    const openChatBtn = document.getElementById('openChatBtn');
    const chatModal = new bootstrap.Modal(document.getElementById('chatModal'));
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendMessage = document.getElementById('sendMessage');

    if (openChatBtn) {
        openChatBtn.addEventListener('click', function() {
            chatModal.show();
        });
    }

    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function sendChatMessage() {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, true);
            userInput.value = '';
            userInput.disabled = true;
            sendMessage.disabled = true;

            fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'error') {
                    addMessage('Error: ' + data.message);
                } else {
                    addMessage(data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                addMessage('Error occurred while sending message. Please try again.');
            })
            .finally(() => {
                userInput.disabled = false;
                sendMessage.disabled = false;
                userInput.focus();
            });
        }
    }

    if (sendMessage) {
        sendMessage.addEventListener('click', sendChatMessage);
    }

    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }

    // ... (rest of the existing code)
});
