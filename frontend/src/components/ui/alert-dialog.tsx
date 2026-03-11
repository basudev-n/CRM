import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface AlertDialogContentProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogHeaderProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogFooterProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogTitleProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
}

interface AlertDialogCancelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
}

const AlertDialog: React.FC<AlertDialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}

const AlertDialogContent: React.FC<AlertDialogContentProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in-0 zoom-in-95",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

const AlertDialogHeader: React.FC<AlertDialogHeaderProps> = ({ children, className }) => {
  return <div className={cn("space-y-2", className)}>{children}</div>
}

const AlertDialogFooter: React.FC<AlertDialogFooterProps> = ({ children, className }) => {
  return (
    <div className={cn("flex justify-end gap-3 mt-6", className)}>
      {children}
    </div>
  )
}

const AlertDialogTitle: React.FC<AlertDialogTitleProps> = ({ children, className }) => {
  return (
    <h2 className={cn("text-lg font-semibold text-zinc-900", className)}>
      {children}
    </h2>
  )
}

const AlertDialogDescription: React.FC<AlertDialogDescriptionProps> = ({ children, className }) => {
  return (
    <p className={cn("text-sm text-zinc-500", className)}>
      {children}
    </p>
  )
}

const AlertDialogAction: React.FC<AlertDialogActionProps> = ({ children, className, ...props }) => {
  return (
    <Button
      className={cn("bg-zinc-900 hover:bg-zinc-800 text-white", className)}
      {...props}
    >
      {children}
    </Button>
  )
}

const AlertDialogCancel: React.FC<AlertDialogCancelProps> = ({ children, className, ...props }) => {
  return (
    <Button
      variant="outline"
      className={cn("border-zinc-200", className)}
      {...props}
    >
      {children}
    </Button>
  )
}

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
