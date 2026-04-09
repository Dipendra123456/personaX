import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../constants/colors";

const GENDER_OPTIONS = ["male", "female", "non-binary", "prefer-not-to-say"];
const NATIONALITY_OPTIONS = [
    "Nepali",
    "Indian",
    "American",
    "British",
    "Canadian",
    "Australian",
    "Other"
];

export default function AuthScreen() {
    const setAuth = useAppStore((state) => state.setAuth);
    const [mode, setMode] = useState("login");
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        gender: "female",
        age: "21",
        nationality: "Nepali",
        customNationality: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const submit = async () => {
        setError("");
        setLoading(true);

        try {
            const payload = mode === "register"
                ? {
                    name: form.name.trim(),
                    email: form.email.trim(),
                    password: form.password,
                    gender: form.gender,
                    age: Number(form.age),
                    nationality: (form.nationality === "Other" ? form.customNationality : form.nationality).trim()
                }
                : { email: form.email.trim(), password: form.password };

            const result = mode === "register" ? await api.register(payload) : await api.login(payload);
            await setAuth({ token: result.token, user: result.user });
        } catch (err) {
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>PersonaX Mobile</Text>
            <Text style={styles.subtitle}>Companion app for Android APK submission</Text>

            <View style={styles.switchRow}>
                <Pressable style={[styles.switchBtn, mode === "login" && styles.switchBtnActive]} onPress={() => setMode("login")}>
                    <Text style={styles.switchText}>Login</Text>
                </Pressable>
                <Pressable style={[styles.switchBtn, mode === "register" && styles.switchBtnActive]} onPress={() => setMode("register")}>
                    <Text style={styles.switchText}>Register</Text>
                </Pressable>
            </View>

            {mode === "register" ? (
                <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#8fa3a0" value={form.name} onChangeText={(value) => update("name", value)} />
            ) : null}

            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#8fa3a0" value={form.email} onChangeText={(value) => update("email", value)} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#8fa3a0" value={form.password} onChangeText={(value) => update("password", value)} secureTextEntry />

            {mode === "register" ? (
                <>
                    <Text style={styles.optionLabel}>Gender</Text>
                    <View style={styles.optionWrap}>
                        {GENDER_OPTIONS.map((option) => (
                            <Pressable
                                key={option}
                                style={[styles.optionChip, form.gender === option && styles.optionChipActive]}
                                onPress={() => update("gender", option)}
                            >
                                <Text style={styles.optionText}>{option}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <TextInput style={styles.input} placeholder="Age" placeholderTextColor="#8fa3a0" value={form.age} onChangeText={(value) => update("age", value)} keyboardType="number-pad" />

                    <Text style={styles.optionLabel}>Nationality</Text>
                    <View style={styles.optionWrap}>
                        {NATIONALITY_OPTIONS.map((option) => (
                            <Pressable
                                key={option}
                                style={[styles.optionChip, form.nationality === option && styles.optionChipActive]}
                                onPress={() => update("nationality", option)}
                            >
                                <Text style={styles.optionText}>{option}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {form.nationality === "Other" ? (
                        <TextInput
                            style={styles.input}
                            placeholder="Enter nationality"
                            placeholderTextColor="#8fa3a0"
                            value={form.customNationality}
                            onChangeText={(value) => update("customNationality", value)}
                        />
                    ) : null}
                </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={submit} disabled={loading}>
                <Text style={styles.submitText}>{loading ? "Please wait..." : mode === "register" ? "Create Account" : "Login"}</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        justifyContent: "center"
    },
    title: {
        color: colors.text,
        fontSize: 32,
        fontWeight: "800",
        marginBottom: 8
    },
    subtitle: {
        color: colors.textMuted,
        marginBottom: 20
    },
    switchRow: {
        flexDirection: "row",
        backgroundColor: colors.secondary,
        borderRadius: 12,
        marginBottom: 12,
        overflow: "hidden"
    },
    switchBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center"
    },
    switchBtnActive: {
        backgroundColor: colors.tertiary
    },
    switchText: {
        color: colors.textSecondary,
        fontWeight: "700"
    },
    input: {
        backgroundColor: colors.inputBg,
        color: colors.text,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10
    },
    optionLabel: {
        color: colors.textTertiary,
        fontWeight: "700",
        marginBottom: 8
    },
    optionWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 10
    },
    optionChip: {
        backgroundColor: colors.secondary,
        borderColor: colors.inputBorder,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8
    },
    optionChipActive: {
        backgroundColor: colors.tertiary,
        borderColor: colors.accent
    },
    optionText: {
        color: colors.textSecondary,
        fontWeight: "600",
        fontSize: 12
    },
    submitBtn: {
        backgroundColor: colors.accent,
        borderRadius: 10,
        alignItems: "center",
        paddingVertical: 12,
        marginTop: 6
    },
    submitBtnDisabled: {
        opacity: 0.7
    },
    submitText: {
        color: colors.buttonText,
        fontWeight: "800"
    },
    error: {
        color: colors.error,
        marginBottom: 8
    }
});
