import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Building,
  PhoneCall,
  PlusCircle,
  MapPin,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmoothScrollView as ScrollView } from '@/components/SmoothScrollView';
import { Palette, Radii, Spacing, Typography } from '@/theme/tokens';
import {
  communityStore,
  GeographicCommunity,
  CommunityPost,
  HelpRequest,
  VolunteerProfile,
  CommunityResource,
} from '@/data/communityStore';
import { AppButton } from '@/components/ui/AppButton';
import { Badge } from '@/components/ui/Badge';
import { StatusLabel } from '@/components/ui/StatusLabel';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomNavigation } from '@/components/BottomNavigation';

type CommunityTab = 'feed' | 'help' | 'volunteers' | 'resources';

export default function CommunityScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const communities = communityStore.getCommunities();
  const [selectedCommunity, setSelectedCommunity] = useState<GeographicCommunity>(
    communities[0]
  );
  const [activeTab, setActiveTab] = useState<CommunityTab>('feed');

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([]);
  const [resources, setResources] = useState<CommunityResource[]>([]);

  // Create Help Request Modal
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpCategory, setHelpCategory] = useState<
    'food' | 'water' | 'shelter' | 'transport' | 'medical' | 'rescue'
  >('food');
  const [helpTitle, setHelpTitle] = useState('');
  const [helpDescription, setHelpDescription] = useState('');
  const [helpLocation, setHelpLocation] = useState('');
  const [requesterName, setRequesterName] = useState('');

  const loadData = useCallback(async (commId: string) => {
    const p = await communityStore.getPosts(commId);
    const h = await communityStore.getHelpRequests(commId);
    const v = await communityStore.getVolunteers(commId);
    const r = communityStore.getResources(commId);

    setPosts(p);
    setHelpRequests(h);
    setVolunteers(v);
    setResources(r);
  }, []);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const p = await communityStore.getPosts(selectedCommunity.id);
      const h = await communityStore.getHelpRequests(selectedCommunity.id);
      const v = await communityStore.getVolunteers(selectedCommunity.id);
      const r = communityStore.getResources(selectedCommunity.id);

      if (isMounted) {
        setPosts(p);
        setHelpRequests(h);
        setVolunteers(v);
        setResources(r);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [selectedCommunity.id]);

  const handleCreateHelpRequest = async () => {
    if (!helpTitle.trim() || !helpDescription.trim() || !helpLocation.trim()) {
      Alert.alert('Required Fields', 'Please fill in title, description and location.');
      return;
    }

    await communityStore.createHelpRequest({
      communityId: selectedCommunity.id,
      requesterName: requesterName.trim() || 'Local Resident',
      category: helpCategory,
      title: helpTitle.trim(),
      description: helpDescription.trim(),
      location: helpLocation.trim(),
      urgency: 'high',
    });

    setShowHelpModal(false);
    setHelpTitle('');
    setHelpDescription('');
    setHelpLocation('');
    await loadData(selectedCommunity.id);
    Alert.alert('Help Request Posted', 'Local volunteers and community coordinators have been notified.');
  };

  const handleFulfillRequest = async (id: string) => {
    Alert.alert(
      'Fulfill Assistance',
      'Confirm that you or your team can fulfill this assistance request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fulfill',
          onPress: async () => {
            await communityStore.updateHelpRequestStatus(id, 'fulfilled');
            await loadData(selectedCommunity.id);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.name === 'dark' ? Palette.surfaceDark : Palette.glacier,
        },
      ]}
    >
      <StatusBar
        barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor:
              theme.name === 'dark' ? Palette.surfaceDarkBorder : Palette.stone,
          },
        ]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <ChevronLeft
            size={24}
            color={theme.name === 'dark' ? Palette.snow : Palette.pineForest}
          />
        </Pressable>
        <View style={styles.headerTitleGroup}>
          <Text
            style={[
              styles.headerSubtitle,
              {
                color:
                  theme.name === 'dark'
                    ? Palette.pineForestContainer
                    : Palette.pineForestMuted,
              },
            ]}
          >
            COMMUNITY SAFETY ECOSYSTEM
          </Text>
          <Text
            style={[
              styles.headerTitle,
              {
                color:
                  theme.name === 'dark' ? Palette.snow : Palette.pineForest,
              },
            ]}
          >
            Local Tehsil & Wards
          </Text>
        </View>
        <ThemeToggle />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Geographic Community Horizontal Selector */}
        <View style={styles.selectorContainer}>
          <Text
            style={[
              styles.selectorLabel,
              {
                color:
                  theme.name === 'dark' ? Palette.stone : Palette.slate,
              },
            ]}
          >
            ACTIVE GEOGRAPHIC COMMUNITY:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.communityScroll}
          >
            {communities.map((comm) => {
              const isSelected = comm.id === selectedCommunity.id;
              return (
                <Pressable
                  key={comm.id}
                  style={[
                    styles.communityChip,
                    isSelected && styles.communityChipSelected,
                  ]}
                  onPress={() => setSelectedCommunity(comm)}
                >
                  <MapPin
                    size={14}
                    color={isSelected ? Palette.snow : Palette.pineForestMuted}
                  />
                  <Text
                    style={[
                      styles.communityChipText,
                      isSelected && styles.communityChipTextSelected,
                    ]}
                  >
                    {comm.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Community Overview Card */}
        <View
          style={[
            styles.overviewCard,
            {
              backgroundColor:
                theme.name === 'dark'
                  ? Palette.surfaceDarkElevated
                  : Palette.snow,
              borderColor:
                theme.name === 'dark'
                  ? Palette.surfaceDarkBorder
                  : Palette.stone,
            },
          ]}
        >
          <View style={styles.overviewTopRow}>
            <View>
              <Text
                style={[
                  styles.overviewDistrict,
                  { color: Palette.pineForestMuted },
                ]}
              >
                {selectedCommunity.district.toUpperCase()} DISTRICT • TEHSIL
              </Text>
              <Text
                style={[
                  styles.overviewName,
                  {
                    color:
                      theme.name === 'dark' ? Palette.snow : Palette.pineForest,
                  },
                ]}
              >
                {selectedCommunity.name}
              </Text>
            </View>
            <Badge
              label="VERIFIED POST"
              variant="brand"
              style={{ backgroundColor: Palette.pineForestContainer }}
            />
          </View>
          <Text
            style={[
              styles.overviewDesc,
              {
                color:
                  theme.name === 'dark' ? Palette.stone : Palette.slate,
              },
            ]}
          >
            {selectedCommunity.description}
          </Text>

          <View
            style={[
              styles.overviewStatsRow,
              {
                borderColor:
                  theme.name === 'dark'
                    ? Palette.surfaceDarkBorder
                    : Palette.stone,
              },
            ]}
          >
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNumber,
                  {
                    color:
                      theme.name === 'dark'
                        ? Palette.pineForestContainer
                        : Palette.pineForest,
                  },
                ]}
              >
                {selectedCommunity.activeHazardsCount}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color:
                      theme.name === 'dark'
                        ? Palette.stone
                        : Palette.slateMuted,
                  },
                ]}
              >
                Active Hazards
              </Text>
            </View>
            <View
              style={[
                styles.statDivider,
                {
                  backgroundColor:
                    theme.name === 'dark'
                      ? Palette.surfaceDarkBorder
                      : Palette.stone,
                },
              ]}
            />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNumber,
                  {
                    color:
                      theme.name === 'dark'
                        ? Palette.pineForestContainer
                        : Palette.pineForest,
                  },
                ]}
              >
                {helpRequests.length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color:
                      theme.name === 'dark'
                        ? Palette.stone
                        : Palette.slateMuted,
                  },
                ]}
              >
                Help Requests
              </Text>
            </View>
            <View
              style={[
                styles.statDivider,
                {
                  backgroundColor:
                    theme.name === 'dark'
                      ? Palette.surfaceDarkBorder
                      : Palette.stone,
                },
              ]}
            />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNumber,
                  {
                    color:
                      theme.name === 'dark'
                        ? Palette.pineForestContainer
                        : Palette.pineForest,
                  },
                ]}
              >
                {volunteers.length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color:
                      theme.name === 'dark'
                        ? Palette.stone
                        : Palette.slateMuted,
                  },
                ]}
              >
                Verified Volunteers
              </Text>
            </View>
          </View>

          <View style={styles.hotlineRow}>
            <PhoneCall
              size={16}
              color={theme.name === 'dark' ? '#F87171' : Palette.rescueRed}
            />
            <Text
              style={[
                styles.hotlineLabel,
                {
                  color:
                    theme.name === 'dark' ? Palette.stone : Palette.slate,
                },
              ]}
            >
              Tehsil Emergency Control:
            </Text>
            <Pressable
              onPress={() =>
                Linking.openURL(`tel:${selectedCommunity.emergencyHotline}`)
              }
            >
              <Text
                style={[
                  styles.hotlineNumber,
                  {
                    color:
                      theme.name === 'dark' ? '#F87171' : Palette.rescueRed,
                  },
                ]}
              >
                {selectedCommunity.emergencyHotline}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Tab Navigation - Horizontal Scrollable to prevent any squishing or overlap */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
            {[
              { id: 'feed', label: 'Feed & Alerts', icon: AlertCircle },
              { id: 'help', label: 'Help Exchange', icon: HelpCircle },
              { id: 'volunteers', label: 'Volunteers', icon: ShieldCheck },
              { id: 'resources', label: 'Shelters & PHC', icon: Building },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              const isDark = theme.name === 'dark';
              const activeBg = isDark
                ? Palette.pineForestContainer
                : Palette.pineForest;
              const activeTextColor = isDark ? '#064E3B' : Palette.snow;
              const inactiveBg = isDark
                ? Palette.surfaceDarkElevated
                : Palette.stoneLight;
              const inactiveTextColor = isDark ? Palette.stone : Palette.slate;
              const border = isActive
                ? activeBg
                : isDark
                ? Palette.surfaceDarkBorder
                : Palette.stone;

              return (
                <Pressable
                  key={tab.id}
                  style={[
                    styles.tabButton,
                    {
                      backgroundColor: isActive ? activeBg : inactiveBg,
                      borderColor: border,
                    },
                  ]}
                  onPress={() => setActiveTab(tab.id as CommunityTab)}
                >
                  <Icon
                    size={16}
                    color={isActive ? activeTextColor : inactiveTextColor}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      {
                        color: isActive ? activeTextColor : inactiveTextColor,
                        fontWeight: isActive ? '700' : '600',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab 1: Community Feed */}
        {activeTab === 'feed' && (
          <View style={styles.tabContent}>
            {posts.length === 0 ? (
              <EmptyState
                title="No Announcements Yet"
                description="Community updates and verified hazard announcements will appear here."
              />
            ) : (
              posts.map((post) => (
                <View
                  key={post.id}
                  style={[
                    styles.feedCard,
                    {
                      backgroundColor:
                        theme.name === 'dark'
                          ? Palette.surfaceDarkElevated
                          : Palette.snow,
                      borderColor:
                        theme.name === 'dark'
                          ? Palette.surfaceDarkBorder
                          : Palette.stone,
                    },
                  ]}
                >
                  <View style={styles.feedCardHeader}>
                    <Badge
                      label={post.category.replace('_', ' ')}
                      variant={post.isOfficial ? 'brand' : 'warning'}
                    />
                    <Text style={styles.feedCardTime}>
                      {new Date(post.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.feedCardTitle,
                      {
                        color:
                          theme.name === 'dark'
                            ? Palette.snow
                            : Palette.pineForest,
                      },
                    ]}
                  >
                    {post.title}
                  </Text>

                  <Text
                    style={[
                      styles.feedCardBody,
                      {
                        color:
                          theme.name === 'dark'
                            ? Palette.stone
                            : Palette.slate,
                      },
                    ]}
                  >
                    {post.content}
                  </Text>

                  <View style={styles.feedCardFooter}>
                    <Text style={styles.feedCardAuthor}>
                      By {post.authorName} ({post.authorRole})
                    </Text>
                    <View style={styles.corroborationBadge}>
                      <CheckCircle2 size={13} color={Palette.verifiedGreen} />
                      <Text style={styles.corroborationText}>
                        {post.corroborationsCount} Corroborations
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 2: Help Exchange */}
        {activeTab === 'help' && (
          <View style={styles.tabContent}>
            <View style={styles.helpHeaderRow}>
              <Text
                style={[
                  styles.tabHeading,
                  {
                    color:
                      theme.name === 'dark' ? Palette.snow : Palette.pineForest,
                  },
                ]}
              >
                Community Mutual Aid
              </Text>
              <AppButton
                label="Request Help"
                icon={<PlusCircle size={16} color={Palette.snow} />}
                size="sm"
                variant="primary"
                onPress={() => setShowHelpModal(true)}
              />
            </View>

            {helpRequests.length === 0 ? (
              <EmptyState
                title="No Active Requests"
                description="Community members can request emergency transport, rations, or medical assistance here."
                actionLabel="Create Help Request"
                onAction={() => setShowHelpModal(true)}
              />
            ) : (
              helpRequests.map((req) => (
                <View
                  key={req.id}
                  style={[
                    styles.helpCard,
                    {
                      backgroundColor:
                        theme.name === 'dark'
                          ? Palette.surfaceDarkElevated
                          : Palette.snow,
                      borderColor:
                        theme.name === 'dark'
                          ? Palette.surfaceDarkBorder
                          : Palette.stone,
                    },
                  ]}
                >
                  <View style={styles.helpCardTop}>
                    <Badge
                      label={req.category.toUpperCase()}
                      variant={
                        req.urgency === 'high' || req.urgency === 'critical'
                          ? 'danger'
                          : 'warning'
                      }
                    />
                    <StatusLabel status={req.status} />
                  </View>

                  <Text
                    style={[
                      styles.helpTitle,
                      {
                        color:
                          theme.name === 'dark'
                            ? Palette.snow
                            : Palette.pineForest,
                      },
                    ]}
                  >
                    {req.title}
                  </Text>

                  <Text
                    style={[
                      styles.helpDesc,
                      {
                        color:
                          theme.name === 'dark'
                            ? Palette.stone
                            : Palette.slate,
                      },
                    ]}
                  >
                    {req.description}
                  </Text>

                  <View style={styles.helpMetaRow}>
                    <MapPin size={14} color={Palette.pineForestMuted} />
                    <Text style={styles.helpLocation}>{req.location}</Text>
                  </View>

                  {req.status === 'open' && (
                    <AppButton
                      label="Volunteer to Assist"
                      variant="outline"
                      size="sm"
                      style={styles.fulfillBtn}
                      onPress={() => handleFulfillRequest(req.id)}
                    />
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 3: Verified Volunteers */}
        {activeTab === 'volunteers' && (
          <View style={styles.tabContent}>
            <Text
              style={[
                styles.tabHeading,
                {
                  color:
                    theme.name === 'dark' ? Palette.snow : Palette.pineForest,
                },
              ]}
            >
              Verified Community Responders
            </Text>

            {volunteers.map((vol) => (
              <View
                key={vol.id}
                style={[
                  styles.volunteerCard,
                  {
                    backgroundColor:
                      theme.name === 'dark'
                        ? Palette.surfaceDarkElevated
                        : Palette.snow,
                    borderColor:
                      theme.name === 'dark'
                        ? Palette.surfaceDarkBorder
                        : Palette.stone,
                  },
                ]}
              >
                <View style={styles.volunteerInfo}>
                  <View style={styles.volunteerNameRow}>
                    <Text
                      style={[
                        styles.volunteerName,
                        {
                          color:
                            theme.name === 'dark'
                              ? Palette.snow
                              : Palette.pineForest,
                        },
                      ]}
                    >
                      {vol.name}
                    </Text>
                    {vol.isVerified && (
                      <ShieldCheck size={16} color={Palette.verifiedGreen} />
                    )}
                  </View>

                  <View style={styles.skillsRow}>
                    {vol.skills.map((skill) => (
                      <View key={skill} style={styles.skillPill}>
                        <Text style={styles.skillPillText}>
                          {skill.replace('_', ' ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <Pressable
                  style={styles.volunteerCallBtn}
                  onPress={() => Linking.openURL(`tel:${vol.phone}`)}
                  accessibilityLabel={`Call volunteer ${vol.name}`}
                >
                  <PhoneCall size={18} color={Palette.snow} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Tab 4: Shelters & Resources */}
        {activeTab === 'resources' && (
          <View style={styles.tabContent}>
            <Text
              style={[
                styles.tabHeading,
                {
                  color:
                    theme.name === 'dark' ? Palette.snow : Palette.pineForest,
                },
              ]}
            >
              Emergency Shelters & Medical Centres
            </Text>

            {resources.map((res) => (
              <View
                key={res.id}
                style={[
                  styles.resourceCard,
                  {
                    backgroundColor:
                      theme.name === 'dark'
                        ? Palette.surfaceDarkElevated
                        : Palette.snow,
                    borderColor:
                      theme.name === 'dark'
                        ? Palette.surfaceDarkBorder
                        : Palette.stone,
                  },
                ]}
              >
                <View style={styles.resourceHeader}>
                  <Badge
                    label={res.category.toUpperCase()}
                    variant="brand"
                  />
                  <Text style={styles.resourceStatus}>
                    {res.isOperational ? 'OPERATIONAL' : 'CLOSED'}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.resourceName,
                    {
                      color:
                        theme.name === 'dark'
                          ? Palette.snow
                          : Palette.pineForest,
                    },
                  ]}
                >
                  {res.name}
                </Text>

                <Text
                  style={[
                    styles.resourceAddress,
                    {
                      color:
                        theme.name === 'dark'
                          ? Palette.stone
                          : Palette.slate,
                    },
                  ]}
                >
                  {res.address}
                </Text>

                {res.capacity && (
                  <View style={styles.capacityRow}>
                    <Text style={styles.capacityText}>
                      Capacity: {res.currentOccupancy || 0} / {res.capacity} beds
                    </Text>
                  </View>
                )}

                <Pressable
                  style={styles.resourceCallRow}
                  onPress={() => Linking.openURL(`tel:${res.phone}`)}
                >
                  <PhoneCall size={14} color={Palette.pineForestMuted} />
                  <Text style={styles.resourcePhone}>{res.phone}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Help Request Modal */}
      <Modal visible={showHelpModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  theme.name === 'dark'
                    ? Palette.surfaceDarkElevated
                    : Palette.snow,
              },
            ]}
          >
            <Text
              style={[
                styles.modalHeading,
                {
                  color:
                    theme.name === 'dark' ? Palette.snow : Palette.pineForest,
                },
              ]}
            >
              Post Emergency Help Request
            </Text>

            {/* Category selection */}
            <View style={styles.modalCategoryRow}>
              {(['food', 'water', 'medical', 'transport', 'shelter'] as const).map(
                (cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.modalCategoryChip,
                      helpCategory === cat && styles.modalCategoryChipActive,
                    ]}
                    onPress={() => setHelpCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.modalCategoryText,
                        helpCategory === cat && styles.modalCategoryTextActive,
                      ]}
                    >
                      {cat.toUpperCase()}
                    </Text>
                  </Pressable>
                )
              )}
            </View>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor:
                    theme.name === 'dark'
                      ? Palette.surfaceDark
                      : Palette.stoneLight,
                  color:
                    theme.name === 'dark' ? Palette.snow : Palette.slate,
                },
              ]}
              placeholder="Your Name (Optional)"
              placeholderTextColor={Palette.slateMuted}
              value={requesterName}
              onChangeText={setRequesterName}
            />

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor:
                    theme.name === 'dark'
                      ? Palette.surfaceDark
                      : Palette.stoneLight,
                  color:
                    theme.name === 'dark' ? Palette.snow : Palette.slate,
                },
              ]}
              placeholder="What help is needed? (e.g. 4x4 Bolero transport)"
              placeholderTextColor={Palette.slateMuted}
              value={helpTitle}
              onChangeText={setHelpTitle}
            />

            <TextInput
              style={[
                styles.modalInput,
                styles.modalTextarea,
                {
                  backgroundColor:
                    theme.name === 'dark'
                      ? Palette.surfaceDark
                      : Palette.stoneLight,
                  color:
                    theme.name === 'dark' ? Palette.snow : Palette.slate,
                },
              ]}
              placeholder="Details (number of people, medical condition, urgency)"
              placeholderTextColor={Palette.slateMuted}
              value={helpDescription}
              onChangeText={setHelpDescription}
              multiline
              numberOfLines={3}
            />

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor:
                    theme.name === 'dark'
                      ? Palette.surfaceDark
                      : Palette.stoneLight,
                  color:
                    theme.name === 'dark' ? Palette.snow : Palette.slate,
                },
              ]}
              placeholder="Exact Location / Ward / Landmark"
              placeholderTextColor={Palette.slateMuted}
              value={helpLocation}
              onChangeText={setHelpLocation}
            />

            <View style={styles.modalActions}>
              <AppButton
                label="Cancel"
                variant="outline"
                size="md"
                style={{ flex: 1 }}
                onPress={() => setShowHelpModal(false)}
              />
              <AppButton
                label="Submit Request"
                variant="primary"
                size="md"
                style={{ flex: 1 }}
                onPress={handleCreateHelpRequest}
              />
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerSubtitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    letterSpacing: Typography.letterSpacing.wider,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.headingSm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
  },
  selectorContainer: {
    marginBottom: Spacing.md,
  },
  selectorLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom: Spacing.xs,
  },
  communityScroll: {
    flexDirection: 'row',
  },
  communityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Palette.stoneLight,
    marginRight: Spacing.sm,
    gap: 4,
  },
  communityChipSelected: {
    backgroundColor: Palette.pineForest,
  },
  communityChipText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.bodySm,
    color: Palette.slate,
  },
  communityChipTextSelected: {
    color: Palette.snow,
  },
  overviewCard: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  overviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  overviewDistrict: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    letterSpacing: Typography.letterSpacing.wider,
  },
  overviewName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.headingSm,
  },
  overviewDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.bodySm,
    lineHeight: Typography.lineHeight.bodySm,
    marginVertical: Spacing.sm,
  },
  overviewStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Palette.stone,
    marginVertical: Spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.headingSm,
    color: Palette.pineForest,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateMuted,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Palette.stone,
  },
  hotlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  hotlineLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.caption,
    color: Palette.slate,
  },
  hotlineNumber: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    color: Palette.rescueRed,
  },
  tabsContainer: {
    marginBottom: Spacing.md,
  },
  tabsScrollContent: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingRight: Spacing.md,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.full,
    borderWidth: 1,
    gap: 6,
  },
  tabButtonText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
  },
  tabContent: {
    marginBottom: Spacing.xl,
  },
  feedCard: {
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  feedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  feedCardTime: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateMuted,
  },
  feedCardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyLg,
    marginBottom: 4,
  },
  feedCardBody: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.bodySm,
    lineHeight: Typography.lineHeight.bodySm,
    marginBottom: Spacing.sm,
  },
  feedCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: Palette.stoneLight,
    paddingTop: Spacing.xs,
  },
  feedCardAuthor: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateMuted,
  },
  corroborationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  corroborationText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    color: Palette.verifiedGreen,
  },
  helpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tabHeading: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.subheading,
  },
  helpCard: {
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  helpCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  helpTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyMd,
    marginBottom: 4,
  },
  helpDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.bodySm,
    lineHeight: Typography.lineHeight.bodySm,
    marginBottom: Spacing.sm,
  },
  helpMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  helpLocation: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.slateMuted,
  },
  fulfillBtn: {
    marginTop: Spacing.xs,
  },
  volunteerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  volunteerInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  volunteerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  volunteerName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyMd,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  skillPill: {
    backgroundColor: Palette.stoneLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.xs,
  },
  skillPillText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.caption,
    color: Palette.slate,
    textTransform: 'capitalize',
  },
  volunteerCallBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.pineForest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceCard: {
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  resourceStatus: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.caption,
    color: Palette.verifiedGreen,
    letterSpacing: Typography.letterSpacing.wide,
  },
  resourceName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.bodyLg,
    marginBottom: 2,
  },
  resourceAddress: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.bodySm,
    marginBottom: Spacing.xs,
  },
  capacityRow: {
    marginVertical: 4,
  },
  capacityText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForestMuted,
  },
  resourceCallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  resourcePhone: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.caption,
    color: Palette.pineForestMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
  },
  modalHeading: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.subheading,
    marginBottom: Spacing.md,
  },
  modalCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  modalCategoryChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radii.sm,
    backgroundColor: Palette.stoneLight,
  },
  modalCategoryChipActive: {
    backgroundColor: Palette.pineForest,
  },
  modalCategoryText: {
    fontFamily: Typography.fontFamily.semibold,
    fontSize: Typography.fontSize.caption,
    color: Palette.slate,
  },
  modalCategoryTextActive: {
    color: Palette.snow,
  },
  modalInput: {
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: Typography.fontSize.bodySm,
    marginBottom: Spacing.sm,
  },
  modalTextarea: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
