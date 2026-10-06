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
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Task, CreateTaskInput, UpdateTaskInput } from '../types/task';

const TASKS_COLLECTION = 'tasks';

// In-memory fallback tasks for preview if Firebase credentials are not yet set
let localMockTasks: Task[] = [
  {
    id: 'sample-task-1',
    title: 'Set up Firebase Firestore',
    description: 'Create a Firebase project and connect it using credentials in .env',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    teamId: null,
    assigneeId: null,
  },
  {
    id: 'sample-task-2',
    title: 'Review Data Model Requirements',
    description: 'Ensure all required fields (title, status, priority, dueDate) are documented',
    status: 'Done',
    priority: 'Medium',
    dueDate: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    teamId: null,
    assigneeId: null,
  },
  {
    id: 'sample-task-3',
    title: 'Prepare Practical Exam 1 Report',
    description: 'Take screenshots of CRUD operations and write summary documentation',
    status: 'To Do',
    priority: 'High',
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    teamId: null,
    assigneeId: null,
  },
];

const mockListeners: ((tasks: Task[]) => void)[] = [];

const notifyMockListeners = () => {
  const tasksCopy = [...localMockTasks];
  mockListeners.forEach((listener) => listener(tasksCopy));
};

/**
 * Subscribe to real-time updates for tasks from Cloud Firestore.
 * Falls back to local in-memory store if Firebase is not yet configured.
 */
export const subscribeToTasks = (
  onNext: (tasks: Task[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  if (!isFirebaseConfigured() || !db) {
    // Notify immediately with mock data
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
        const tasks: Task[] = snapshot.docs.map((docSnap) => {
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
            assigneeId: data.assigneeId ?? null,
          };
        });
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
 * Fetch all tasks once (manual fetch / pull-to-refresh).
 */
export const fetchTasks = async (): Promise<Task[]> => {
  if (!isFirebaseConfigured() || !db) {
    return [...localMockTasks];
  }

  const tasksRef = collection(db, TASKS_COLLECTION);
  const q = query(tasksRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
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
      assigneeId: data.assigneeId ?? null,
    };
  });
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
    assigneeId: input.assigneeId ?? null,
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
