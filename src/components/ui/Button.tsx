import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-clearstrata-ui-primary text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive',
  secondary:
    'border border-clearstrata-ui-softBorder bg-white text-clearstrata-brand-900 hover:bg-clearstrata-brand-50',
  outline: 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
  danger: 'bg-clearstrata-state-danger-solid text-clearstrata-state-danger-onSolid hover:opacity-90',
  link: 'bg-transparent text-clearstrata-brand-900 underline-offset-2 hover:underline p-0 min-h-0',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-2.5 py-1 text-xs rounded-lg gap-1',
  md: 'min-h-10 px-4 py-2 text-sm rounded-lg gap-1.5',
  lg: 'min-h-11 px-5 py-2.5 text-sm rounded-lg gap-2',
  icon: 'min-h-9 min-w-9 p-0 rounded-lg',
};

const FOCUS_CLASS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clearstrata-ui-primary/40 focus-visible:ring-offset-2';

type ButtonBaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export type ButtonProps = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
    to?: never;
  };

export type ButtonLinkProps = ButtonBaseProps & Omit<LinkProps, 'className'>;

export type ButtonAnchorProps = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> & {
    href: string;
    to?: never;
  };

function buttonInner(loading: boolean, leftIcon: ReactNode, children: ReactNode, rightIcon: ReactNode) {
  return (
    <>
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : leftIcon ? (
        <span className="inline-flex shrink-0">{leftIcon}</span>
      ) : null}
      {children ? <span className={loading ? 'opacity-90' : undefined}>{children}</span> : null}
      {!loading && rightIcon ? <span className="inline-flex shrink-0">{rightIcon}</span> : null}
    </>
  );
}

function composeButtonClass(
  variant: ButtonVariant,
  size: ButtonSize,
  loading: boolean,
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center font-semibold transition-[color,background-color,border-color,opacity] duration-150 motion-reduce:transition-none',
    variant !== 'link' && 'active:opacity-95',
    variant !== 'link' && 'disabled:pointer-events-none disabled:opacity-50',
    VARIANT_CLASS[variant],
    variant !== 'link' ? SIZE_CLASS[size] : '',
    FOCUS_CLASS,
    loading && 'cursor-wait',
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={composeButtonClass(variant, size, loading, className)}
      {...props}
    >
      {buttonInner(loading, leftIcon, children, rightIcon)}
    </button>
  );
});

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <Link
      ref={ref}
      aria-busy={loading || undefined}
      className={cn(composeButtonClass(variant, size, loading, className), loading && 'pointer-events-none opacity-50')}
      {...props}
    >
      {buttonInner(loading, leftIcon, children, rightIcon)}
    </Link>
  );
});

export const ButtonAnchor = forwardRef<HTMLAnchorElement, ButtonAnchorProps>(function ButtonAnchor(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <a
      ref={ref}
      aria-busy={loading || undefined}
      className={cn(composeButtonClass(variant, size, loading, className), loading && 'pointer-events-none opacity-50')}
      {...props}
    >
      {buttonInner(loading, leftIcon, children, rightIcon)}
    </a>
  );
});

/** Lifecycle-aware outline classes for advisory / stage-specific actions */
export function lifecycleOutlineButtonClass(
  token: 'cda' | 'consultation' | 'resolution' | 'meeting' | 'voting',
): string {
  const map = {
    cda: 'border-clearstrata-lifecycle-cda-border bg-clearstrata-lifecycle-cda-surface text-clearstrata-lifecycle-cda-text hover:opacity-90',
    consultation:
      'border-clearstrata-lifecycle-consultation-border bg-clearstrata-lifecycle-consultation-surface text-clearstrata-lifecycle-consultation-text hover:opacity-90',
    resolution:
      'border-clearstrata-lifecycle-resolution-border bg-clearstrata-lifecycle-resolution-surface text-clearstrata-lifecycle-resolution-text hover:opacity-90',
    meeting:
      'border-clearstrata-lifecycle-meeting-border bg-clearstrata-lifecycle-meeting-surface text-clearstrata-lifecycle-meeting-text hover:opacity-90',
    voting:
      'border-clearstrata-lifecycle-voting-border bg-clearstrata-lifecycle-voting-surface text-clearstrata-lifecycle-voting-text hover:opacity-90',
  };
  return map[token];
}
