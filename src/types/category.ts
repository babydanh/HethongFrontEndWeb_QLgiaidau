export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string;
  categoryConfig?: Record<string, unknown>;
}
