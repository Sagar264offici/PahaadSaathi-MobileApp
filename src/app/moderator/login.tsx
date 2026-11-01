import { Image } from 'expo-image';
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { supabase } from "@/lib/supabase";
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';

export default function ModeratorLoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing information", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) {
        Alert.alert("Authentication failed", "Unable to identify user.");
        await supabase.auth.signOut();
        return;
      }

      const { data: membership, error: mError } = await supabase
        .from("moderators")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (mError) throw mError;
      if (!membership) {
        Alert.alert("Unauthorized", "You are not authorized as a moderator.");
        await supabase.auth.signOut();
        return;
      }

      router.replace("/moderator");
    } catch (err) {
      Alert.alert("Login failed", err instanceof Error ? err.message : "Unknown error");
      try { await supabase.auth.signOut(); } catch {}
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Slogan */}
      <View style={[styles.sloganRow, { borderBottomColor: theme.border }]}>
        <Text style={[styles.sloganText, { color: theme.textPrimary }]}>Don&apos;t let Sink, Just Think!</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
              <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Moderator Login</Text>
            <ThemeToggle />
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/PahaadSaathi Mountain Safety Logo.png')}
              style={styles.logoImage}
            />
          </View>

          <Text style={[styles.welcome, { color: theme.textPrimary }]}>Moderator Sign In</Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="moderator@example.com"
                placeholderTextColor={theme.placeholderText}
                style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.placeholderText}
                secureTextEntry
                style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
            </View>

            <Pressable
              style={[styles.loginBtn, { backgroundColor: theme.primary }, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginBtnText}>{loading ? "Signing in…" : "Sign In"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFDF5",
  },
  sloganRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#FDBA74",
  },
  sloganText: {
    color: "#EA580C",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FED7AA",
    backgroundColor: "#FFFDF5",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D4D4D4",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    color: "#3B2F2F",
    fontSize: 20,
    fontWeight: "800",
  },
  headerTitle: {
    color: "#3B2F2F",
    fontSize: 16,
    fontWeight: "800",
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 16,
  },
  welcome: {
    color: "#3B2F2F",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 30,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  fieldGroup: {
    marginBottom: 16,
    width: "100%",
  },
  fieldLabel: {
    color: "#5B4A3E",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D4D4D4",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#3B2F2F",
    fontSize: 14,
    fontFamily: "monospace",
  },
  loginBtn: {
    width: "100%",
    backgroundColor: "#EA580C",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    backgroundColor: "#FDBA74",
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
