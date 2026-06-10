# Graph Report - .  (2026-06-09)

## Corpus Check
- 106 files · ~251,794 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 198 nodes · 276 edges · 18 communities (13 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 19 edges
2. `compilerOptions` - 16 edges
3. `api` - 11 edges
4. `useAuthStore` - 10 edges
5. `Button` - 7 edges
6. `scripts` - 5 edges
7. `Input` - 5 edges
8. `Tournament` - 5 edges
9. `Header()` - 4 edges
10. `Category` - 4 edges

## Surprising Connections (you probably didn't know these)
- `HomePage()` --calls--> `useAuthStore`  [EXTRACTED]
  src/app/page.tsx → src/lib/zustand/authStore.ts
- `LoginPage()` --calls--> `useAuthStore`  [EXTRACTED]
  src/app/(public)/login/page.tsx → src/lib/zustand/authStore.ts
- `Header()` --calls--> `cn()`  [EXTRACTED]
  src/components/layout/Header.tsx → src/utils/cn.ts
- `DropdownMenuShortcut()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/DropdownMenu.tsx → src/utils/cn.ts
- `ModalHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/Modal.tsx → src/utils/cn.ts

## Import Cycles
- None detected.

## Communities (18 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (31): Avatar, AvatarFallback, AvatarImage, Badge(), BadgeProps, getVariantClasses(), DropdownMenuCheckboxItem, DropdownMenuContent (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (18): authApi, LoginFormValues, loginSchema, RegisterFormValues, registerSchema, Header(), LoginForm, LoginPage() (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (12): categoriesApi, Category, PaginatedCategories, api, matchesApi, PaginatedRankings, PlayerRanking, rankingsApi (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (19): dependencies, axios, clsx, framer-motion, @hookform/resolvers, lucide-react, next, @radix-ui/react-avatar (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (17): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (5): HomePage(), Category, communitiesApi, Community, PaginatedResponse

### Community 8 - "Community 8"
Cohesion: 0.40
Nodes (3): inter, metadata, Footer()

### Community 9 - "Community 9"
Cohesion: 0.40
Nodes (4): AuthTokens, Profile, User, UserRole

## Knowledge Gaps
- **103 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `api` connect `Community 2` to `Community 1`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `Community 1` to `Community 2`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _103 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06923076923076923 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._