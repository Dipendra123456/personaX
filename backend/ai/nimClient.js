/**
 * NVIDIA NIM Client
 * Communicates with NVIDIA NIM inference service via OpenAI-compatible API
 * Default endpoint: http://localhost:8000/v1
 */

const getNIMBaseURL = () => {
    return process.env.NIM_BASE_URL || "http://localhost:8000/v1";
};

const getNIMModel = () => {
    return process.env.NIM_MODEL || "meta/llama-2-70b-chat";
};

/**
 * Chat with NVIDIA NIM model using OpenAI-compatible API
 * @param {Array} messages - Message history in OpenAI format
 * @param {string} systemPrompt - System instruction for the model
 * @returns {Promise<{reply: string}>}
 */
export const chatWithNIM = async (messages, systemPrompt) => {
    const baseURL = getNIMBaseURL();
    const model = getNIMModel();
    const endpoint = `${baseURL}/chat/completions`;

    // Filter messages to exclude system messages (they go in systemPrompt)
    const nonSystemMessages = messages.filter((msg) => msg.role !== "system");

    // Construct request payload
    const payload = {
        model,
        messages: [
            { role: "system", content: systemPrompt },
            ...nonSystemMessages
        ],
        temperature: 0.8,
        max_tokens: 1024,
        top_p: 0.9
    };

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `NIM API error: ${response.status}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content?.trim();

        if (!reply) {
            throw new Error("NIM returned empty response");
        }

        return { reply };
    } catch (error) {
        console.error("NIM API error:", error);
        throw error;
    }
};

/**
 * Check if NIM service is healthy
 * @returns {Promise<boolean>}
 */
export const checkNIMHealth = async () => {
    const baseURL = getNIMBaseURL();
    try {
        const response = await fetch(`${baseURL}/models`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        return response.ok;
    } catch (error) {
        console.error("NIM health check failed:", error.message);
        return false;
    }
};
