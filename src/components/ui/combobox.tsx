
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
  // Use a local state for the input value to allow typing
  const [inputValue, setInputValue] = React.useState(value || "");

  // When the external value changes, update the internal input value
  React.useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const handleSelect = (currentValue: string) => {
    onChange(currentValue);
    setInputValue(currentValue); // Ensure input reflects selection
    setOpen(false)
  }
  
  // This function is for when the user types in the input
  const handleInputChange = (search: string) => {
    setInputValue(search);
    // We update the form value on every keystroke to allow creating new items
    onChange(search);
  };

  const displayValue = value ? options.find(option => option.value.toLowerCase() === value.toLowerCase())?.label || value : (placeholder || "Select option...");
  
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
            <CommandEmpty>
                {inputValue ? (
                    <CommandItem
                        value={inputValue}
                        onSelect={() => handleSelect(inputValue)}
                        className="flex items-center"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create "{inputValue}"
                    </CommandItem>
                ) : (
                    emptyMessage || "No results found."
                )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
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
