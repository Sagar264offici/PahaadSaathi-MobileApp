/**
 * PahaadSaathi Signup Screen
 *
 * Supabase Auth sign up with role selection:
 * - administrator: full system access
 * - moderator: submits reports, reviews incidents
 * - resident: registers for area alerts
 */

import { useState } from "react";
import {
  Alert,
  Image,
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

import { signUp, type UserRole } from "@/data/userStore";
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "resident", label: "Resident — receive area alerts" },
  { value: "moderator", label: "Moderator — report & review incidents" },
];

export default function SignupScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("resident");
  const [loading, setLoading] = useState(false);

  function handleSignup() {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Missing information", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }
    if (!role) {
      Alert.alert("Role required", "Please select an account type.");
      return;
    }

    setLoading(true);
    signUp({ email: email.trim(), password, name: name.trim(), role }).then(({ error }) => {
      setLoading(false);
      if (error) {
        Alert.alert("Sign up failed", error);
        return;
      }
      Alert.alert("Account Created", `Welcome to PahaadSaathi, ${name.trim()}.`);
      router.replace("/");
    });
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
          {/* Back */}
          <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
              <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
            </Pressable>
            <ThemeToggle />
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logoImage}
            />
          </View>

          <Text style={[styles.welcome, { color: theme.textPrimary }]}>Create Account</Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
                placeholderTextColor={theme.placeholderText}
                style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.placeholderText}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
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

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Confirm Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.placeholderText}
                secureTextEntry
                style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Account Type</Text>
              {ROLE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.roleChip, role === option.value && styles.roleChipActive]}
                  onPress={() => setRole(option.value)}
                >
                  <Text style={[styles.roleText, role === option.value && styles.roleTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.loginBtn, { backgroundColor: theme.primary }, loading && styles.btnDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.loginBtnText}>{loading ? "Creating…" : "CREATE ACCOUNT"}</Text>
            </Pressable>
          </View>

          {/* Login link */}
          <View style={styles.signupRow}>
            <Text style={[styles.signupText, { color: theme.textSecondary }]}>Already have an account? </Text>
            <Pressable style={styles.loginLink} onPress={() => router.back()}>
              <Text style={[styles.loginLinkText, { color: theme.primary }]}>Log in</Text>
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
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#FED7AA",
    backgroundColor: "#FFFDF5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  },
  roleChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D4D4D4",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  roleChipActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#EA580C",
  },
  roleText: {
    color: "#3B2F2F",
    fontSize: 14,
  },
  roleTextActive: {
    color: "#EA580C",
    fontWeight: "800",
  },
  loginBtn: {
    width: "100%",
    backgroundColor: "#EA580C",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
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
  signupRow: {
    marginTop: 24,
    alignItems: "center",
  },
  signupText: {
    color: "#8A735B",
    fontSize: 13,
    fontWeight: "600",
    marginRight: 4,
  },
  loginLink: {
    alignItems: "center",
  },
  loginLinkText: {
    color: "#EA580C",
    fontSize: 13,
    fontWeight: "800",
  },
});
