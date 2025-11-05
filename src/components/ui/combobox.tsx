
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
    value: string
    label: string
}

interface ComboboxProps {
    options: ComboboxOption[]
    value?: string
    onChange: (value: string) => void
    placeholder?: string
    emptyMessage?: string;
    inputPlaceholder?: string;
}


export function Combobox({ options, value, onChange, placeholder, emptyMessage, inputPlaceholder }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value || "");

  React.useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const handleSelect = (currentValue: string) => {
    const newValue = currentValue === value ? "" : currentValue
    onChange(newValue);
    setInputValue(newValue);
    setOpen(false)
  }

  const handleInputChange = (search: string) => {
    setInputValue(search);
    // Also update the form value as user types, allowing creation of new items
    onChange(search);
  };

  const displayValue = value ? options.find(option => option.value.toLowerCase() === value.toLowerCase())?.label || value : (placeholder || "Select option...");
  
  const filteredOptions = options.filter(option => option.label.toLowerCase().includes(inputValue.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder={inputPlaceholder || "Search..."}
            onValueChange={handleInputChange}
            value={inputValue}
          />
          <CommandList>
            {filteredOptions.length === 0 && inputValue && (
              <CommandItem
                value={inputValue}
                onSelect={() => handleSelect(inputValue)}
                className="flex items-center"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create "{inputValue}"
              </CommandItem>
            )}
            <CommandEmpty>{!inputValue ? 'Type to search or create.' : (emptyMessage || "No results found.")}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value && value.toLowerCase() === option.value.toLowerCase() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
