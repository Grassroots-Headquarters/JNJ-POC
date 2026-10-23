import type { Tables } from "./database.types";
import type { TypedClient } from "./client";

export type PlatformStatus = Tables<"platform_status">;

/**
 * Read the single `platform_status` row. Both "connected" screens call this;
 * a thrown error is what they render as the error state.
 */
export async function getPlatformStatus(client: TypedClient): Promise<PlatformStatus> {
  const { data, error } = await client.from("platform_status").select("id, message").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data;
}
