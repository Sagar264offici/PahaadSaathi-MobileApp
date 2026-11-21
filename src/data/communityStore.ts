import { SafeStorage } from '../lib/storageHelper';

export type PostCategory =
  | 'emergency'
  | 'hazard'
  | 'road_condition'
  | 'weather_advisory'
  | 'missing_person'
  | 'help_request'
  | 'resource_offer'
  | 'official_announcement'
  | 'community_update';

export type VolunteerSkill =
  | 'first_aid'
  | 'transport'
  | 'local_route_knowledge'
  | 'shelter_assistance'
  | 'food_distribution'
  | 'water_distribution'
  | 'communication_assistance'
  | 'rescue_support';

export type HelpRequestStatus =
  | 'open'
  | 'accepted'
  | 'in_progress'
  | 'fulfilled'
  | 'cancelled'
  | 'expired';

export interface GeographicCommunity {
  id: string;
  name: string;
  district: string;
  tehsil?: string;
  gramPanchayat?: string;
  regionType: 'district' | 'tehsil' | 'panchayat' | 'village';
  description: string;
  emergencyHotline: string;
  sdrfBase: string;
  activeHazardsCount: number;
  openHelpRequestsCount: number;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  authorName: string;
  authorRole: 'citizen' | 'volunteer' | 'moderator' | 'official';
  category: PostCategory;
  title: string;
  content: string;
  locationLabel?: string;
  latitude?: number | null;
  longitude?: number | null;
  corroborationsCount: number;
  isOfficial: boolean;
  createdAt: string;
}

export interface VolunteerProfile {
  id: string;
  name: string;
  communityId: string;
  phone: string;
  skills: VolunteerSkill[];
  isVerified: boolean;
  isAvailable: boolean;
  assignedTasksCount: number;
  joinedAt: string;
}

export interface HelpRequest {
  id: string;
  communityId: string;
  requesterName: string;
  requesterPhone?: string;
  category: 'food' | 'water' | 'shelter' | 'transport' | 'medical' | 'rescue';
  title: string;
  description: string;
  location: string;
  status: HelpRequestStatus;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  assignedVolunteerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityResource {
  id: string;
  communityId: string;
  name: string;
  category: 'hospital' | 'phc' | 'police' | 'fire_station' | 'shelter' | 'water_point';
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  capacity?: number;
  currentOccupancy?: number;
  isOperational: boolean;
  verifiedAt: string;
}

// Initial Uttarakhand Regional Communities
export const UTTARAKHAND_COMMUNITIES: GeographicCommunity[] = [
  {
    id: 'chamoli_joshimath',
    name: 'Joshimath (Jyotirmath)',
    district: 'Chamoli',
    tehsil: 'Joshimath',
    gramPanchayat: 'Joshimath Urban/Rural',
    regionType: 'tehsil',
    description: 'Badrinath Yatra gateway, Hemkund Sahib base, high landslide-subsidence zone.',
    emergencyHotline: '01372-222540',
    sdrfBase: 'SDRF Base Post Joshimath',
    activeHazardsCount: 3,
    openHelpRequestsCount: 2,
  },
  {
    id: 'rudraprayag_kedarnath',
    name: 'Kedarnath Valley / Guptkashi',
    district: 'Rudraprayag',
    tehsil: 'Ukhimath',
    gramPanchayat: 'Guptkashi-Sonprayag',
    regionType: 'tehsil',
    description: 'Mandakini river basin, flood and landslide alert corridor.',
    emergencyHotline: '01364-233727',
    sdrfBase: 'SDRF Sonprayag / Lincholi',
    activeHazardsCount: 2,
    openHelpRequestsCount: 1,
  },
  {
    id: 'uttarkashi_bhatwari',
    name: 'Bhatwari / Harsil Valley',
    district: 'Uttarkashi',
    tehsil: 'Bhatwari',
    gramPanchayat: 'Harsil-Dharali',
    regionType: 'tehsil',
    description: 'Gangotri National Highway route, flash-flood & avalanche alert area.',
    emergencyHotline: '01374-222722',
    sdrfBase: 'SDRF Basecamp Bhatwari',
    activeHazardsCount: 1,
    openHelpRequestsCount: 0,
  },
  {
    id: 'pithoragarh_dharchula',
    name: 'Dharchula / Kali Valley',
    district: 'Pithoragarh',
    tehsil: 'Dharchula',
    gramPanchayat: 'Dharchula Border Zone',
    regionType: 'tehsil',
    description: 'Kailash Mansarovar route, severe monsoon cloudburst monitoring.',
    emergencyHotline: '01367-222238',
    sdrfBase: 'SDRF Dharchula Post',
    activeHazardsCount: 1,
    openHelpRequestsCount: 1,
  },
];

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: 'post_1',
    communityId: 'chamoli_joshimath',
    authorName: 'District Emergency Operations Centre Chamoli',
    authorRole: 'official',
    category: 'official_announcement',
    title: 'Rainfall Advisory & Precautionary Transit Pause',
    content: 'NH-07 traffic temporarily halted at Helang due to minor boulder falls. BRO clearance teams deployed.',
    locationLabel: 'NH-07 Helang Bypass',
    latitude: 30.5401,
    longitude: 79.5218,
    corroborationsCount: 14,
    isOfficial: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'post_2',
    communityId: 'chamoli_joshimath',
    authorName: 'Suresh Rawat',
    authorRole: 'volunteer',
    category: 'road_condition',
    title: 'Joshimath-Auli Road Cleared for Light Vehicles',
    content: 'Local panchayat volunteers cleared fallen branch near TV Tower. Road passable for 4x4 and light vehicles.',
    locationLabel: 'Auli Road km 4',
    latitude: 30.5312,
    longitude: 79.5411,
    corroborationsCount: 8,
    isOfficial: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'post_3',
    communityId: 'rudraprayag_kedarnath',
    authorName: 'DDMA Rudraprayag',
    authorRole: 'official',
    category: 'official_announcement',
    title: 'Mandakini River Flow Normal at Tilwara',
    content: 'Water levels within safe parameters. Riverbed settlements advised to remain alert during overnight hours.',
    locationLabel: 'Tilwara Bridge',
    latitude: 30.3444,
    longitude: 78.9811,
    corroborationsCount: 22,
    isOfficial: true,
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
];

const INITIAL_HELP_REQUESTS: HelpRequest[] = [
  {
    id: 'help_1',
    communityId: 'chamoli_joshimath',
    requesterName: 'Devendra Negi',
    requesterPhone: '+919412345678',
    category: 'transport',
    title: 'Medical transport needed from Sunil Village to CHC Joshimath',
    description: 'Elderly patient with breathing difficulty. Road blocked for regular sedans, 4x4 Bolero or utility vehicle required.',
    location: 'Sunil Village upper ward',
    status: 'open',
    urgency: 'high',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'help_2',
    communityId: 'chamoli_joshimath',
    requesterName: 'Radha Devi',
    requesterPhone: '+919837123456',
    category: 'food',
    title: 'Drinking water & dry rations for stranded pilgrim family',
    description: 'Family of 4 stranded near Marwari bridge due to evening boulder fall. Warm clothes and water needed.',
    location: 'Marwari Bridge check post',
    status: 'in_progress',
    urgency: 'medium',
    assignedVolunteerId: 'vol_1',
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

const INITIAL_VOLUNTEERS: VolunteerProfile[] = [
  {
    id: 'vol_1',
    name: 'Kailash Bhatt',
    communityId: 'chamoli_joshimath',
    phone: '+919456123456',
    skills: ['first_aid', 'local_route_knowledge', 'transport'],
    isVerified: true,
    isAvailable: true,
    assignedTasksCount: 3,
    joinedAt: '2026-05-10',
  },
  {
    id: 'vol_2',
    name: 'Anjali Bisht',
    communityId: 'chamoli_joshimath',
    phone: '+919897654321',
    skills: ['first_aid', 'shelter_assistance', 'food_distribution'],
    isVerified: true,
    isAvailable: true,
    assignedTasksCount: 5,
    joinedAt: '2026-06-01',
  },
  {
    id: 'vol_3',
    name: 'Manoj Negi',
    communityId: 'rudraprayag_kedarnath',
    phone: '+919758112233',
    skills: ['rescue_support', 'local_route_knowledge', 'transport'],
    isVerified: true,
    isAvailable: true,
    assignedTasksCount: 2,
    joinedAt: '2026-07-15',
  },
];

const INITIAL_RESOURCES: CommunityResource[] = [
  {
    id: 'res_1',
    communityId: 'chamoli_joshimath',
    name: 'Community Health Centre (CHC) Joshimath',
    category: 'hospital',
    address: 'Near Main Market, Joshimath, Chamoli',
    phone: '01372-222160',
    latitude: 30.5564,
    longitude: 79.5672,
    capacity: 30,
    currentOccupancy: 12,
    isOperational: true,
    verifiedAt: '2026-11-20',
  },
  {
    id: 'res_2',
    communityId: 'chamoli_joshimath',
    name: 'Joshimath Emergency Relief Shelter (GMVN Complex)',
    category: 'shelter',
    address: 'GMVN Tourist Rest House, Joshimath',
    phone: '01372-222226',
    latitude: 30.5541,
    longitude: 79.5655,
    capacity: 120,
    currentOccupancy: 28,
    isOperational: true,
    verifiedAt: '2026-11-21',
  },
  {
    id: 'res_3',
    communityId: 'chamoli_joshimath',
    name: 'Police Thana Joshimath',
    category: 'police',
    address: 'Badrinath Marg, Joshimath',
    phone: '01372-222100',
    latitude: 30.558,
    longitude: 79.568,
    isOperational: true,
    verifiedAt: '2026-11-21',
  },
];

const POSTS_KEY = 'pahaadsaathi:community:posts';
const HELP_KEY = 'pahaadsaathi:community:help_requests';
const VOLUNTEERS_KEY = 'pahaadsaathi:community:volunteers';

class CommunityStore {
  private posts: CommunityPost[] = [...INITIAL_POSTS];
  private helpRequests: HelpRequest[] = [...INITIAL_HELP_REQUESTS];
  private volunteers: VolunteerProfile[] = [...INITIAL_VOLUNTEERS];
  private resources: CommunityResource[] = [...INITIAL_RESOURCES];
  private isLoaded = false;

  private async ensureLoaded() {
    if (this.isLoaded) return;
    try {
      const pRaw = await SafeStorage.getItem(POSTS_KEY);
      if (pRaw) this.posts = JSON.parse(pRaw);

      const hRaw = await SafeStorage.getItem(HELP_KEY);
      if (hRaw) this.helpRequests = JSON.parse(hRaw);

      const vRaw = await SafeStorage.getItem(VOLUNTEERS_KEY);
      if (vRaw) this.volunteers = JSON.parse(vRaw);
    } catch {
      // Keep memory fixtures
    }
    this.isLoaded = true;
  }

  getCommunities(): GeographicCommunity[] {
    return UTTARAKHAND_COMMUNITIES;
  }

  getCommunity(id: string): GeographicCommunity | undefined {
    return UTTARAKHAND_COMMUNITIES.find((c) => c.id === id);
  }

  async getPosts(communityId?: string): Promise<CommunityPost[]> {
    await this.ensureLoaded();
    if (!communityId) return this.posts;
    return this.posts.filter((p) => p.communityId === communityId);
  }

  async addPost(post: Omit<CommunityPost, 'id' | 'createdAt' | 'corroborationsCount'>): Promise<CommunityPost> {
    await this.ensureLoaded();
    const newPost: CommunityPost = {
      ...post,
      id: `post_${Date.now()}`,
      corroborationsCount: 1,
      createdAt: new Date().toISOString(),
    };
    this.posts = [newPost, ...this.posts];
    await SafeStorage.setItem(POSTS_KEY, JSON.stringify(this.posts));
    return newPost;
  }

  async getHelpRequests(communityId?: string): Promise<HelpRequest[]> {
    await this.ensureLoaded();
    if (!communityId) return this.helpRequests;
    return this.helpRequests.filter((h) => h.communityId === communityId);
  }

  async createHelpRequest(
    request: Omit<HelpRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<HelpRequest> {
    await this.ensureLoaded();
    const now = new Date().toISOString();
    const newReq: HelpRequest = {
      ...request,
      id: `help_${Date.now()}`,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    this.helpRequests = [newReq, ...this.helpRequests];
    await SafeStorage.setItem(HELP_KEY, JSON.stringify(this.helpRequests));
    return newReq;
  }

  async updateHelpRequestStatus(id: string, status: HelpRequestStatus): Promise<void> {
    await this.ensureLoaded();
    const item = this.helpRequests.find((h) => h.id === id);
    if (item) {
      item.status = status;
      item.updatedAt = new Date().toISOString();
      await SafeStorage.setItem(HELP_KEY, JSON.stringify(this.helpRequests));
    }
  }

  async getVolunteers(communityId?: string): Promise<VolunteerProfile[]> {
    await this.ensureLoaded();
    if (!communityId) return this.volunteers;
    return this.volunteers.filter((v) => v.communityId === communityId);
  }

  async registerVolunteer(
    volunteer: Omit<VolunteerProfile, 'id' | 'joinedAt' | 'assignedTasksCount' | 'isVerified'>
  ): Promise<VolunteerProfile> {
    await this.ensureLoaded();
    const newVol: VolunteerProfile = {
      ...volunteer,
      id: `vol_${Date.now()}`,
      isVerified: false, // Requires administrator verification
      assignedTasksCount: 0,
      joinedAt: new Date().toISOString(),
    };
    this.volunteers.push(newVol);
    await SafeStorage.setItem(VOLUNTEERS_KEY, JSON.stringify(this.volunteers));
    return newVol;
  }

  getResources(communityId?: string, category?: string): CommunityResource[] {
    let list = this.resources;
    if (communityId) {
      list = list.filter((r) => r.communityId === communityId);
    }
    if (category) {
      list = list.filter((r) => r.category === category);
    }
    return list;
  }
}

export const communityStore = new CommunityStore();
