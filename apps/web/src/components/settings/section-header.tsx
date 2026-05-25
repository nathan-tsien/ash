"use client";

interface SectionHeaderProps {
  heading: string;
  description: string;
}

export function SectionHeader({ heading, description }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold tracking-tight">{heading}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
