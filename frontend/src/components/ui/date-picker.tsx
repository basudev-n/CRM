import { useEffect, useState } from "react"
import { Calendar, Clock } from "lucide-react"

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate()

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay()

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const selectDate = (day: number) => {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    onChange(selected.toISOString().split("T")[0])
    setIsOpen(false)
  }

  const selectedDate = value ? new Date(value + "T00:00:00") : null

  useEffect(() => {
    if (selectedDate && !Number.isNaN(selectedDate.getTime())) {
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
    }
  }, [value])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border rounded-xl bg-white hover:border-zinc-400 transition-colors"
      >
        <span className={value ? "text-zinc-900" : "text-zinc-400"}>
          {value ? new Date(value + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Select date"}
        </span>
        <Calendar className="h-4 w-4 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-3 w-[280px]">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 hover:bg-zinc-100 rounded-lg"
            >
              ←
            </button>
            <span className="font-medium text-sm">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 hover:bg-zinc-100 rounded-lg"
            >
              →
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs text-zinc-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="p-1" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const isSelected = selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === currentMonth.getMonth() &&
                selectedDate.getFullYear() === currentMonth.getFullYear()
              const isToday = new Date().getDate() === day &&
                new Date().getMonth() === currentMonth.getMonth() &&
                new Date().getFullYear() === currentMonth.getFullYear()

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`p-1.5 text-sm rounded-full ${
                    isSelected
                      ? "bg-zinc-900 text-white"
                      : isToday
                      ? "bg-zinc-200 text-zinc-900"
                      : "hover:bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const periods = ["AM", "PM"]

  const [selectedHour, setSelectedHour] = useState(value ? parseInt(value.split(":")[0]) % 12 || 12 : 10)
  const [selectedMinute, setSelectedMinute] = useState(value ? parseInt(value.split(":")[1]) || 0 : 0)
  const [selectedPeriod, setSelectedPeriod] = useState(value && parseInt(value.split(":")[0]) >= 12 ? "PM" : "AM")

  useEffect(() => {
    const nextHour = value ? parseInt(value.split(":")[0]) : 10
    const nextMinute = value ? parseInt(value.split(":")[1]) || 0 : 0
    setSelectedHour(nextHour % 12 || 12)
    setSelectedMinute(nextMinute)
    setSelectedPeriod(value && nextHour >= 12 ? "PM" : "AM")
  }, [value])

  const updateTime = () => {
    let hour = selectedHour
    if (selectedPeriod === "PM" && hour !== 12) hour += 12
    if (selectedPeriod === "AM" && hour === 12) hour = 0
    onChange(`${hour.toString().padStart(2, "0")}:${selectedMinute.toString().padStart(2, "0")}`)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border rounded-xl bg-white hover:border-zinc-400 transition-colors"
      >
        <span className={value ? "text-zinc-900" : "text-zinc-400"}>
          {value
            ? `${selectedHour.toString().padStart(2, "0")}:${selectedMinute.toString().padStart(2, "0")} ${selectedPeriod}`
            : "Select time"}
        </span>
        <Clock className="h-4 w-4 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-3 w-[200px]">
          <div className="grid grid-cols-4 gap-1 mb-3">
            {hours.map((hour) => (
              <button
                key={hour}
                type="button"
                onClick={() => setSelectedHour(hour)}
                className={`p-2 text-sm rounded-lg ${
                  selectedHour === hour ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
                }`}
              >
                {hour}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-1 mb-3">
            {[0, 15, 30, 45].map((minute) => (
              <button
                key={minute}
                type="button"
                onClick={() => setSelectedMinute(minute)}
                className={`p-2 text-sm rounded-lg ${
                  selectedMinute === minute ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
                }`}
              >
                :{minute.toString().padStart(2, "0")}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1">
            {periods.map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setSelectedPeriod(period)}
                className={`p-2 text-sm rounded-lg ${
                  selectedPeriod === period ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={updateTime}
            className="w-full mt-3 py-2 bg-zinc-900 text-white text-sm rounded-xl hover:bg-zinc-800"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
