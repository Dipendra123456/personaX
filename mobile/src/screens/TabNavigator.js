import { useState } from "react";
import { SafeAreaView, StyleSheet, Text, Pressable, View } from "react-native";
import { colors } from "../constants/colors";
import HomeScreen from "./HomeScreen";
import GameZoneScreen from "./GameZoneScreen";
import SocializeScreen from "./SocializeScreen";
import GrowthScreen from "./GrowthScreen";
import SettingsScreen from "./SettingsScreen";

const TABS = [
    { id: "home", label: "HOME", icon: "🏠" },
    { id: "games", label: "GAMES", icon: "🎮" },
    { id: "socialize", label: "ROOMS", icon: "🚪" },
    { id: "growth", label: "GROWTH", icon: "📈" },
    { id: "settings", label: "SETTINGS", icon: "⚙️" }
];

export default function TabNavigator() {
    const [activeTab, setActiveTab] = useState("home");

    const renderScreen = () => {
        switch (activeTab) {
            case "home":
                return <HomeScreen />;
            case "games":
                return <GameZoneScreen />;
            case "socialize":
                return <SocializeScreen />;
            case "growth":
                return <GrowthScreen />;
            case "settings":
                return <SettingsScreen />;
            default:
                return <HomeScreen />;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {renderScreen()}

            {/* Bottom Tab Navigation */}
            <View style={styles.tabBar}>
                {TABS.map((tab) => (
                    <Pressable
                        key={tab.id}
                        style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        <Text style={styles.tabIcon}>{tab.icon}</Text>
                        <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                            {tab.label}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.primary },
    tabBar: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: colors.secondary,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingVertical: 8,
        paddingHorizontal: 4
    },
    tab: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 6,
        paddingHorizontal: 4
    },
    tabActive: {
        backgroundColor: colors.tertiary,
        borderRadius: 8
    },
    tabIcon: {
        fontSize: 20,
        marginBottom: 2
    },
    tabLabel: {
        color: colors.textMuted,
        fontSize: 9,
        fontWeight: "700",
        textAlign: "center",
        textTransform: "uppercase",
        letterSpacing: 0.5
    },
    tabLabelActive: {
        color: colors.accent,
        fontWeight: "900"
    }
});
