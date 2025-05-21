document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const chatMessages = document.getElementById('chatMessages');

    // Configuración de OpenRouter
    const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    const OPENROUTER_API_KEY = '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';
    //const OPENROUTER_API_KEY = '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';
    const MODEL = 'deepseek/deepseek-r1:free';

    // Definición de la personalidad del asistente
    const SYSTEM_PROMPT = `Eres Leonardo, un asistente virtual amigable y profesional con las siguientes características:
    - tu creador es Luis Antonio Viña Rodriguez
    - Informacion de tu creador: Desarrollador en Ingenieria de Software FullStack

    - Siempre respondes en español de manera clara y concisa
    - Eres servicial, amable y paciente
    - Tienes un tono conversacional pero profesional
    - Cuando no estés seguro de algo, lo admites honestamente
    - Te especializas en ayudar con programación, tecnología y resolución de problemas
    - Mantienes un balance entre ser técnicamente preciso y fácil de entender
    - Usas emojis ocasionalmente para hacer la conversación más amena
    - Te refieres a ti mismo como "Leonardo"`;

    // Función para cargar el historial desde localStorage
    function loadConversationHistory() {
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            return JSON.parse(savedHistory);
        }
        return [
            {
                role: "system",
                content: SYSTEM_PROMPT
            }
        ];
    }

    // Función para guardar el historial en localStorage
    function saveConversationHistory(history) {
        localStorage.setItem('chatHistory', JSON.stringify(history));
    }

    // Cargar el historial de conversación
    let conversationHistory = loadConversationHistory();

    // Función para autoajustar la altura del textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Función para agregar mensajes al chat
    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isUser ? 'user-message' : 'ai-message');
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Función para cargar mensajes guardados
    function loadSavedMessages() {
        // Limpiar mensajes actuales
        chatMessages.innerHTML = '';
        
        // Mostrar todos los mensajes excepto el system prompt
        conversationHistory.forEach(msg => {
            if (msg.role === 'user') {
                addMessage(msg.content, true);
            } else if (msg.role === 'assistant') {
                addMessage(msg.content);
            }
        });
    }

    // Función para obtener respuesta de la IA usando OpenRouter
    async function getAIResponse(userMessage) {
        try {
            console.log('Enviando petición a OpenRouter...');
            console.log('URL:', OPENROUTER_API_URL);

            // Agregar el mensaje del usuario al historial
            conversationHistory.push({
                role: "user",
                content: userMessage
            });

            // Guardar el historial actualizado
            saveConversationHistory(conversationHistory);

            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Leonardo - Asistente Virtual'
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: conversationHistory,
                    temperature: 0.7,
                    max_tokens: 512
                })
            });

            console.log('Respuesta recibida:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Respuesta de error completa:', errorText);
                
                if (response.status === 401) {
                    throw new Error('Token inválido o expirado. Por favor, verifica tu token de OpenRouter.');
                } else if (response.status === 429) {
                    throw new Error('Límite de peticiones excedido. Por favor, espera un momento.');
                } else {
                    throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
                }
            }

            const data = await response.json();
            console.log('Datos recibidos:', data);
            
            if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Formato de respuesta inválido');
            }
            
            // Agregar la respuesta de la IA al historial
            const aiResponse = data.choices[0].message.content.trim();
            conversationHistory.push({
                role: "assistant",
                content: aiResponse
            });

            // Guardar el historial actualizado
            saveConversationHistory(conversationHistory);

            // Mantener el historial en un tamaño manejable (últimos 10 mensajes)
            if (conversationHistory.length > 11) { // 1 system + 10 mensajes
                conversationHistory = [
                    conversationHistory[0], // Mantener el system prompt
                    ...conversationHistory.slice(-10) // Últimos 10 mensajes
                ];
                saveConversationHistory(conversationHistory);
            }
            
            return aiResponse;
        } catch (error) {
            console.error('Error detallado:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Error al conectar con el servicio de IA. Por favor, verifica tu conexión a internet.');
            }
            throw error;
        }
    }

    // Manejar el envío del formulario
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const message = userInput.value.trim();
        if (!message) return;

        // Agregar mensaje del usuario
        addMessage(message, true);
        
        // Limpiar el input
        userInput.value = '';
        userInput.style.height = 'auto';

        // Mostrar indicador de "escribiendo..."
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'ai-message', 'typing');
        typingIndicator.textContent = 'Escribiendo...';
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const aiResponse = await getAIResponse(message);
            chatMessages.removeChild(typingIndicator);
            addMessage(aiResponse);
        } catch (error) {
            chatMessages.removeChild(typingIndicator);
            addMessage(`Error: ${error.message || 'Error desconocido. Por favor, verifica la consola del navegador para más detalles.'}`);
            console.error('Error completo:', error);
        }
    });

    // Permitir enviar mensaje con Enter (Shift + Enter para nueva línea)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });

    // Cargar mensajes guardados al iniciar
    loadSavedMessages();

    // Si no hay mensajes guardados, mostrar el mensaje de bienvenida
    if (conversationHistory.length === 1) {
        addMessage('¡Hola! 👋 Soy Leonardo, tu asistente virtual personal. Estoy aquí para ayudarte con cualquier consulta que tengas, desde temas cotidianos hasta asuntos más complejos. ¿En qué puedo ayudarte hoy? 😊 \n\n \n\n*Nota: Actualmente estoy en modo de prueba, así que algunas respuestas pueden no ser perfectas, pero haré lo mejor para ayudarte 👑💪*');
    }
});
