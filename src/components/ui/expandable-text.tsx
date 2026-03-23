"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  text: string
  maxLength?: number
  className?: string
  textClassName?: string
}

export function ExpandableText({ text, maxLength = 200, className = "", textClassName = "" }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!text) return null
  
  const isLong = text.length > maxLength

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <p className={cn("whitespace-pre-wrap break-words break-all", textClassName)}>
        {expanded || !isLong ? text : `${text.slice(0, maxLength)}...`}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setExpanded(!expanded)
          }}
          className="mt-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
        >
          {expanded ? (
            <>Leer menos <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>Leer más <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  )
}
