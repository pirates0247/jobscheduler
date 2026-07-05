'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '../../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  memberships?: any[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  activeOrg: any | null;
  activeProject: any | null;
  organizations: any[];
  projects: any[];
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchOrg: (orgSlug: string) => void;
  switchProject: (projectSlug: string) => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeOrg, setActiveOrg] = useState<any | null>(null);
  const [activeProject, setActiveProject] = useState<any | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const fetchMe = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data.data;
      setUser(userData);

      const orgs = userData.memberships?.map((m: any) => m.organization) ?? [];
      setOrganizations(orgs);

      // Restore active org
      if (orgs.length > 0) {
        const savedOrgSlug = localStorage.getItem('activeOrgSlug');
        const match = orgs.find((o: any) => o.slug === savedOrgSlug) ?? orgs[0];
        setActiveOrg(match);
        localStorage.setItem('activeOrgSlug', match.slug);
        
        // Fetch projects for active org
        const projectsResponse = await api.get(`/organizations/${match.slug}/projects`);
        const projs = projectsResponse.data.data.data ?? [];
        setProjects(projs);

        if (projs.length > 0) {
          const savedProjSlug = localStorage.getItem(`activeProjSlug:${match.slug}`);
          const projMatch = projs.find((p: any) => p.slug === savedProjSlug) ?? projs[0];
          setActiveProject(projMatch);
          localStorage.setItem(`activeProjSlug:${match.slug}`, projMatch.slug);
        } else {
          setActiveProject(null);
        }
      } else {
        setActiveOrg(null);
        setProjects([]);
        setActiveProject(null);
      }
    } catch (error) {
      logoutState();
      if (typeof window !== 'undefined') {
        const publicPaths = ['/', '/login', '/register'];
        if (!publicPaths.includes(window.location.pathname)) {
          window.location.href = '/login';
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const logoutState = () => {
    setUser(null);
    setOrganizations([]);
    setProjects([]);
    setActiveOrg(null);
    setActiveProject(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('activeOrgSlug');
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
      if (pathname !== '/' && pathname !== '/login' && pathname !== '/register') {
        router.push('/login');
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user: userData } = res.data.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      await fetchMe();
      router.push('/dashboard');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (firstName: string, lastName: string, email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { firstName, lastName, email, password });
      const { accessToken, refreshToken } = res.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      await fetchMe();
      router.push('/dashboard');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      // ignore
    } finally {
      logoutState();
      router.push('/login');
    }
  };

  const switchOrg = async (orgSlug: string) => {
    const org = organizations.find((o) => o.slug === orgSlug);
    if (org) {
      setActiveOrg(org);
      localStorage.setItem('activeOrgSlug', orgSlug);
      
      try {
        const projectsResponse = await api.get(`/organizations/${orgSlug}/projects`);
        const projs = projectsResponse.data.data.data ?? [];
        setProjects(projs);

        if (projs.length > 0) {
          const savedProjSlug = localStorage.getItem(`activeProjSlug:${orgSlug}`);
          const projMatch = projs.find((p: any) => p.slug === savedProjSlug) ?? projs[0];
          setActiveProject(projMatch);
          localStorage.setItem(`activeProjSlug:${orgSlug}`, projMatch.slug);
        } else {
          setActiveProject(null);
        }
      } catch (e) {
        setProjects([]);
        setActiveProject(null);
      }
    }
  };

  const switchProject = (projectSlug: string) => {
    const proj = projects.find((p) => p.slug === projectSlug);
    if (proj && activeOrg) {
      setActiveProject(proj);
      localStorage.setItem(`activeProjSlug:${activeOrg.slug}`, projectSlug);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeOrg,
        activeProject,
        organizations,
        projects,
        login,
        register,
        logout,
        switchOrg,
        switchProject,
        refreshUserData: fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
