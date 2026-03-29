import { KeywordRule, Category, Project, Habit, Tag } from '@/types/database'

export function matchKeywordRules(message: string, rules: KeywordRule[]): string | null {
  const lower = message.toLowerCase()
  for (const rule of rules) {
    if (lower.includes(rule.keyword.toLowerCase())) return rule.category_id
  }
  return null
}

export function matchProjectAliases(message: string, projects: Project[]): string | null {
  const lower = message.toLowerCase()
  const words = lower.split(/\s+/)

  for (const project of projects) {
    if (lower.includes(project.name.toLowerCase())) return project.id
    if (!project.aliases) continue
    const aliases = project.aliases.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean)
    for (const alias of aliases) {
      if (alias.length <= 3) {
        if (words.includes(alias)) return project.id
      } else {
        if (lower.includes(alias)) return project.id
      }
    }
  }
  return null
}

export function buildRoutingPrompt(
  message: string,
  categories: Category[],
  projects: Project[],
  habits: Habit[],
  tags: Tag[]
): string {
  const topLevel = categories.filter((c) => !c.parent_id)
  const categoryList = topLevel.map((c) => `- ${c.name} (id: ${c.id})`).join('\n')
  const projectList = projects.map((p) => {
    const parts = [`- ${p.name} (id: ${p.id})`]
    if (p.description) parts.push(`  Description: ${p.description}`)
    if (p.aliases) parts.push(`  Aliases/collaborators: ${p.aliases}`)
    return parts.join('\n')
  }).join('\n')
  const habitList = habits.map((h) =>
    `- ${h.name} (id: ${h.id}, type: ${h.track_type}${h.unit ? `, unit: ${h.unit}` : ''})`
  ).join('\n')
  const tagList = tags.map((t) => t.name).join(', ')

  return `You are a personal note router. Analyse the following message and return a JSON object:

1. "type": one of: task, reflection, achievement, project_update, link, habit_entry
   - task: something the user INTENDS to do but hasn't done yet. Future tense or imperative.
     Also: any message starting with "to-do:", "todo:", or "task:" is ALWAYS a task.
     Examples: "go for a run", "need to email seth", "buy oat milk", "practice piano later", "to-do: book tickets", "task: reply to leo"
   If the type is "task", also set "priority": "today" or "later".
   - "later" if the message uses phrases like: "at some point", "eventually", "sometime", "when I get a chance", "one day", "would be nice to", "not urgent"
   - "today" for everything else (default)
   - habit_entry: something the user HAS ALREADY DONE — a tracked activity in the past tense.
     Examples: "went for a run", "ran 5k", "practiced piano for 30 mins", "worked on graphfm for 2hrs"
   - reflection: thoughts, feelings, observations
   - achievement: something accomplished (non-habit)
   - project_update: progress on or discussion about a research project. Also: any message starting with "project:" is ALWAYS a project_update.
   - link: a URL or recommendation to save
   CRITICAL: Pay attention to tense. "go for a run" = task. "went for a run" = habit_entry.
   A message can be BOTH a project_update AND contain habit data — use "project_update".

2. "category_id": best matching category ID, or null
Categories:
${categoryList}

3. "project_id": best matching project ID, or null.
   Match on names, descriptions, aliases, AND collaborator names.
Projects:
${projectList}

4. "habits": array of extractions, or []. Each: {"habit_id": "...", "value": number, "note": "optional"}
   ONLY extract habits for things ALREADY DONE (past tense). NOT for intentions/tasks.
   "ran 5k" → extract. "go for a run" → do NOT extract.
Habits:
${habitList}

5. "pending_habit_id": If the type is "task" and the task relates to a tracked habit, return that habit's ID.
   This links the task to the habit it will log when completed.
   "go for a run" → pending_habit_id = Running's ID. "practice piano" → pending_habit_id = Piano's ID.
   "email seth" → pending_habit_id = null (not a habit). Only set for tasks, never for habit_entry.

6. "tags": array of tags that apply to this message. ONLY use tags from this list — do not invent new ones:
[${tagList}]
Include a tag only if the message is clearly relevant to it.
Also include any tags that appear as #hashtags in the message (e.g. #leo → "leo"), if they are in the list above.

Reply with ONLY valid JSON.

Message: "${message}"

JSON:`
}

export function buildCategorizationPrompt(message: string, categories: Category[]): string {
  const topLevel = categories.filter((c) => !c.parent_id)
  const categoryList = topLevel.map((c) => `- ${c.name}`).join('\n')
  return `You are a personal note categoriser. Classify into exactly one category. Reply with only the category name.

Categories:
${categoryList}

Note: "${message}"

Category:`
}
