import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { colors } from "../constants/colors";

export default function QuestsScreen() {
    return (
        <ScrollView contentContainerStyle={styles.wrap}>
            <View style={styles.headerCard}>
                <Text style={styles.sectionLabel}>Quests</Text>
                <Text style={styles.title}>Daily Challenges</Text>
                <Text style={styles.subtitle}>Complete quests to earn rewards and XP.</Text>
            </View>

            <View style={styles.questCard}>
                <Text style={styles.questTitle}>Today's Quests</Text>
                <Text style={styles.questText}>No active quests. Check back later for daily challenges.</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    wrap: { padding: 16, paddingBottom: 100 },
    headerCard: { backgroundColor: colors.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    sectionLabel: { color: colors.accent, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: "900" },
    title: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 4 },
    subtitle: { color: colors.textMuted, marginTop: 6 },
    questCard: { backgroundColor: colors.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    questTitle: { color: colors.text, fontWeight: "800", fontSize: 18, marginBottom: 8 },
    questText: { color: colors.textMuted, lineHeight: 20 }
});
