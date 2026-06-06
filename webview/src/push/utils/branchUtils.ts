/**
 * Utility functions for branch formatting and grouping in the Push Panel.
 */

export interface RemoteBranchGroup {
  remote: string;
  branches: string[];
}

export interface BranchInfo {
  name: string;
  isRemote: boolean;
}

/**
 * Formats a remote branch label in the style "{remote} : {branch}".
 */
export function formatRemoteBranchLabel(
  remote: string,
  branch: string,
): string {
  return `${remote} : ${branch}`;
}

/**
 * Formats the full push route display: "{local} → {remote} : {branch}".
 */
export function formatPushRoute(
  local: string,
  remote: string,
  branch: string,
): string {
  return `${local} → ${remote} : ${branch}`;
}

/**
 * Groups remote branches by remote name and sorts alphabetically (case-insensitive) within each group.
 *
 * - Filters to only `isRemote === true` entries
 * - Extracts the remote name from the first segment before `/`
 * - Sorts branches alphabetically (case-insensitive) within each group
 */
export function groupAndSortBranches(
  branches: BranchInfo[],
): RemoteBranchGroup[] {
  const groups = new Map<string, string[]>();

  for (const branch of branches) {
    if (!branch.isRemote) continue;

    const slashIndex = branch.name.indexOf("/");
    if (slashIndex === -1) continue;

    const remote = branch.name.substring(0, slashIndex);
    const branchName = branch.name.substring(slashIndex + 1);

    if (!groups.has(remote)) {
      groups.set(remote, []);
    }
    groups.get(remote)?.push(branchName);
  }

  const result: RemoteBranchGroup[] = [];
  for (const [remote, branchList] of groups) {
    branchList.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    result.push({ remote, branches: branchList });
  }

  return result;
}
