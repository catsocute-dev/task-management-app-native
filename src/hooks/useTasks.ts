import { useState, useEffect, useCallback } from 'react';
import { Task, CreateTaskInput, UpdateTaskInput } from '../types/task';
import {
  subscribeToTasks,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../services/taskService';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToTasks(
      (updatedTasks) => {
        setTasks(updatedTasks);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Task subscription error:', err);
        setError(err.message || 'Failed to sync tasks from Firestore.');
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const refreshedTasks = await fetchTasks();
      setTasks(refreshedTasks);
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh tasks.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const addTask = useCallback(async (input: CreateTaskInput) => {
    try {
      const newId = await createTask(input);
      return newId;
    } catch (err: any) {
      setError(err?.message || 'Failed to create task.');
      throw err;
    }
  }, []);

  const editTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    try {
      await updateTask(id, input);
    } catch (err: any) {
      setError(err?.message || 'Failed to update task.');
      throw err;
    }
  }, []);

  const removeTask = useCallback(async (id: string) => {
    try {
      await deleteTask(id);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete task.');
      throw err;
    }
  }, []);

  return {
    tasks,
    loading,
    refreshing,
    error,
    addTask,
    editTask,
    removeTask,
    handleRefresh,
  };
};
