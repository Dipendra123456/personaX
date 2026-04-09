import { getOpenAIClient } from "../ai/openaiClient.js";
import { buildAvatarPrompt } from "../../shared/constants/avatarOptions.js";

const buildFallbackAvatar = ({ name, prompt }) => {
    const seed = String(name || prompt || "PersonaX")
        .split("")
        .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const hue = seed % 360;
    const initial = String(name || "P").trim().charAt(0).toUpperCase() || "P";
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
    <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="hsl(${hue}, 72%, 42%)" />
            <stop offset="100%" stop-color="hsl(${(hue + 52) % 360}, 68%, 26%)" />
        </linearGradient>
    </defs>
    <rect width="1024" height="1024" rx="180" fill="url(#bg)"/>
    <circle cx="512" cy="420" r="190" fill="rgba(255,255,255,0.15)"/>
    <rect x="272" y="630" width="480" height="170" rx="85" fill="rgba(255,255,255,0.12)"/>
    <text x="512" y="510" text-anchor="middle" font-size="260" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#ffffff">${initial}</text>
</svg>`;

    return {
        avatarPrompt: prompt,
        avatarImageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
        avatarImageData: "",
        avatarImageMimeType: "image/svg+xml"
    };
};

const normalizeImageResult = (prompt, imageData) => {
    if (!imageData) {
        const error = new Error("Image generation failed");
        error.status = 502;
        throw error;
    }

    if (typeof imageData === "string" && imageData.startsWith("http")) {
        return {
            avatarPrompt: prompt,
            avatarImageUrl: imageData,
            avatarImageData: "",
            avatarImageMimeType: "image/png"
        };
    }

    return {
        avatarPrompt: prompt,
        avatarImageUrl: `data:image/png;base64,${imageData}`,
        avatarImageData: imageData,
        avatarImageMimeType: "image/png"
    };
};

const generateWithOpenAI = async (prompt, name) => {
    const client = getOpenAIClient();

    const response = await client.images.generate({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
        prompt: `${prompt}\n\nCharacter name: ${name || "PersonaX companion"}`,
        size: "1024x1024"
    });

    const imageData = response.data?.[0]?.b64_json || response.data?.[0]?.url;
    return normalizeImageResult(prompt, imageData);
};

const generateWithNvidia = async (prompt, name) => {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
        const error = new Error("NVIDIA_API_KEY is not configured");
        error.status = 500;
        throw error;
    }

    const url = process.env.NVIDIA_IMAGE_API_URL || "https://integrate.api.nvidia.com/v1/images/generations";
    const model = process.env.NVIDIA_IMAGE_MODEL || "black-forest-labs/flux.2-klein-4b";

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model,
            prompt: `${prompt}\n\nCharacter name: ${name || "PersonaX companion"}`,
            size: "1024x1024",
            response_format: "b64_json"
        })
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => "NVIDIA image request failed");
        const error = new Error(`NVIDIA image request failed: ${detail}`);
        error.status = 502;
        throw error;
    }

    const payload = await response.json();
    const imageData = payload?.data?.[0]?.b64_json || payload?.data?.[0]?.url || payload?.image_base64 || payload?.image;
    return normalizeImageResult(prompt, imageData);
};

export const generateAvatarImage = async ({ avatarSettings, gender, name }) => {
    const prompt = avatarSettings?.avatarPrompt?.trim() || buildAvatarPrompt({ ...avatarSettings, gender });
    const provider = (process.env.IMAGE_PROVIDER || "openai").toLowerCase();

    try {
        if (provider === "nvidia") {
            try {
                return await generateWithNvidia(prompt, name);
            } catch (nvidiaError) {
                // Fall through to alternate provider before final local fallback.
                console.error("NVIDIA avatar generation failed:", nvidiaError?.message || nvidiaError);
                return await generateWithOpenAI(prompt, name);
            }
        }

        return await generateWithOpenAI(prompt, name);
    } catch (error) {
        console.error("Avatar provider generation failed, using local fallback:", error?.message || error);
        return buildFallbackAvatar({ name, prompt });
    }
};
