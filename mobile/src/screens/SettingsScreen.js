import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { colors } from "../constants/colors";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";

export default function SettingsScreen() {
    const token = useAppStore((state) => state.token);
    const user = useAppStore((state) => state.user);
    const setUser = useAppStore((state) => state.setUser);
    const clearAuth = useAppStore((state) => state.clearAuth);

    const [settings, setSettings] = useState({
        anonymousProfile: true,
        companionMemory: true,
        safetyFilter: true
    });
    const [profile, setProfile] = useState({
        name: "",
        gender: "",
        age: "",
        nationality: "",
        socialLinks: {
            linkedin: "",
            instagram: "",
            snapchat: ""
        }
    });
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    useEffect(() => {
        if (!user) {
            return;
        }

        setProfile({
            name: user.name || "",
            gender: user.gender || "",
            age: user.age ? String(user.age) : "",
            nationality: user.nationality || "",
            socialLinks: {
                linkedin: user.socialLinks?.linkedin || "",
                instagram: user.socialLinks?.instagram || "",
                snapchat: user.socialLinks?.snapchat || ""
            }
        });
    }, [user]);

    const updateProfileField = (key, value) => {
        setProfile((prev) => ({ ...prev, [key]: value }));
    };

    const updateSocialField = (key, value) => {
        setProfile((prev) => ({
            ...prev,
            socialLinks: {
                ...prev.socialLinks,
                [key]: value
            }
        }));
    };

    const saveProfile = async () => {
        if (!token) {
            return;
        }

        setSaving(true);
        setFeedback("");

        try {
            const payload = {
                socialLinks: {
                    linkedin: profile.socialLinks.linkedin.trim(),
                    instagram: profile.socialLinks.instagram.trim(),
                    snapchat: profile.socialLinks.snapchat.trim()
                }
            };

            const name = profile.name.trim();
            const gender = profile.gender.trim();
            const nationality = profile.nationality.trim();
            const age = Number.parseInt(profile.age, 10);

            if (name) {
                payload.name = name;
            }

            if (gender) {
                payload.gender = gender;
            }

            if (!Number.isNaN(age)) {
                payload.age = age;
            }

            if (nationality) {
                payload.nationality = nationality;
            }

            const result = await api.updateProfile(payload, token);
            await setUser(result.user);
            setFeedback("Profile updated successfully.");
            setIsEditingProfile(false);
        } catch (error) {
            setFeedback(error.message || "Unable to update profile.");
        } finally {
            setSaving(false);
        }
    };

    const options = [
        { key: "anonymousProfile", label: "Anonymous social presence", description: "Hide profile identity in public rooms." },
        { key: "companionMemory", label: "Companion memory", description: "Keep long-term memory between chats." },
        { key: "safetyFilter", label: "Safety filter", description: "Block abusive or unsafe prompts." }
    ];

    return (
        <ScrollView contentContainerStyle={styles.wrap}>
            <View style={styles.headerCard}>
                <Text style={styles.sectionLabel}>Settings</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Profile</Text>
                {isEditingProfile ? (
                    <>
                        <TextInput
                            style={styles.input}
                            placeholder="Name"
                            placeholderTextColor="#8fa3a0"
                            value={profile.name}
                            onChangeText={(value) => updateProfileField("name", value)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Gender"
                            placeholderTextColor="#8fa3a0"
                            value={profile.gender}
                            onChangeText={(value) => updateProfileField("gender", value)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Age"
                            keyboardType="number-pad"
                            placeholderTextColor="#8fa3a0"
                            value={profile.age}
                            onChangeText={(value) => updateProfileField("age", value.replace(/[^0-9]/g, ""))}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Nationality"
                            placeholderTextColor="#8fa3a0"
                            value={profile.nationality}
                            onChangeText={(value) => updateProfileField("nationality", value)}
                        />
                        <Text style={styles.sectionSubLabel}>Social links</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="LinkedIn URL or handle"
                            placeholderTextColor="#8fa3a0"
                            value={profile.socialLinks.linkedin}
                            onChangeText={(value) => updateSocialField("linkedin", value)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Instagram URL or handle"
                            placeholderTextColor="#8fa3a0"
                            value={profile.socialLinks.instagram}
                            onChangeText={(value) => updateSocialField("instagram", value)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Snapchat URL or handle"
                            placeholderTextColor="#8fa3a0"
                            value={profile.socialLinks.snapchat}
                            onChangeText={(value) => updateSocialField("snapchat", value)}
                        />

                        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

                        <Pressable style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]} onPress={saveProfile} disabled={saving}>
                            <Text style={styles.primaryBtnText}>{saving ? "Saving..." : "Save profile"}</Text>
                        </Pressable>

                        <Pressable style={styles.secondaryBtn} onPress={() => setIsEditingProfile(false)}>
                            <Text style={styles.secondaryBtnText}>Cancel</Text>
                        </Pressable>
                    </>
                ) : (
                    <>
                        <View style={styles.profileInfoRow}>
                            <Text style={styles.profileInfoLabel}>User ID</Text>
                            <Text style={styles.profileInfoValue}>{user?.id || "-"}</Text>
                        </View>
                        <View style={styles.profileInfoRow}>
                            <Text style={styles.profileInfoLabel}>Name</Text>
                            <Text style={styles.profileInfoValue}>{profile.name || "-"}</Text>
                        </View>
                        <View style={styles.profileInfoRow}>
                            <Text style={styles.profileInfoLabel}>Gender</Text>
                            <Text style={styles.profileInfoValue}>{profile.gender || "-"}</Text>
                        </View>
                        <View style={styles.profileInfoRow}>
                            <Text style={styles.profileInfoLabel}>Age</Text>
                            <Text style={styles.profileInfoValue}>{profile.age || "-"}</Text>
                        </View>
                        <View style={styles.profileInfoRow}>
                            <Text style={styles.profileInfoLabel}>Nationality</Text>
                            <Text style={styles.profileInfoValue}>{profile.nationality || "-"}</Text>
                        </View>
                        <Text style={styles.sectionSubLabel}>Social links</Text>
                        <View style={styles.profileInfoRow}>
                            <Text style={styles.profileInfoLabel}>LinkedIn</Text>
                            <Text style={styles.profileInfoValue}>{profile.socialLinks.linkedin || "-"}</Text>
                        </View>
                        <View style={styles.profileInfoRow}>
                            <Text style={styles.profileInfoLabel}>Instagram</Text>
                            <Text style={styles.profileInfoValue}>{profile.socialLinks.instagram || "-"}</Text>
                        </View>
                        <View style={styles.profileInfoRow}>
                            <Text style={styles.profileInfoLabel}>Snapchat</Text>
                            <Text style={styles.profileInfoValue}>{profile.socialLinks.snapchat || "-"}</Text>
                        </View>

                        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

                        <Pressable style={styles.primaryBtn} onPress={() => setIsEditingProfile(true)}>
                            <Text style={styles.primaryBtnText}>Edit profile</Text>
                        </Pressable>
                    </>
                )}
            </View>

            <View style={styles.card}>
                {options.map((item) => (
                    <View key={item.key} style={styles.settingRow}>
                        <View style={styles.settingTextWrap}>
                            <Text style={styles.settingTitle}>{item.label}</Text>
                            <Text style={styles.settingDesc}>{item.description}</Text>
                        </View>
                        <Switch
                            value={settings[item.key]}
                            onValueChange={(value) => setSettings((prev) => ({ ...prev, [item.key]: value }))}
                            trackColor={{ false: "#2a413d", true: "#39df7f" }}
                            thumbColor="#f4fffc"
                        />
                    </View>
                ))}
            </View>

            <View style={styles.card}>
                <Pressable style={styles.logoutBtn} onPress={clearAuth}>
                    <Text style={styles.logoutText}>Logout</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    wrap: { padding: 16, paddingBottom: 32 },
    headerCard: { backgroundColor: colors.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    sectionLabel: { color: colors.accent, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: "900" },
    sectionSubLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "700", marginTop: 6, marginBottom: 6 },
    card: { backgroundColor: colors.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    cardTitle: { color: colors.text, fontWeight: "800", fontSize: 18, marginBottom: 8 },
    cardText: { color: colors.textMuted, lineHeight: 20 },
    settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    settingTextWrap: { flex: 1, paddingRight: 12 },
    settingTitle: { color: colors.text, fontWeight: "800" },
    settingDesc: { color: colors.textMuted, marginTop: 4 }
    ,
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
    primaryBtn: {
        backgroundColor: colors.accent,
        borderRadius: 10,
        alignItems: "center",
        paddingVertical: 12,
        marginTop: 4
    },
    primaryBtnDisabled: {
        opacity: 0.7
    },
    primaryBtnText: {
        color: colors.buttonText,
        fontWeight: "800"
    },
    feedback: {
        color: colors.textSecondary,
        marginBottom: 6
    },
    secondaryBtn: {
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: 10,
        alignItems: "center",
        paddingVertical: 12,
        marginTop: 8
    },
    secondaryBtnText: {
        color: colors.textSecondary,
        fontWeight: "700"
    },
    profileInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 8
    },
    profileInfoLabel: {
        color: colors.textMuted,
        fontWeight: "700"
    },
    profileInfoValue: {
        color: colors.text,
        flexShrink: 1,
        textAlign: "right",
        marginLeft: 8
    },
    logoutBtn: {
        backgroundColor: "#4a2640",
        borderRadius: 10,
        alignItems: "center",
        paddingVertical: 12
    },
    logoutText: {
        color: "#ffd5e8",
        fontWeight: "800"
    }
});
