"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BackButton({ className }: { className?: string }) {
  const router = useRouter()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className={className}
    >
      <ArrowLeft className="w-4 h-4 mr-1.5" />
      Volver atrás
    </Button>
  )
}
