import { useCallback, useMemo } from 'react';

export interface ExcavationProject {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  type: 'excavation' | 'tunnel' | 'foundation';
  status: 'planning' | 'excavating' | 'supporting' | 'completed' | 'suspended';
  depth: number;
  area: number;
  progress: number;
  startDate: string;
  estimatedCompletion: string;
  contractor: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  weather?: any;
  workers: number;
  equipment: string[];
}

/**
 * Hook: generate & filter excavation projects dataset
 * NOTE: This is an extracted light-weight subset from DeepCADControlCenter to enable gradual refactor.
 */
export function useProjectsData(searchTerm: string, statusFilter: string, riskFilter: string) {
  const generateProjects = useCallback((): ExcavationProject[] => {
    const cities = [
      { name: '北京', lat: 39.9042, lng: 116.4074, projects: 150 },
      { name: '上海', lat: 31.2304, lng: 121.4737, projects: 200 },
      { name: '广州', lat: 23.1291, lng: 113.2644, projects: 120 },
      { name: '深圳', lat: 22.5431, lng: 114.0579, projects: 180 },
      { name: '杭州', lat: 30.2741, lng: 120.1551, projects: 100 },
      { name: '南京', lat: 32.0603, lng: 118.7969, projects: 80 },
      { name: '武汉', lat: 30.5928, lng: 114.3055, projects: 90 },
      { name: '成都', lat: 30.5728, lng: 104.0668, projects: 110 }
    ];

    const projectTypes = ['excavation', 'tunnel', 'foundation'] as const;
    const statuses = ['planning', 'excavating', 'supporting', 'completed', 'suspended'] as const;
    const riskLevels = ['low', 'medium', 'high', 'critical'] as const;
    const contractors = ['中建集团', '中铁建设', '中交建设', '上海建工', '北京建工', '广州建设'];

    const projects: ExcavationProject[] = [];
    let projectId = 1;

    cities.forEach(city => {
      for (let i = 0; i < city.projects; i++) {
        const latOffset = (Math.random() - 0.5) * 0.5;
        const lngOffset = (Math.random() - 0.5) * 0.5;
        const type = projectTypes[Math.floor(Math.random() * projectTypes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
        const depth = Math.round(5 + Math.random() * 45);
        const area = Math.round(100 + Math.random() * 4900);
        const progress = Math.round(Math.random() * 100);

        projects.push({
          id: `project-${projectId++}`,
          name: `${city.name}${type === 'excavation' ? '深基坑' : type === 'tunnel' ? '隧道' : '地基'}工程-${i + 1}`,
          location: { lat: city.lat + latOffset, lng: city.lng + lngOffset },
          type,
            status,
          depth,
          area,
          progress,
          startDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
          estimatedCompletion: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
          contractor: contractors[Math.floor(Math.random() * contractors.length)],
          riskLevel,
          workers: Math.round(10 + Math.random() * 90),
          equipment: ['挖掘机', '塔吊', '混凝土泵车'].slice(0, Math.floor(Math.random() * 3) + 1)
        });
      }
    });

    return projects;
  }, []);

  const projects = useMemo(() => generateProjects(), [generateProjects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = !searchTerm || project.name.toLowerCase().includes(searchTerm.toLowerCase()) || project.contractor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const matchesRisk = riskFilter === 'all' || project.riskLevel === riskFilter;
      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [projects, searchTerm, statusFilter, riskFilter]);

  return { projects, filteredProjects };
}
