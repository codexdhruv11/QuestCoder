import { ReactNode } from 'react';

interface DialogProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({ children, open = true, onOpenChange }: DialogProps) {
  if (!open) return null;
  return (
    <div 
      style={{ background: '#0008', position: 'fixed', inset: 0, zIndex: 1000 }}
      onClick={() => onOpenChange?.(false)}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div 
      className={className}
      style={{ background: '#fff', margin: '10% auto', padding: 24, borderRadius: 8, minWidth: 320 }}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div style={{ borderBottom: '1px solid #ccc', marginBottom: 12 }}>{children}</div>;
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return <h2 style={{ fontWeight: 'bold' }}>{children}</h2>;
}

export function DialogTrigger({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
