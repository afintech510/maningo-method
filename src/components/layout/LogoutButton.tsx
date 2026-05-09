interface LogoutButtonProps {
  /** Visual style. 'subtle' = ghost outline (default); 'solid' = dark filled. */
  variant?: 'subtle' | 'solid';
  className?: string;
  label?: string;
}

export function LogoutButton({ variant = 'subtle', className = '', label = 'Log Out' }: LogoutButtonProps) {
  const baseClass =
    variant === 'solid'
      ? 'w-full h-11 rounded-full bg-[#2d2d2d] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors'
      : 'w-full h-11 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors';

  return (
    <form action="/api/auth/logout" method="POST" className={className}>
      <button type="submit" className={baseClass}>
        {label}
      </button>
    </form>
  );
}
