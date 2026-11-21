/**
 * PahaadSaathi Resident Registration
 *
 * Community members register their phone number and area to receive
 * targeted emergency alerts from moderators.
 */

import { Image } from 'expo-image';
import { useState, useCallback } from "react";
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

import { registerResident } from "@/data/userStore";
import { useTheme } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';

export default function ResidentRegisterScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [registering, setRegistering] = useState(false);

  const handleRegister = useCallback(() => {
    if (!name.trim() || !phone.trim() || !area.trim()) {
      Alert.alert("Missing information", "Please enter your name, phone number, and area.");
      return;
    }

    setRegistering(true);
    try {
      registerResident({
        name: name.trim(),
        phone: phone.trim(),
        area: area.trim(),
        registeredForAlerts: true,
      });
      Alert.alert("Registered", "You are registered for targeted emergency alerts in your area.");
      router.replace("/");
    } catch {
      Alert.alert("Registration failed", "Could not register. Please try again.");
    } finally {
      setRegistering(false);
    }
  }, [name, phone, area, router]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Register for Alerts</Text>
        <ThemeToggle />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardAvoiding}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <Image source={require('@/assets/images/logo.png')} style={styles.logoImage} />
          </View>
          <Text style={[styles.welcome, { color: theme.textPrimary }]}>Community Member Registration</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Register your phone and area to receive targeted emergency alerts.</Text>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={theme.placeholderText}
                style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={theme.placeholderText}
                keyboardType="phone-pad"
                style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Area / Corridor</Text>
              <TextInput
                value={area}
                onChangeText={setArea}
                placeholder="e.g. NH-07 Badrinath Highway, Rudraprayag"
                placeholderTextColor={theme.placeholderText}
                style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
            </View>

            <Pressable style={[styles.loginBtn, { backgroundColor: theme.primary }]} onPress={handleRegister} disabled={registering}>
              <Text style={[styles.loginBtnText, { color: '#FFFFFF' }]}>{registering ? 'Registering…' : 'Register for Alerts'}</Text>
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
    backgroundColor: '#FFFDF5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
    backgroundColor: '#FFFDF5',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#3B2F2F',
    fontSize: 20,
    fontWeight: '800',
  },
  headerTitle: {
    color: '#3B2F2F',
    fontSize: 16,
    fontWeight: '800',
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
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 16,
  },
  welcome: {
    color: '#3B2F2F',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: '#8A735B',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 16,
    width: '100%',
  },
  fieldLabel: {
    color: '#5B4A3E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#3B2F2F',
    fontSize: 14,
  },
  loginBtn: {
    width: '100%',
    backgroundColor: '#EA580C',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
