/**
 * PahaadSaathi Account & Settings Screen
 *
 * Authenticated user profile management with Supabase Auth integration.
 */

import { useState, useEffect } from "react";
import {
  Alert,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import {
  getUser,
  subscribeUser,
  signOut,
  updateProfile,
  getEmergencyContact,
  setEmergencyContact,
  isModerator,
  isAuthenticated,
} from "@/data/userStore";
import { useAppTheme } from "@/context/ThemeContext";
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';
import { BottomNavigation } from '@/components/BottomNavigation';

export default function AccountScreen() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useAppTheme();
  const user = getUser();
  const [emergencyContact, setEmergencyContactState] = useState(getEmergencyContact() || "");
  const [editingEmergency, setEditingEmergency] = useState(false);
  const [editingName, setEditingName] = useState(user?.name || "");
  const [editingPhone, setEditingPhone] = useState(user?.phone || "");
  const [editingArea, setEditingArea] = useState(user?.area || "");
  const [saving, setSaving] = useState(false);

  // Guest mode allowed: offline emergency settings available without mandatory sign-in

  useEffect(() => {
    const unsub = subscribeUser((u) => {
      setEditingName(u?.name || "");
      setEditingPhone(u?.phone || "");
      setEditingArea(u?.area || "");
      setEmergencyContactState(getEmergencyContact() || "");
    });
    return () => unsub();
  }, []);

  if (!isAuthenticated()) {
    return null;
  }

  const name = user?.name || "Guest Traveller";
  const role = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Guest";

  function handleSaveProfile() {
    setSaving(true);
    updateProfile({
      name: editingName.trim(),
      phone: editingPhone.trim() || undefined,
      area: editingArea.trim() || undefined,
    }).then(({ error }) => {
      setSaving(false);
      if (error) {
        Alert.alert("Update failed", error);
        return;
      }
      setEditingEmergency(false);
      Alert.alert("Profile Saved", "Your account details have been updated.");
    });
  }

  function handleSaveEmergencyContact() {
    if (!emergencyContact.trim()) {
      Alert.alert("Invalid Number", "Please enter a valid phone number.");
      return;
    }
    setEmergencyContact(emergencyContact.trim());
    setEditingEmergency(false);
    Alert.alert("Emergency Contact Saved", "Your emergency contact has been updated.");
  }

  async function handleLogout() {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to log out of PahaadSaathi?",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Log Out", style: "destructive", onPress: () => resolve(true) },
        ]
      );
    });
    if (!confirmed) return;
    await signOut();
    router.replace("/login");
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
          <Text style={[styles.profileRole, { color: colors.accentGreen }]}>{role} Account</Text>
          <Text style={[styles.profilePhone, { color: colors.textMuted }]}>{user?.email || user?.phone || "No contact linked"}</Text>
          <Text style={[styles.profileRoleBadge, { color: colors.textSecondary }]}>ID: {user?.id?.slice(0, 8) || "—"}</Text>
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

        {/* Profile Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>PROFILE DETAILS</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
            <View style={[styles.settingsRow, { flexDirection: 'column', gap: 8, alignItems: 'flex-start' }]}>
              <TextInput
                value={editingName}
                onChangeText={setEditingName}
                placeholder="Full Name"
                style={[styles.editInput, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              />
              <TextInput
                value={editingPhone}
                onChangeText={setEditingPhone}
                placeholder="Phone"
                keyboardType="phone-pad"
                style={[styles.editInput, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              />
              <TextInput
                value={editingArea}
                onChangeText={setEditingArea}
                placeholder="Area / Corridor"
                style={[styles.editInput, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              />
            </View>
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.accentGreen }]} onPress={handleSaveProfile} disabled={saving}>
              <Text style={[styles.saveBtnText, { color: colors.bgPrimary }]}>{saving ? "Saving…" : "Save Profile"}</Text>
            </Pressable>
          </View>
        </View>

        {/* Settings Groups */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>CORRIDOR PREFERENCES</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
            <Pressable style={styles.settingsRow} onPress={() => router.push("/relay")}>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Nearby Bluetooth relay</Text>
                <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>Share reports automatically with nearby app users</Text>
              </View>
              <Text style={[styles.settingsArrow, { color: colors.accentBlue }]}>→</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
            <Pressable style={styles.settingsRow} onPress={() => router.push("/queue")}>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Offline Report Queue</Text>
                <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>View and sync reports saved while offline</Text>
              </View>
              <Text style={[styles.settingsArrow, { color: colors.accentBlue }]}>→</Text>
            </Pressable>
          </View>
        </View>

        {/* Safety Dispatch */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>SAFETY DISPATCH</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
            {editingEmergency ? (
              <View style={[styles.settingsCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
                <TextInput
                  value={emergencyContact}
                  onChangeText={setEmergencyContactState}
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                  style={[styles.emergencyInput, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                  autoFocus
                />
                <View style={styles.actionGroup}>
                  <Pressable style={[styles.saveBtn, { backgroundColor: colors.accentGreen }]} onPress={handleSaveEmergencyContact}>
                    <Text style={[styles.saveBtnText, { color: colors.bgPrimary }]}>Save</Text>
                  </Pressable>
                  <Pressable style={[styles.logoutBtn, { backgroundColor: colors.bgTertiary, borderColor: colors.borderSubtle }]} onPress={() => setEditingEmergency(false)}>
                    <Text style={[styles.logoutBtnText, { color: colors.textMuted }]}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.settingsRow} onPress={() => setEditingEmergency(true)}>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Emergency Broadcast Contact</Text>
                  <Text style={[styles.settingsValue, { color: emergencyContact ? colors.accentGreen : colors.textMuted }]}>
                    {emergencyContact || 'Not set — uses 112'}
                  </Text>
                </View>
                <Text style={[styles.settingsArrow, { color: colors.accentBlue }]}>→</Text>
              </Pressable>
            )}
            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
            <Pressable style={styles.settingsRow} onPress={() => router.push("/emergency")}>
              <View>
                <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Emergency Broadcast Contact</Text>
                <Text style={[styles.settingsValue, { color: colors.accentRed }]}>National Dispatch 112</Text>
              </View>
              <Text style={[styles.settingsArrow, { color: colors.accentBlue }]}>→</Text>
            </Pressable>
          </View>
        </View>

        {/* Moderator Tools */}
        {isModerator() && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>MODERATOR TOOLS</Text>
            <View style={[styles.settingsCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
              <Pressable style={styles.settingsRow} onPress={() => router.push("/moderator")}>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Review Incidents</Text>
                  <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>Update status & issue targeted alerts</Text>
                </View>
                <Text style={[styles.settingsArrow, { color: colors.accentBlue }]}>→</Text>
              </Pressable>
              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
              <Pressable style={styles.settingsRow} onPress={() => router.push("/report")}>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Submit Incident Report</Text>
                  <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>Online or SMS fallback</Text>
                </View>
                <Text style={[styles.settingsArrow, { color: colors.accentBlue }]}>→</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionGroup}>
          {isAuthenticated() ? (
            <Pressable style={[styles.logoutBtn, { backgroundColor: colors.bgTertiary, borderColor: colors.borderSubtle }]} onPress={handleLogout}>
              <Text style={[styles.logoutBtnText, { color: colors.accentRed }]}>Sign Out</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.accentGreen }]} onPress={() => router.push("/login")}>
              <Text style={[styles.saveBtnText, { color: colors.bgPrimary }]}>Sign In / Register</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
      <BottomNavigation />
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
    marginBottom: 4,
  },
  profileRoleBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8A735B",
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
  editInput: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D4D4D4",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#3B2F2F",
    fontSize: 14,
    marginBottom: 8,
  },
  emergencyInput: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D4D4D4",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#3B2F2F",
    fontSize: 14,
    marginBottom: 12,
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
    width: "100%",
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
    width: "100%",
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
