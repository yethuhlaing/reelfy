import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium tracking-tight transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_0_0_1px_var(--accent),0_8px_24px_-8px_var(--accent-glow)] hover:bg-[var(--accent-hover)] hover:shadow-[0_0_0_1px_var(--accent-hover),0_12px_32px_-8px_var(--accent-glow)]",
        outline: "border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md text-[var(--text)] hover:bg-[var(--surface2)] hover:border-[var(--border-strong)]",
        secondary: "bg-[var(--surface2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--border-strong)]",
        destructive: "bg-[var(--danger)] text-white shadow-[0_8px_24px_-8px_rgba(239,68,68,0.4)] hover:bg-[var(--danger)]/90",
        ghost: "text-[var(--text)] hover:bg-[var(--surface2)]",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3",
        lg: "h-11 px-6 text-[15px]",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
