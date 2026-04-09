import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { colors } from "../constants/colors";

export default function FeedScreen() {
    return (
        <ScrollView contentContainerStyle={styles.wrap}>
            <View style={styles.headerCard}>
                <Text style={styles.sectionLabel}>Feed</Text>
                <Text style={styles.title}>Social Feed</Text>
                <Text style={styles.subtitle}>Stay updated with community achievements.</Text>
            </View>

            <View style={styles.feedCard}>
                <Text style={styles.feedTitle}>Community Updates</Text>
                <Text style={styles.feedText}>Your feed will show achievements, contests, and companion activity.</Text>
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
    feedCard: { backgroundColor: colors.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    feedTitle: { color: colors.text, fontWeight: "800", fontSize: 18, marginBottom: 8 },
    feedText: { color: colors.textMuted, lineHeight: 20 }
});
