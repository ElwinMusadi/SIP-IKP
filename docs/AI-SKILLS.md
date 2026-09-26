# AI Skills

**Installation date:** 26 September 2026  
**Scope:** Project-local under `.agents/skills/`, copied by `skills` CLI 1.7.0.  
**Lock file:** `skills-lock.json` records the source path and content hash.

| Skill                   | Source                                                                                                                     | Scope         | Installation                                                                     | Purpose                                                                                                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend-design`       | [`anthropics/skills`](https://github.com/anthropics/skills), commit `33375500bcea98d610eb30ce10ac4e59b89c390d`             | Project-local | `npx skills add anthropics/skills --skill frontend-design --yes --copy`          | Design direction, deliberate visual decisions, accessibility, responsive quality, and avoidance of generic UI patterns.                                                                                                             |
| `design-taste-frontend` | [`leonxlnx/taste-skill`](https://github.com/leonxlnx/taste-skill), commit `c184364c58658b2f131b4ae8bd3d206cabb3deee`       | Project-local | `npx skills add leonxlnx/taste-skill --skill design-taste-frontend --yes --copy` | Frontend design review and visual quality guidance.                                                                                                                                                                                 |
| `shadcn`                | [`shadcn-ui/ui`](https://github.com/shadcn-ui/ui), commit `98a1fe67b439324ddc857f47fbdce056600a4329`                       | Project-local | `npx skills add https://github.com/shadcn-ui/ui --skill shadcn --yes --copy`     | Official shadcn/ui CLI, component composition, theming, Base UI, and accessibility guidance. The registry reported one Socket alert and low Snyk risk; treat skill content as guidance and continue source review before execution. |
| `tailwind-v4-shadcn`    | [`secondsky/claude-skills`](https://github.com/secondsky/claude-skills), commit `a0994f733b66aa62c47c9abc6f486652c6a16571` | Project-local | `npx skills add secondsky/claude-skills --skill tailwind-v4-shadcn --yes --copy` | Tailwind CSS v4 CSS-first integration, `@theme inline`, semantic tokens, Vite plugin, and shadcn compatibility.                                                                                                                     |

## Tailwind skill selection

The skills registry was searched before installation. Candidates included `tailwind-4-docs` and `tailwind-v4-shadcn`. The installed `tailwind-v4-shadcn` source was inspected at:

```text
plugins/tailwind-v4-shadcn/skills/tailwind-v4-shadcn/SKILL.md
```

It explicitly covers Tailwind CSS v4, CSS-first configuration, `@theme inline`, Vite integration, and semantic token mapping. It does not provide a comprehensive responsive-design guide; responsive behavior remains governed by the Product Blueprint, accessibility baseline, and installed frontend design skills.

## Verification

Run:

```bash
npx skills list --json
```

All four skills must report `scope: "project"`. The copied skills are intentionally committed as project development guidance; they do not affect the production bundle.
