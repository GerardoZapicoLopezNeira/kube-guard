// src/components/VerbFilter.tsx
"use client"

import type { FC } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"


export interface FilterOption {
  label: string
  value: string
}

interface VerbFilterProps {
  options: FilterOption[]
  selected: string[]
  onToggle: (value: string) => void
}

export const VerbFilter: FC<VerbFilterProps> = ({
  options,
  selected,
  onToggle,
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="min-w-[120px]">
        {selected.length ? selected.join(", ") : "Select verbs"}
      </Button>
    </PopoverTrigger>

    <PopoverContent side="bottom" align="start" className="w-[180px] p-2">
      <div className="max-h-60 overflow-auto space-y-1">
        {options.map(opt => {
          const isChecked = selected.includes(opt.value)
          return (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/20 cursor-pointer"
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => onToggle(opt.value)}
                className={`
                  h-5 w-5
                  aspect-square
                  bg-transparent border border-primary
                  shadow-none rounded-sm
                  focus-visible:ring-0
                  data-[state=checked]:bg-primary
                  data-[state=checked]:border-transparent
                  data-[state=checked]:text-primary-foreground
                `}
              />
              <span className="text-sm leading-none">{opt.label}</span>
            </label>
          )
        })}
      </div>
    </PopoverContent>
  </Popover>
)
