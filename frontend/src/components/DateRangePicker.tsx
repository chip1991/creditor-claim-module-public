import * as React from "react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "../lib/utils"
import { Calendar } from "./ui/calendar"
import {
  useFloating,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useInteractions,
  FloatingPortal,
  autoUpdate,
} from "@floating-ui/react"
import { AnimatePresence, motion } from "framer-motion"

export default function DateRangePicker({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const [date, setDate] = React.useState<DateRange | undefined>()
  const [isOpen, setIsOpen] = React.useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift()],
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ])

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="relative">
        <button
          ref={refs.setReference}
          {...getReferenceProps()}
          className={cn(
            "w-full flex items-center justify-start text-left font-normal px-3 py-2 bg-neutral-50 border rounded-md text-sm transition-shadow",
            !date && "text-neutral-500",
            isOpen
              ? "border-neutral-900 ring-1 ring-neutral-900"
              : "border-neutral-200 hover:border-neutral-300"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "y年MM月dd日")} -{" "}
                {format(date.to, "y年MM月dd日")}
              </>
            ) : (
              format(date.from, "y年MM月dd日")
            )
          ) : (
            <span className="text-neutral-400">选择日期范围...</span>
          )}
        </button>

        <FloatingPortal>
          <AnimatePresence>
            {isOpen && (
              <div
                ref={refs.setFloating}
                style={{ ...floatingStyles, zIndex: 50 }}
                {...getFloatingProps()}
              >
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="bg-white border border-neutral-200 rounded-lg shadow-lg p-3"
                >
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    locale={zhCN}
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </FloatingPortal>
      </div>
    </div>
  )
}