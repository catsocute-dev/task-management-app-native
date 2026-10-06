export type TaskStatus = 'To Do' | 'In Progress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  teamId?: string | null;
  assigneeId?: string | null;
}

export type CreateTaskInput = Omit<Task, 'id' | 'createdAt'> & {
  createdAt?: string;
};

export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'createdAt'>>;
