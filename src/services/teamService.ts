import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Team, TeamMember, CreateTeamInput } from '../types/team';
import { UserProfile } from '../types/auth';

const TEAMS_COLLECTION = 'teams';
const TEAM_MEMBERS_COLLECTION = 'teamMembers';

// Generate a random 6-character alphanumeric code
const generateTeamCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Fallback in-memory teams & members
let localMockTeams: Team[] = [
  {
    id: 'mock-team-alpha',
    name: 'Mobile Engineering',
    description: 'Core mobile team building React Native & Firebase features',
    ownerId: 'mock-user-1',
    code: 'ENG888',
    createdAt: new Date().toISOString(),
    memberCount: 2,
  },
];

let localMockMembers: TeamMember[] = [
  {
    id: 'mock-mem-1',
    teamId: 'mock-team-alpha',
    userId: 'mock-user-1',
    role: 'owner',
    userName: 'Lead Engineer',
    userEmail: 'lead@example.com',
    joinedAt: new Date().toISOString(),
  },
  {
    id: 'mock-mem-2',
    teamId: 'mock-team-alpha',
    userId: 'mock-user-2',
    role: 'member',
    userName: 'Alice Johnson',
    userEmail: 'alice@example.com',
    joinedAt: new Date().toISOString(),
  },
];

/**
 * Create a new team and automatically add creator as 'owner' in teamMembers.
 */
export const createTeam = async (
  input: CreateTeamInput,
  currentUser: UserProfile
): Promise<Team> => {
  const teamCode = generateTeamCode();
  const newTeamData = {
    name: input.name.trim(),
    description: (input.description || '').trim(),
    ownerId: currentUser.id,
    code: teamCode,
    createdAt: new Date().toISOString(),
  };

  if (!isFirebaseConfigured() || !db) {
    const mockId = `mock-team-${Date.now()}`;
    const created: Team = {
      ...newTeamData,
      id: mockId,
      memberCount: 1,
    };
    localMockTeams = [created, ...localMockTeams];

    const mockMember: TeamMember = {
      id: `mock-mem-${Date.now()}`,
      teamId: mockId,
      userId: currentUser.id,
      role: 'owner',
      userName: currentUser.name,
      userEmail: currentUser.email,
      joinedAt: new Date().toISOString(),
    };
    localMockMembers = [mockMember, ...localMockMembers];
    return created;
  }

  // 1. Create team document in `teams` collection
  const teamsRef = collection(db, TEAMS_COLLECTION);
  const teamDocRef = await addDoc(teamsRef, newTeamData);

  // 2. Add creator to `teamMembers` collection
  const membersRef = collection(db, TEAM_MEMBERS_COLLECTION);
  await addDoc(membersRef, {
    teamId: teamDocRef.id,
    userId: currentUser.id,
    role: 'owner',
    userName: currentUser.name,
    userEmail: currentUser.email,
    joinedAt: new Date().toISOString(),
  });

  return {
    ...newTeamData,
    id: teamDocRef.id,
    memberCount: 1,
  };
};

/**
 * Join an existing team by its 6-character invite code.
 */
export const joinTeamByCode = async (
  code: string,
  currentUser: UserProfile
): Promise<Team> => {
  const cleanCode = code.trim().toUpperCase();

  if (!isFirebaseConfigured() || !db) {
    const team = localMockTeams.find((t) => t.code === cleanCode);
    if (!team) {
      throw new Error(`No team found with invite code "${cleanCode}".`);
    }

    const alreadyMember = localMockMembers.some(
      (m) => m.teamId === team.id && m.userId === currentUser.id
    );

    if (!alreadyMember) {
      localMockMembers.push({
        id: `mock-mem-${Date.now()}`,
        teamId: team.id,
        userId: currentUser.id,
        role: 'member',
        userName: currentUser.name,
        userEmail: currentUser.email,
        joinedAt: new Date().toISOString(),
      });
      team.memberCount = (team.memberCount || 1) + 1;
    }
    return team;
  }

  // Find team by code
  const teamsRef = collection(db, TEAMS_COLLECTION);
  const qTeam = query(teamsRef, where('code', '==', cleanCode));
  const snapTeam = await getDocs(qTeam);

  if (snapTeam.empty) {
    throw new Error(`No team found with code "${cleanCode}". Please check and try again.`);
  }

  const teamDoc = snapTeam.docs[0];
  const teamData = teamDoc.data();
  const team: Team = {
    id: teamDoc.id,
    name: teamData.name || '',
    description: teamData.description || '',
    ownerId: teamData.ownerId || '',
    code: teamData.code || cleanCode,
    createdAt: teamData.createdAt || new Date().toISOString(),
  };

  // Check if current user is already member
  const membersRef = collection(db, TEAM_MEMBERS_COLLECTION);
  const qMember = query(
    membersRef,
    where('teamId', '==', team.id),
    where('userId', '==', currentUser.id)
  );
  const snapMember = await getDocs(qMember);

  if (!snapMember.empty) {
    return team; // Already a member, return team directly
  }

  // Add user to teamMembers
  await addDoc(membersRef, {
    teamId: team.id,
    userId: currentUser.id,
    role: 'member',
    userName: currentUser.name,
    userEmail: currentUser.email,
    joinedAt: new Date().toISOString(),
  });

  return team;
};

/**
 * Fetch a single team by ID.
 */
export const getTeamById = async (teamId: string): Promise<Team | null> => {
  if (!isFirebaseConfigured() || !db) {
    return localMockTeams.find((t) => t.id === teamId) || null;
  }

  const docRef = doc(db, TEAMS_COLLECTION, teamId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    id: snap.id,
    name: data.name || '',
    description: data.description || '',
    ownerId: data.ownerId || '',
    code: data.code || '',
    createdAt: data.createdAt || new Date().toISOString(),
  };
};

/**
 * Subscribe to real-time teams that a specific user is a member of.
 */
export const subscribeUserTeams = (
  userId: string,
  onNext: (teams: Team[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!isFirebaseConfigured() || !db) {
    const userTeamIds = localMockMembers
      .filter((m) => m.userId === userId)
      .map((m) => m.teamId);
    const matched = localMockTeams.filter((t) => userTeamIds.includes(t.id));
    onNext(matched);
    return () => {};
  }

  const membersRef = collection(db, TEAM_MEMBERS_COLLECTION);
  const qMembers = query(membersRef, where('userId', '==', userId));

  return onSnapshot(
    qMembers,
    async (snapshot) => {
      try {
        const teamIds = snapshot.docs.map((d) => d.data().teamId as string);

        if (teamIds.length === 0) {
          onNext([]);
          return;
        }

        // Fetch team docs for each teamId
        const teamPromises = teamIds.map(async (tid) => {
          const tDoc = await getDoc(doc(db!, TEAMS_COLLECTION, tid));
          if (!tDoc.exists()) return null;
          const tData = tDoc.data();
          return {
            id: tDoc.id,
            name: tData.name || '',
            description: tData.description || '',
            ownerId: tData.ownerId || '',
            code: tData.code || '',
            createdAt: tData.createdAt || new Date().toISOString(),
          } as Team;
        });

        const resolved = (await Promise.all(teamPromises)).filter(
          (t): t is Team => t !== null
        );

        onNext(resolved);
      } catch (err) {
        console.error('Error fetching user teams:', err);
        if (onError) onError(err as Error);
      }
    },
    (error) => {
      console.error('Snapshot error for user teams:', error);
      if (onError) onError(error);
    }
  );
};

/**
 * Subscribe to real-time members of a team.
 */
export const subscribeTeamMembers = (
  teamId: string,
  onNext: (members: TeamMember[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!isFirebaseConfigured() || !db) {
    const filtered = localMockMembers.filter((m) => m.teamId === teamId);
    onNext(filtered);
    return () => {};
  }

  const membersRef = collection(db, TEAM_MEMBERS_COLLECTION);
  const q = query(membersRef, where('teamId', '==', teamId));

  return onSnapshot(
    q,
    (snapshot) => {
      const members: TeamMember[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          teamId: d.teamId,
          userId: d.userId,
          role: d.role || 'member',
          userName: d.userName || 'Member',
          userEmail: d.userEmail || '',
          joinedAt: d.joinedAt || new Date().toISOString(),
        };
      });
      onNext(members);
    },
    (error) => {
      console.error('Error listening to team members:', error);
      if (onError) onError(error);
    }
  );
};

/**
 * Get all members of a team once.
 */
export const getTeamMembers = async (teamId: string): Promise<TeamMember[]> => {
  if (!isFirebaseConfigured() || !db) {
    return localMockMembers.filter((m) => m.teamId === teamId);
  }

  const membersRef = collection(db, TEAM_MEMBERS_COLLECTION);
  const q = query(membersRef, where('teamId', '==', teamId));
  const snap = await getDocs(q);

  return snap.docs.map((docSnap) => {
    const d = docSnap.data();
    return {
      id: docSnap.id,
      teamId: d.teamId,
      userId: d.userId,
      role: d.role || 'member',
      userName: d.userName || 'Member',
      userEmail: d.userEmail || '',
      joinedAt: d.joinedAt || new Date().toISOString(),
    };
  });
};
