import { Bell, Globe2, Mail, PenLine, BarChart3, FileText, Scale, ShieldCheck, Sparkles, Users, Workflow } from 'lucide-react'

const icons = {
  'file-text': FileText,
  sparkles: Sparkles,
  'bar-chart': BarChart3,
  scale: Scale,
  pen: PenLine,
  mail: Mail,
  'shield-check': ShieldCheck,
  workflow: Workflow,
  globe: Globe2,
  bell: Bell,
  users: Users,
}

export function AgentIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons] ?? Sparkles
  return <Icon aria-hidden="true" size={size} strokeWidth={1.8} />
}
