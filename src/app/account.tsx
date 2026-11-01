import { useState, useEffect } from "react";
import {
  Alert,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { getUser, subscribeUser, logoutUser } from "@/data/userStore";
import { useAppTheme } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';

export default function AccountScreen() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useAppTheme();
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    const unsub = subscribeUser((u) => setUser(u));
    return () => unsub();
  }, []);

  const name = user?.name || "Guest Traveller";
  const phone = user?.phone || "No contact linked";

  function handleSave() {
    Alert.alert("Profile Saved", "Your account settings are synced.");
  }

  function handleLogout() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out of PahaadSaathi?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            logoutUser();
            router.replace("/login");
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPrimary }]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle, backgroundColor: colors.headerBg }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.bgTertiary, borderColor: colors.borderSubtle }]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Account & Settings</Text>
        <ThemeToggle />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.bgTertiary, borderColor: colors.borderSubtle }]}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.avatar}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.profileName, { color: colors.textPrimary }]}>{name}</Text>
          <Text style={[styles.profileRole, { color: colors.accentGreen }]}>Mountain Safety Contributor</Text>
          <Text style={[styles.profilePhone, { color: colors.textMuted }]}>{phone}</Text>
        </View>

        {/* Display & Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>DISPLAY & THEME</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
            <Pressable style={styles.settingsRow} onPress={toggleTheme}>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Interface Theme</Text>
                <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>
                  {theme === "dark" ? "Dark Mode" : "Light Mode"}
                </Text>
              </View>
              <View style={[styles.themePill, { backgroundColor: colors.accentBlueBg }]}>
                <Text style={[styles.themePillText, { color: colors.accentBlue }]}>
                  {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Settings Groups */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>CORRIDOR PREFERENCES</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
            <Pressable style={styles.settingsRow}>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Default Route Corridor</Text>
                <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>NH-07 (Rishikesh - Badrinath)</Text>
              </View>
              <Text style={[styles.settingsArrow, { color: colors.accentBlue }]}>→</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
            <Pressable style={styles.settingsRow} onPress={() => router.push("/relay")}>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Nearby Bluetooth relay</Text>
                <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>Share reports automatically with nearby app users</Text>
              </View>
              <Text style={[styles.settingsArrow, { color: colors.accentBlue }]}>→</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
            <Pressable style={styles.settingsRow}>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Offline Cache Storage</Text>
                <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>Active (SQLite Telemetry Database)</Text>
              </View>
              <Text style={[styles.settingsArrow, { color: colors.accentBlue }]}>→</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>SAFETY DISPATCH</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
            <Pressable style={styles.settingsRow} onPress={() => router.push("/emergency")}>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Emergency Broadcast Contact</Text>
                <Text style={[styles.settingsValue, { color: colors.accentRed }]}>National Dispatch 112</Text>
              </View>
              <Text style={[styles.settingsArrow, { color: colors.accentBlue }]}>→</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
            <Pressable style={styles.settingsRow}>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Corroboration Level</Text>
                <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>Community Verified</Text>
              </View>
              <Text style={[styles.settingsArrow, { color: colors.accentBlue }]}>→</Text>
            </Pressable>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionGroup}>
          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.textPrimary }]}
            onPress={handleSave}
          >
            <Text style={[styles.saveBtnText, { color: colors.bgPrimary }]}>Save Preferences</Text>
          </Pressable>
          <Pressable
            style={[styles.logoutBtn, { backgroundColor: colors.bgTertiary, borderColor: colors.borderSubtle }]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutBtnText, { color: colors.accentRed }]}>Switch Account / Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Profile Card */
  profileCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    width: 74,
    height: 74,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 12,
  },

  /* Section */
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  settingsCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingsValue: {
    fontSize: 11,
  },
  settingsArrow: {
    fontSize: 13,
    fontWeight: "600",
  },
  themePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  themePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },

  /* Actions */
  actionGroup: {
    gap: 10,
    marginTop: 10,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  logoutBtn: {
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
