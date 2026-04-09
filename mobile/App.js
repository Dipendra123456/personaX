import React, { useEffect } from "react";
import { ActivityIndicator, Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import AuthScreen from "./src/screens/AuthScreen";
import TabNavigator from "./src/screens/TabNavigator";
import { useAppStore } from "./src/store/useAppStore";
import { colors } from "./src/constants/colors";

class RootErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, message: "" };
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            message: String(error?.message || error || "Unknown render error")
        };
    }

    componentDidCatch(error) {
        // Keep logging in console for debugging while avoiding a blank screen for users.
        // eslint-disable-next-line no-console
        console.error("Root render error:", error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.crashWrap}>
                    <Text style={styles.crashTitle}>App crashed while rendering</Text>
                    <Text style={styles.crashText}>{this.state.message}</Text>
                </View>
            );
        }

        return this.props.children;
    }
}

export default function App() {
    const token = useAppStore((state) => state.token);
    const hydrated = useAppStore((state) => state.hydrated);
    const hydrateAuth = useAppStore((state) => state.hydrateAuth);

    useEffect(() => {
        hydrateAuth();
    }, [hydrateAuth]);

    if (!hydrated) {
        return (
            <SafeAreaView style={styles.loaderWrap}>
                <ActivityIndicator color={colors.accent} size="large" />
            </SafeAreaView>
        );
    }

    if (Platform.OS === "web") {
        return (
            <RootErrorBoundary>
                <View style={styles.webBackdrop}>
                    <View style={styles.webPhoneFrame}>
                        <StatusBar style="light" />
                        {token ? <TabNavigator /> : <AuthScreen />}
                    </View>
                </View>
            </RootErrorBoundary>
        );
    }

    return (
        <RootErrorBoundary>
            <View style={styles.app}>
                <StatusBar style="light" />
                {token ? <TabNavigator /> : <AuthScreen />}
            </View>
        </RootErrorBoundary>
    );
}

const styles = StyleSheet.create({
    app: {
        flex: 1,
        backgroundColor: colors.primary
    },
    loaderWrap: {
        flex: 1,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center"
    },
    webBackdrop: {
        flex: 1,
        backgroundColor: colors.backdrop,
        alignItems: "center",
        justifyContent: "center",
        padding: 18
    },
    webPhoneFrame: {
        width: "100%",
        maxWidth: 430,
        height: "100%",
        maxHeight: 900,
        borderRadius: 28,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.primary
    },
    crashWrap: {
        flex: 1,
        backgroundColor: colors.primary,
        padding: 24,
        justifyContent: "center"
    },
    crashTitle: {
        color: colors.error,
        fontSize: 22,
        fontWeight: "800"
    },
    crashText: {
        color: colors.textSecondary,
        marginTop: 10,
        lineHeight: 22,
        fontSize: 14
    }
});
