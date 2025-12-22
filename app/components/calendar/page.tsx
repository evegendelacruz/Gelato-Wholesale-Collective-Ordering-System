import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Calendar Component - Export this to use in your dashboard
export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    // Convert Sunday (0) to 6, and shift Monday to 0
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Previous month days
    const prevMonthDays = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i)
      });
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4" style={{ fontFamily: '"Roboto Condensed", sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-opacity-80 transition-colors"
          style={{ backgroundColor: '#8B4513' }}
        >
          <ChevronLeft className="text-white" size={24} />
        </button>
        
        <h2 className="text-2xl font-bold" style={{ color: '#8B4513' }}>
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        
        <button
          onClick={nextMonth}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-opacity-80 transition-colors"
          style={{ backgroundColor: '#8B4513' }}
        >
          <ChevronRight className="text-white" size={24} />
        </button>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map(day => (
          <div
            key={day}
            className="text-center text-xs font-bold py-2"
            style={{ color: '#8B4513' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayInfo, index) => {
          const isToday = dayInfo.date.toDateString() === new Date().toDateString();
          
          return (
            <div
              key={index}
              className={`min-h-24 border p-1 ${
                dayInfo.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
              style={{ borderColor: '#8B4513' }}
            >
              <div
                className={`text-xs font-semibold mb-1 ${
                  dayInfo.isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
                } ${isToday ? 'text-blue-600' : ''}`}
              >
                {dayInfo.day}
              </div>
              
              {/* Orders will be displayed here when fetched from your database */}
              <div className="space-y-1">
                {/* Future: Map through orders for this date */}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}