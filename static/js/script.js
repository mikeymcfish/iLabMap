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
        messageDiv.className = `mb-2 ${isUser ? 'text-end' : ''}`;
        messageDiv.innerHTML = `<span class="badge ${isUser ? 'bg-primary' : 'bg-secondary'}">${message}</span>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function sendChatMessage() {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, true);
            userInput.value = '';

            fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    addMessage('Error: ' + data.error);
                } else {
                    addMessage(data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                addMessage('Error occurred while sending message');
            });
        }
    }

    if (sendMessage) {
        sendMessage.addEventListener('click', sendChatMessage);
    }

    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }

    // ... (rest of the existing code)
});
