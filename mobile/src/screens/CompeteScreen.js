import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { colors } from "../constants/colors";

export default function CompeteScreen() {
    return (
        <ScrollView contentContainerStyle={styles.wrap}>
            <View style={styles.headerCard}>
                <Text style={styles.sectionLabel}>Compete</Text>
                <Text style={styles.title}>Competitions</Text>
                <Text style={styles.subtitle}>Join contests and challenges with other players.</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Active Contests</Text>
                <Text style={styles.cardText}>Check back soon for upcoming competitions and leaderboards.</Text>
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
    card: { backgroundColor: colors.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    cardTitle: { color: colors.text, fontWeight: "800", fontSize: 18, marginBottom: 8 },
    cardText: { color: colors.textMuted, lineHeight: 20 }
});
