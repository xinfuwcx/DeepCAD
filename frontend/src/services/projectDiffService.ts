import { ProjectItem } from './projectService';

export interface ProjectDiff {
  added: ProjectItem[];
  removed: ProjectItem[];
  updated: ProjectItem[]; // changed fields
}

export function diffProjects(prev: ProjectItem[], next: ProjectItem[]): ProjectDiff {
  const prevMap = new Map(prev.map(p=> [p.id,p]));
  const nextMap = new Map(next.map(p=> [p.id,p]));
  const added: ProjectItem[] = [];
  const removed: ProjectItem[] = [];
  const updated: ProjectItem[] = [];
  next.forEach(n => {
    if (!prevMap.has(n.id)) added.push(n);
    else {
      const p = prevMap.get(n.id)!;
      if (hasChanged(p, n)) updated.push(n);
    }
  });
  prev.forEach(p => { if (!nextMap.has(p.id)) removed.push(p); });
  return { added, removed, updated };
}

function hasChanged(a: ProjectItem, b: ProjectItem) {
  return a.progress !== b.progress || a.status !== b.status || a.depth !== b.depth || a.area !== b.area;
}
