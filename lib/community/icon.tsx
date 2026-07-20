import * as LucideIcons from "lucide-react";
import { Circle, type LucideIcon, type LucideProps } from "lucide-react";

const ICONS = LucideIcons as unknown as Record<string, LucideIcon>;

function toPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[toPascalCase(name)] ?? Circle;
  return <Icon {...props} />;
}
