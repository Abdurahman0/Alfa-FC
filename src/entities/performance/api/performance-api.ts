import { http } from '../../../shared/api/http';
import type { ApiResponse } from '../../../shared/types/api';
import type { CoachGroup, GroupPerformanceTable } from '../types/performance';

// The performance table is used by coaches, head coaches and admins, but each
// role sees groups through a different endpoint (/coach/groups only returns
// groups the user personally coaches). Query the role-scoped endpoints plus
// the admin list, ignore the ones this user is not allowed to call, and merge.
export async function getCoachGroups(): Promise<CoachGroup[]> {
  const sources = ['/coach/groups', '/head-coach/groups', '/groups?page_size=100'];
  const results = await Promise.allSettled(
    sources.map(url => http.get<ApiResponse<CoachGroup[]>>(url))
  );
  const byId = new Map<number, CoachGroup>();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const list = r.value?.data?.data;
    if (!Array.isArray(list)) continue;
    for (const g of list) {
      if (g && g.id != null && !byId.has(g.id)) byId.set(g.id, g);
    }
  }
  return [...byId.values()];
}

export async function getGroupPerformanceTable(groupId: string | number, seasonYear: number): Promise<GroupPerformanceTable | null> {
  try {
    const { data } = await http.get<ApiResponse<GroupPerformanceTable>>(`/coach/groups/${groupId}/performance-table`, {
      params: { season_year: seasonYear },
    });
    if (!data?.data) return null;
    return data.data;
  } catch (err) {
    console.error('Performance API error:', err, { groupId, seasonYear });
    throw err;
  }
}
