import type { MatchTypeDB, SportRuleKind, SportRulesEnvelope } from './tournament';

export interface CategoryConfig {
  ruleKind?: SportRuleKind;
  allowedRuleKinds?: SportRuleKind[];
  defaultSportRules?: SportRulesEnvelope;
  supportedMatchTypes?: MatchTypeDB[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  iconUrl?: string;
  categoryConfig?: CategoryConfig | null;
}

