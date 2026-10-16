import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Task, CreateTaskInput, UpdateTaskInput } from '../types/task';

const TASKS_COLLECTION = 'tasks';

// In-memory fallback tasks for preview if Firebase credentials are not yet set
let localMockTasks: Task[] = [
  {
    id: 'sample-task-1',
    title: 'Set up Firebase Firestore & Authentication',
    description: 'Ensure user registration and auth persistence work smoothly.',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    teamId: 'mock-team-alpha',
    teamName: 'Mobile Engineering',
    assigneeId: 'mock-user-1',
    assigneeName: 'Lead Engineer',
  },
  {
    id: 'sample-task-2',
    title: 'Implement Real-Time Team Chat',
    description: 'Hook Firestore onSnapshot to messages subcollection per team.',
    status: 'Done',
    priority: 'High',
    dueDate: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    teamId: 'mock-team-alpha',
    teamName: 'Mobile Engineering',
    assigneeId: 'mock-user-2',
    assigneeName: 'Alice Johnson',
  },
];

const mockListeners: ((tasks: Task[]) => void)[] = [];

const notifyMockListeners = () => {
  const tasksCopy = [...localMockTasks];
  mockListeners.forEach((listener) => listener(tasksCopy));
};

const mapDocToTask = (docSnap: any): Task => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title || '',
    description: data.description || '',
    status: data.status || 'To Do',
    priority: data.priority || 'Medium',
    dueDate: data.dueDate || null,
    createdAt: data.createdAt || new Date().toISOString(),
    teamId: data.teamId ?? null,
    teamName: data.teamName ?? null,
    assigneeId: data.assigneeId ?? null,
    assigneeName: data.assigneeName ?? null,
  };
};

/**
 * Subscribe to real-time updates for all tasks from Cloud Firestore.
 */
export const subscribeToTasks = (
  onNext: (tasks: Task[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  if (!isFirebaseConfigured() || !db) {
    onNext([...localMockTasks]);
    mockListeners.push(onNext);
    return () => {
      const idx = mockListeners.indexOf(onNext);
      if (idx !== -1) mockListeners.splice(idx, 1);
    };
  }

  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(tasksRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const tasks: Task[] = snapshot.docs.map(mapDocToTask);
        onNext(tasks);
      },
      (error) => {
        console.error('Firestore snapshot listener error:', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    console.error('Error initiating onSnapshot query:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
};

/**
 * Fetch tasks for a specific team.
 */
export const fetchTasksByTeam = async (teamId: string): Promise<Task[]> => {
  if (!isFirebaseConfigured() || !db) {
    return localMockTasks.filter((t) => t.teamId === teamId);
  }

  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(tasksRef, where('teamId', '==', teamId));
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(mapDocToTask);
    return tasks.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.error('Error fetching team tasks:', err);
    return [];
  }
};

/**
 * Fetch all tasks once (manual fetch / pull-to-refresh).
 */
export const fetchTasks = async (): Promise<Task[]> => {
  if (!isFirebaseConfigured() || !db) {
    return [...localMockTasks];
  }

  const tasksRef = collection(db, TASKS_COLLECTION);
  const q = query(tasksRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(mapDocToTask);
};

/**
 * Create a new task in Firestore.
 */
export const createTask = async (input: CreateTaskInput): Promise<string> => {
  const newTaskData = {
    title: input.title.trim(),
    description: (input.description || '').trim(),
    status: input.status || 'To Do',
    priority: input.priority || 'Medium',
    dueDate: input.dueDate || null,
    createdAt: input.createdAt || new Date().toISOString(),
    teamId: input.teamId ?? null,
    teamName: input.teamName ?? null,
    assigneeId: input.assigneeId ?? null,
    assigneeName: input.assigneeName ?? null,
  };

  if (!isFirebaseConfigured() || !db) {
    const mockId = `mock-${Date.now()}`;
    const created: Task = {
      ...newTaskData,
      id: mockId,
    };
    localMockTasks = [created, ...localMockTasks];
    notifyMockListeners();
    return mockId;
  }

  const tasksRef = collection(db, TASKS_COLLECTION);
  const docRef = await addDoc(tasksRef, newTaskData);
  return docRef.id;
};

/**
 * Update an existing task in Firestore.
 */
export const updateTask = async (id: string, input: UpdateTaskInput): Promise<void> => {
  if (!isFirebaseConfigured() || !db) {
    localMockTasks = localMockTasks.map((t) => (t.id === id ? { ...t, ...input } : t));
    notifyMockListeners();
    return;
  }

  const docRef = doc(db, TASKS_COLLECTION, id);
  await updateDoc(docRef, {
    ...input,
  });
};

/**
 * Delete a task from Firestore.
 */
export const deleteTask = async (id: string): Promise<void> => {
  if (!isFirebaseConfigured() || !db) {
    localMockTasks = localMockTasks.filter((t) => t.id !== id);
    notifyMockListeners();
    return;
  }

  const docRef = doc(db, TASKS_COLLECTION, id);
  await deleteDoc(docRef);
};
