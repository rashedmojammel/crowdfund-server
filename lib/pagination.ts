import type { FilterQuery, Model, SortOrder } from "mongoose";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// Shared skip/limit + count for every paginated list endpoint. Appends `_id`
// as a secondary sort key so pages stay stable when multiple documents share
// the same primary sort value (e.g. identical createdAt timestamps) —
// without it, a tied sort can duplicate or skip rows across page boundaries.
export async function paginate<T>(
  model: Model<T>,
  filter: FilterQuery<T>,
  sort: Record<string, SortOrder>,
  page: number,
  limit: number
): Promise<PaginatedResult<T>> {
  const stableSort = "_id" in sort ? sort : { ...sort, _id: 1 as SortOrder };

  const [items, total] = await Promise.all([
    model
      .find(filter)
      .sort(stableSort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean() as Promise<T[]>,
    model.countDocuments(filter),
  ]);

  return { items, total };
}
