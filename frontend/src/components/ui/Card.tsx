import type { HTMLAttributes, ReactNode } from 'react';

function cx(...c: (string | false | undefined)[]): string {
  return c.filter(Boolean).join(' ');
}

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('rounded-2xl border border-hairline bg-surface shadow-card', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
}: {
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 pt-5">
      <h3 className="font-heading text-base font-semibold text-content">{title}</h3>
      {action}
    </div>
  );
}
