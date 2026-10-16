export type TeamRole = 'owner' | 'admin' | 'member';

export interface Team {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  code: string;
  createdAt: string;
  memberCount?: number;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  userName: string;
  userEmail: string;
  joinedAt: string;
}

export interface CreateTeamInput {
  name: string;
  description: string;
}
