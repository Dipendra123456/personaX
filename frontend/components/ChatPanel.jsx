import { useMemo, useState, useRef, useEffect } from "react";
import { api } from "../services/api";
import { useCompanionStore } from "../store/useCompanionStore";

const QUICK_EMOJIS = ["😊", "😂", "😍", "😎", "🤔", "🥰", "😢", "🔥", "✨", "💬", "👍", "🎉"];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const inferCompanionGender = (companion) => {
    const gender = String(companion?.gender || "").toLowerCase();
    if (gender.includes("female") || gender.includes("woman") || gender.includes("girl")) {
        return "female";
    }
    if (gender.includes("male") || gender.includes("man") || gender.includes("boy")) {
        return "male";
    }

    const name = String(companion?.name || "").toLowerCase();
    if (name.includes("mia")) {
        return "female";
    }
    if (name.includes("dipendra")) {
        return "male";
    }

    return "neutral";
};

const scoreVoice = (voice, preferredGender) => {
    const haystack = `${voice?.name || ""} ${voice?.voiceURI || ""}`.toLowerCase();
    let score = 0;

    if ((voice?.lang || "").toLowerCase().startsWith("en")) {
        score += 3;
    }
    if (voice?.localService) {
        score += 1;
    }

    const femaleHint = /(female|woman|girl|zira|susan|jenny|aria|sara|hazel)/.test(haystack);
    const maleHint = /(male|man|boy|david|mark|guy|george|ryan|adam)/.test(haystack);

    if (preferredGender === "female") {
        if (femaleHint) {
            score += 8;
        }
        if (maleHint) {
            score -= 4;
        }
    } else if (preferredGender === "male") {
        if (maleHint) {
            score += 8;
        }
        if (femaleHint) {
            score -= 4;
        }
    }

    return score;
};

const selectVoiceForCompanion = (companion, voices) => {
    if (!Array.isArray(voices) || voices.length === 0) {
        return null;
    }

    const preferredGender = inferCompanionGender(companion);
    let bestVoice = voices[0];
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const voice of voices) {
        const score = scoreVoice(voice, preferredGender);
        if (score > bestScore) {
            bestScore = score;
            bestVoice = voice;
        }
    }

    return bestVoice;
};

const buildSpeechStyleForCompanion = (companion) => {
    let rate = 1;
    let pitch = 1;
    const volume = 1;

    const tone = String(companion?.tone || "").toLowerCase();
    if (tone.includes("soft") || tone.includes("calm")) {
        rate -= 0.06;
        pitch += 0.1;
    }
    if (tone.includes("aggressive") || tone.includes("dominant")) {
        rate += 0.06;
        pitch -= 0.08;
    }

    const relationship = String(companion?.relationshipType || "").toLowerCase();
    if (relationship.includes("therapist") || relationship.includes("mentor") || relationship.includes("mother") || relationship.includes("father")) {
        rate -= 0.05;
    }

    const moodModes = Array.isArray(companion?.moodModes) ? companion.moodModes.map((mood) => String(mood).toLowerCase()) : [];
    if (moodModes.some((mood) => mood.includes("flirty") || mood.includes("sweet"))) {
        pitch += 0.08;
    }
    if (moodModes.some((mood) => mood.includes("roast") || mood.includes("rude") || mood.includes("angry"))) {
        rate += 0.05;
        pitch -= 0.05;
    }

    return {
        rate: clamp(rate, 0.8, 1.25),
        pitch: clamp(pitch, 0.7, 1.45),
        volume
    };
};

export default function ChatPanel({ selectedCompanion, messages, onSend }) {
    const { token } = useCompanionStore();
    const [input, setInput] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [activeSpeechKey, setActiveSpeechKey] = useState(null);
    const [isSendingAudio, setIsSendingAudio] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState("");
    const [recordingMimeType, setRecordingMimeType] = useState("");
    const [speechSupported, setSpeechSupported] = useState(true);
    const [availableVoices, setAvailableVoices] = useState([]);
    const mediaRecorderRef = useRef(null);
    const inputRef = useRef(null);
    const speechRecognitionRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const recognitionShouldRunRef = useRef(false);
    const finalTranscriptRef = useRef("");
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    const title = useMemo(() => {
        if (!selectedCompanion) {
            return "Select a companion";
        }
        return `Chat with ${selectedCompanion.name}`;
    }, [selectedCompanion]);

    const insertEmoji = (emoji) => {
        if (!emoji) {
            return;
        }

        const element = inputRef.current;
        if (!element) {
            setInput((current) => `${current}${emoji}`);
            setShowEmojiPicker(false);
            return;
        }

        const start = element.selectionStart ?? input.length;
        const end = element.selectionEnd ?? input.length;
        const nextValue = `${input.slice(0, start)}${emoji}${input.slice(end)}`;

        setInput(nextValue);
        setShowEmojiPicker(false);

        requestAnimationFrame(() => {
            element.focus();
            const nextCursor = start + emoji.length;
            element.setSelectionRange(nextCursor, nextCursor);
        });
    };

    useEffect(() => {
        const hasRecognition = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
        setSpeechSupported(hasRecognition);

        if ("speechSynthesis" in window) {
            const updateVoices = () => {
                const voices = window.speechSynthesis.getVoices() || [];
                setAvailableVoices(voices);
            };

            updateVoices();
            window.speechSynthesis.addEventListener("voiceschanged", updateVoices);

            return () => {
                window.speechSynthesis.cancel();
                window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);

                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }

                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
                    mediaStreamRef.current = null;
                }
            };
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach((track) => track.stop());
                mediaStreamRef.current = null;
            }
        };
    }, []);

    const createCompanionUtterance = (text) => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = selectVoiceForCompanion(selectedCompanion, availableVoices);
        const style = buildSpeechStyleForCompanion(selectedCompanion);

        if (voice) {
            utterance.voice = voice;
        }
        utterance.rate = style.rate;
        utterance.pitch = style.pitch;
        utterance.volume = style.volume;

        return utterance;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
            const selectedMimeType = candidates.find(
                (type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)
            );

            const mediaRecorder = selectedMimeType
                ? new MediaRecorder(stream, { mimeType: selectedMimeType })
                : new MediaRecorder(stream);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            setRecordingMimeType(mediaRecorder.mimeType || selectedMimeType || "audio/webm");
            setLiveTranscript("");
            finalTranscriptRef.current = "";
            recognitionShouldRunRef.current = true;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;

                recognition.onresult = (event) => {
                    let interim = "";

                    for (let i = event.resultIndex; i < event.results.length; i += 1) {
                        const transcript = event.results[i][0]?.transcript || "";
                        if (event.results[i].isFinal) {
                            finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim();
                        } else {
                            interim += transcript;
                        }
                    }

                    const nextText = `${finalTranscriptRef.current} ${interim}`.replace(/\s+/g, " ").trim();
                    if (nextText) {
                        setLiveTranscript(nextText);
                        setInput(nextText);
                    }
                };

                recognition.onend = () => {
                    if (recognitionShouldRunRef.current && mediaRecorderRef.current?.state === "recording") {
                        try {
                            recognition.start();
                        } catch {
                            // Browser may throw if called too quickly; next onend will retry.
                        }
                    }
                };

                recognition.onerror = (event) => {
                    if (event?.error === "not-allowed") {
                        setSpeechSupported(false);
                    }
                };

                speechRecognitionRef.current = recognition;
                recognition.start();
            }

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (error) {
            console.error("Failed to access microphone:", error);
            alert("Microphone access denied. Please enable microphone permissions.");
        }
    };

    const stopRecording = async () => {
        if (!mediaRecorderRef.current) {
            return;
        }

        clearInterval(timerRef.current);
        recognitionShouldRunRef.current = false;
        if (speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
            speechRecognitionRef.current = null;
        }
        mediaRecorderRef.current.stop();
        setIsRecording(false);

        // Wait for the recording to finish processing
        await new Promise((resolve) => {
            mediaRecorderRef.current.onstop = resolve;
        });

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }

        // Get the audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeType || "audio/webm" });
        audioChunksRef.current = [];

        // Send voice message
        await sendVoiceMessage(audioBlob, finalTranscriptRef.current || liveTranscript);
    };

    const sendVoiceMessage = async (audioBlob, transcriptHint = "") => {
        if (!selectedCompanion || !token) {
            alert("Please select a companion first");
            return;
        }

        setIsSendingAudio(true);

        try {
            const result = await api.voiceChat(audioBlob, selectedCompanion._id, token, {
                liveTranscript: transcriptHint
            });

            // Show transcript immediately in input and chat.
            if (result.userMessage) {
                setInput(result.userMessage);
            }

            if (typeof onSend === "function") {
                await onSend(result.userMessage, selectedCompanion._id, {
                    fromVoice: true,
                    aiReply: result.reply
                });
            }

            // Play audio response if available
            if (result.reply && result.audioResponse && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();

                const utterance = createCompanionUtterance(result.reply);

                window.speechSynthesis.speak(utterance);
            }
        } catch (error) {
            alert(`Voice message failed: ${error.message}`);
        } finally {
            setIsSendingAudio(false);
        }
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!input.trim() || !selectedCompanion) {
            return;
        }

        await onSend(input, selectedCompanion._id);
        setInput("");
    };

    const handlePlayResponse = (messageContent, messageKey) => {
        if (!("speechSynthesis" in window)) {
            return;
        }

        if (activeSpeechKey === messageKey && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            setActiveSpeechKey(null);
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = createCompanionUtterance(messageContent);
        utterance.onend = () => {
            setActiveSpeechKey((current) => (current === messageKey ? null : current));
        };
        utterance.onerror = () => {
            setActiveSpeechKey((current) => (current === messageKey ? null : current));
        };

        setActiveSpeechKey(messageKey);
        window.speechSynthesis.speak(utterance);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <section className="personax-card flex h-[540px] flex-col p-4">
            <h2 className="mb-3 text-lg font-semibold text-brand-500">{title}</h2>
            <div className="mb-3 flex-1 space-y-2 overflow-y-auto rounded-xl bg-slate-800 p-3">
                {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className="flex items-end gap-2">
                        <div
                            className={`max-w-[86%] rounded-xl px-3 py-2 text-sm ${message.role === "user"
                                ? "ml-auto bg-brand-500 text-white"
                                : "bg-slate-700 text-slate-100 border border-slate-600"
                                }`}
                        >
                            {message.content}
                        </div>
                        {message.role === "ai" && (
                            <button
                                onClick={() => handlePlayResponse(message.content, `${message.role}-${index}`)}
                                className="mb-0.5 rounded-lg bg-slate-700 p-1.5 text-xs text-slate-200 hover:bg-slate-600"
                                title={activeSpeechKey === `${message.role}-${index}` ? "Stop audio" : "Play audio"}
                            >
                                {activeSpeechKey === `${message.role}-${index}` ? "■" : "🔊"}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <form onSubmit={submit} className="flex flex-col gap-2">
                {isRecording && (
                    <div className="flex items-center justify-between rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">
                        <span>Recording... {formatTime(recordingTime)}</span>
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
                    </div>
                )}

                {isRecording && liveTranscript ? (
                    <div className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                        Live transcript: {liveTranscript}
                    </div>
                ) : null}

                {!speechSupported ? (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                        Live transcription is not supported in this browser. Audio will still be sent for server transcription.
                    </div>
                ) : null}

                {isSendingAudio ? (
                    <div className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm text-brand-500">
                        Transcribing audio and generating reply...
                    </div>
                ) : null}

                <div className="flex gap-2">
                    <div className="relative flex w-full items-center gap-2 rounded-full border border-slate-700 bg-[#1f2423] px-2 py-2">
                        <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-300 hover:bg-slate-700/60"
                            title="More"
                            disabled={isRecording || isSendingAudio}
                        >
                            +
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker((current) => !current)}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-base text-slate-300 hover:bg-slate-700/60"
                            title="Emoji"
                            disabled={isRecording || isSendingAudio}
                        >
                            ☺
                        </button>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder="Type a message"
                            className="h-10 flex-1 border-0 bg-transparent px-1 text-sm text-white outline-none"
                            disabled={isRecording || isSendingAudio}
                        />
                        <button
                            type="submit"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-black hover:bg-brand-400 disabled:opacity-50"
                            disabled={isRecording || isSendingAudio || !input.trim()}
                            title="Send"
                        >
                            ➤
                        </button>

                        {showEmojiPicker ? (
                            <div className="absolute bottom-full left-10 z-20 mb-2 w-[240px] rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl">
                                <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                                    Pick an emoji
                                </div>
                                <div className="grid grid-cols-6 gap-1">
                                    {QUICK_EMOJIS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => insertEmoji(emoji)}
                                            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-slate-800"
                                            title={`Insert ${emoji}`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${isRecording
                                ? "bg-red-500 text-white"
                                : "bg-slate-700 text-slate-100 hover:bg-slate-600"
                                }`}
                            disabled={isSendingAudio}
                            title={isRecording ? "Stop Recording" : "Voice Message"}
                        >
                            {isRecording ? "■" : "🎤"}
                        </button>
                    </div>
                </div>

            </form>
        </section>
    );
}

