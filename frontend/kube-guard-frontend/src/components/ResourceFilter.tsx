"use client"

import type { FC } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import type { FilterOption } from "./VerbFilter"

interface ResourceFilterProps {
  options: FilterOption[]
  selected: string[]
  onToggle: (value: string) => void
}

export const ResourceFilter: FC<ResourceFilterProps> = ({
  options,
  selected,
  onToggle,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-[140px]">
          {selected.length ? selected.join(", ") : "Select resources"}
        </Button>
      </PopoverTrigger>

      <PopoverContent side="bottom" align="start" className="w-[180px] p-2">
        <div className="max-h-60 overflow-auto space-y-1">
          {options.map(opt => {
            const isChecked = selected.includes(opt.value)
            return (
              <label
                key={opt.value}
                className={`
                  flex items-center gap-2
                  px-2 py-1 rounded
                  hover:bg-muted/20
                  cursor-pointer
                `}
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
}
