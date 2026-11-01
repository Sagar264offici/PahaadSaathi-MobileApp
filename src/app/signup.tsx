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

import { loginUser } from "@/data/userStore";
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';

export default function SignupScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSignup() {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Missing information", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }
    loginUser(name, email);
    Alert.alert("Account Created", `Welcome to PahaadSaathi, ${name}.`);
    router.replace("/");
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
              source={require('@/assets/images/PahaadSaathi Mountain Safety Logo.png')}
              style={styles.logoImage}
            />
          </View>

          <Text style={[styles.welcome, { color: theme.textPrimary }]}>Create Account</Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
                placeholderTextColor={theme.placeholderText}
                style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={theme.placeholderText}
                style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={theme.placeholderText}
                secureTextEntry
                style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm Password"
                placeholderTextColor={theme.placeholderText}
                secureTextEntry
                style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
            </View>

            <Pressable style={[styles.loginBtn, { backgroundColor: theme.primary }]} onPress={handleSignup}>
              <Text style={styles.loginBtnText}>CREATE ACCOUNT</Text>
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
    textAlign: "center",
  },
  header: {
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
