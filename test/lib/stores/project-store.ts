import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, apiClient, ApiResponse } from '../api-client';
import { mockApiClient, useMockApi } from '../mock-api';

interface ProjectState {
  // State
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchProjects: (customerId?: string) => Promise<void>;
  fetchProject: (projectId: string) => Promise<void>;
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'co2Achieved'>) => Promise<Project | null>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  clearError: () => void;
  
  // Getters
  getProjectsByStatus: (status: Project['status']) => Project[];
  getTotalCO2Achieved: () => number;
  getProjectProgress: (projectId: string) => number;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // Initial state
      projects: [],
      currentProject: null,
      isLoading: false,
      error: null,

      // Actions
      fetchProjects: async (customerId?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const client = useMockApi ? mockApiClient : apiClient;
          const response = await client.getProjects(
            customerId ? { customerId } : {}
          );
          
          if (response.success && response.data) {
            const projects = 'projects' in response.data 
              ? response.data.projects 
              : [];
            set({ projects, isLoading: false });
          } else {
            set({ error: response.error || 'プロジェクトの取得に失敗しました', isLoading: false });
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'プロジェクトの取得に失敗しました',
            isLoading: false 
          });
        }
      },

      fetchProject: async (projectId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const client = useMockApi ? mockApiClient : apiClient;
          const response = await client.getProject(projectId);
          
          if (response.success && response.data) {
            const project = 'project' in response.data ? response.data.project : response.data;
            set({ currentProject: project, isLoading: false });
            
            // プロジェクト一覧も更新
            const { projects } = get();
            const updatedProjects = projects.map(p => 
              p.id === projectId ? project : p
            );
            if (!projects.find(p => p.id === projectId)) {
              updatedProjects.push(project);
            }
            set({ projects: updatedProjects });
          } else {
            set({ error: response.error || 'プロジェクトの取得に失敗しました', isLoading: false });
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'プロジェクトの取得に失敗しました',
            isLoading: false 
          });
        }
      },

      createProject: async (project) => {
        set({ isLoading: true, error: null });
        
        try {
          const client = useMockApi ? mockApiClient : apiClient;
          const response = await client.createProject(project);
          
          if (response.success && response.data) {
            const newProject = 'project' in response.data ? response.data.project : response.data;
            const { projects } = get();
            set({ 
              projects: [...projects, newProject],
              isLoading: false 
            });
            return newProject;
          } else {
            set({ error: response.error || 'プロジェクトの作成に失敗しました', isLoading: false });
            return null;
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'プロジェクトの作成に失敗しました',
            isLoading: false 
          });
          return null;
        }
      },

      updateProject: async (projectId: string, updates: Partial<Project>) => {
        set({ isLoading: true, error: null });
        
        try {
          const client = useMockApi ? mockApiClient : apiClient;
          const response = await client.updateProject(projectId, updates);
          
          if (response.success && response.data) {
            const updatedProject = 'project' in response.data ? response.data.project : response.data;
            const { projects, currentProject } = get();
            const updatedProjects = projects.map(p => 
              p.id === projectId ? updatedProject : p
            );
            
            set({ 
              projects: updatedProjects,
              currentProject: currentProject?.id === projectId ? updatedProject : currentProject,
              isLoading: false 
            });
          } else {
            set({ error: response.error || 'プロジェクトの更新に失敗しました', isLoading: false });
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'プロジェクトの更新に失敗しました',
            isLoading: false 
          });
        }
      },

      deleteProject: async (projectId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const client = useMockApi ? mockApiClient : apiClient;
          const response = await client.deleteProject(projectId);
          
          if (response.success) {
            const { projects, currentProject } = get();
            const updatedProjects = projects.filter(p => p.id !== projectId);
            
            set({ 
              projects: updatedProjects,
              currentProject: currentProject?.id === projectId ? null : currentProject,
              isLoading: false 
            });
          } else {
            set({ error: response.error || 'プロジェクトの削除に失敗しました', isLoading: false });
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'プロジェクトの削除に失敗しました',
            isLoading: false 
          });
        }
      },

      setCurrentProject: (project: Project | null) => {
        set({ currentProject: project });
      },

      clearError: () => {
        set({ error: null });
      },

      // Getters
      getProjectsByStatus: (status: Project['status']) => {
        const { projects } = get();
        return projects.filter(p => p.status === status);
      },

      getTotalCO2Achieved: () => {
        const { projects } = get();
        return projects.reduce((total, project) => total + project.co2Achieved, 0);
      },

      getProjectProgress: (projectId: string) => {
        const { projects } = get();
        const project = projects.find(p => p.id === projectId);
        if (!project || project.co2Target === 0) return 0;
        return Math.round((project.co2Achieved / project.co2Target) * 100);
      },
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({
        projects: state.projects,
        currentProject: state.currentProject,
      }),
    }
  )
);