"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

type BackButtonProps = {
  className?: string
  fallbackHref?: string
  label?: string
}

export function BackButton({ className, fallbackHref = "/", label = "Volver atrás" }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window === "undefined") {
      router.push(fallbackHref)
      return
    }

    const hasHistory = window.history.length > 1
    const hasInternalReferrer = document.referrer.startsWith(window.location.origin)

    if (hasHistory && hasInternalReferrer) {
      router.back()
      return
    }

    router.push(fallbackHref)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={className}
    >
      <ArrowLeft className="w-4 h-4 mr-1.5" />
      {label}
    </Button>
  )
}
