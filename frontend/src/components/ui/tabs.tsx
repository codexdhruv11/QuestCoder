import { ReactNode } from 'react';

interface TabsProps {
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function Tabs({ children, className }: TabsProps) {
  return <div className={className}>{children}</div>;
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={className} style={{ display: 'flex', gap: 8 }}>
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  children: ReactNode;
  value: string;
  className?: string;
  [key: string]: any;
}

export function TabsTrigger({ children, value, className, ...props }: TabsTriggerProps) {
  return (
    <button className={className} {...props} style={{ padding: 6 }}>
      {children}
    </button>
  );
}

interface TabsContentProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export function TabsContent({ children, className }: TabsContentProps) {
  return <div className={className}>{children}</div>;
}
