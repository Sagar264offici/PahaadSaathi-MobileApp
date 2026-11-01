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

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function handleLogin() {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter your name to personalize your road reports and emergency alerts.");
      return;
    }

    loginUser(name, phone);
    router.replace("/");
  }

  function handleGuest() {
    loginUser("Community Member");
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
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
              <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Log In</Text>
            <ThemeToggle />
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/PahaadSaathi Mountain Safety Logo.png')}
              style={styles.logoImage}
            />
          </View>

          <Text style={[styles.welcome, { color: theme.textPrimary }]}>Welcome back.</Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={theme.placeholderText}
                style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone (optional)</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={theme.placeholderText}
                keyboardType="phone-pad"
                style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
            </View>

            <Pressable style={[styles.loginBtn, { backgroundColor: theme.primary }]} onPress={handleLogin}>
              <Text style={styles.loginBtnText}>Continue</Text>
            </Pressable>
          </View>

          {/* Guest login */}
          <View style={styles.guestRow}>
            <Text style={[styles.guestText, { color: theme.textSecondary }]}>Or continue as guest</Text>
            <Pressable style={[styles.guestLink, { backgroundColor: theme.primaryLight }]} onPress={handleGuest}>
              <Text style={[styles.guestLinkText, { color: theme.primary }]}>Enter as Community Member</Text>
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
    marginTop: 8,
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
  guestRow: {
    marginTop: 24,
    alignItems: "center",
  },
  guestText: {
    color: "#8A735B",
    fontSize: 13,
    fontWeight: "600",
    marginRight: 4,
  },
  guestLink: {
    alignItems: "center",
  },
  guestLinkText: {
    color: "#EA580C",
    fontSize: 13,
    fontWeight: "800",
  },
});
