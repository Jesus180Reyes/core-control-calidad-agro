import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

import { useTheme } from "#/presentation/theme/ThemeProvider"

const ESTILO_TOAST = [
  "relative! w-full! items-start! gap-3! overflow-hidden!",
  "rounded-xl! border! border-border-ui! bg-surface! p-4! pl-5! text-text-main!",
  "shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)]!",
  "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:content-['']",
].join(" ")

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="bottom-right"
      duration={10000}
      closeButton
      gap={12}
      offset={24}
      visibleToasts={4}
      icons={{
        success: (
          <CircleCheckIcon className="size-5" />
        ),
        info: (
          <InfoIcon className="size-5" />
        ),
        warning: (
          <TriangleAlertIcon className="size-5" />
        ),
        error: (
          <OctagonXIcon className="size-5" />
        ),
        loading: (
          <Loader2Icon className="size-5 animate-spin" />
        ),
      }}
      style={
        {
          "--width": "26rem",
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--text-main)",
          "--normal-border": "var(--border-ui)",
          "--border-radius": "0.75rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: `cn-toast ${ESTILO_TOAST}`,
          title: "text-[15px]! leading-5! font-semibold! text-text-main!",
          description: "mt-1! text-[13px]! leading-5! text-text-muted!",
          icon: "mt-0.5! size-5! shrink-0! self-start!",
          content: "gap-0!",
          actionButton: "bg-brand! text-primary-foreground! font-medium!",
          cancelButton: "bg-muted! text-text-main! font-medium!",
          closeButton: "border-border-ui! bg-surface! text-text-muted! hover:bg-muted! hover:text-text-main!",
          success: "before:bg-success [&_[data-icon]]:text-success",
          error: "before:bg-destructive [&_[data-icon]]:text-destructive",
          warning: "before:bg-warning [&_[data-icon]]:text-warning",
          info: "before:bg-brand [&_[data-icon]]:text-brand",
          loading: "before:bg-text-muted [&_[data-icon]]:text-text-muted",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
