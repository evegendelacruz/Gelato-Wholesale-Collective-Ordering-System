'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/client';

interface OrderForDate {
  id: string;
  order_id: string;
  companyName: string;
  date: Date;
  totalQuantity: number;
}

export default function Calendar() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  // Fetch orders when component mounts or month changes
  useEffect(() => {
    fetchOrders();
  }, [currentDate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch orders with client information
      const { data: ordersData, error: ordersError } = await supabase
        .from('client_order')
        .select(`
          id,
          order_id,
          client_auth_id,
          delivery_date,
          client_user!client_order_client_auth_id_fkey(client_businessName)
        `)
        .order('delivery_date', { ascending: true });

      if (ordersError) throw ordersError;

      // For each order, fetch its items to calculate total quantity
      const ordersWithQuantities = await Promise.all(
        (ordersData || []).map(async (order: {
          id: string;
          order_id: string;
          client_auth_id: string;
          delivery_date: string;
          client_user: { client_businessName: string } | { client_businessName: string }[] | null;
        }) => {
          const { data: items } = await supabase
            .from('client_order_item')
            .select('quantity')
            .eq('order_id', order.id);

          const totalQuantity = (items || []).reduce((sum: number, item: { quantity?: number }) => sum + (item.quantity || 0), 0);

          let companyName = 'N/A';
          if (order.client_user) {
            if (Array.isArray(order.client_user)) {
              companyName = order.client_user[0]?.client_businessName || 'N/A';
            } else {
              companyName = order.client_user.client_businessName || 'N/A';
            }
          }

          return {
            id: order.id,
            order_id: order.order_id,
            companyName,
            date: new Date(order.delivery_date),
            totalQuantity
          };
        })
      );

      setOrders(ordersWithQuantities);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date: Date, ordersForDate: OrderForDate[]) => {
  if (ordersForDate.length > 0) {
    // Format date as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Store the date in sessionStorage before navigating
    sessionStorage.setItem('filterDeliveryDate', dateStr);
    
    // Navigate to order page without URL parameter
    router.push('dashboard/order');
  }
};

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    const prevMonthDays = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i)
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i)
      });
    }

    return days;
  };

  const getOrdersForDate = (date) => {
    return orders.filter(order => 
      order.date.getDate() === date.getDate() &&
      order.date.getMonth() === date.getMonth() &&
      order.date.getFullYear() === date.getFullYear()
    );
  };

  const getColorForQuantity = (quantity) => {
    if (quantity < 100) {
      return '#FCD34D'; // Yellow
    } else if (quantity >= 100 && quantity < 500) {
      return '#34D399'; // Green
    } else {
      return '#F87171'; // Red
    }
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

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FCD34D' }}></div>
          <span>Under 100 units</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#34D399' }}></div>
          <span>100-499 units</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F87171' }}></div>
          <span>500+ units</span>
        </div>
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

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayInfo, index) => {
          const isToday = dayInfo.date.toDateString() === new Date().toDateString();
          const dayOrders = getOrdersForDate(dayInfo.date);
          
          return (
            <div
              key={index}
              className={`min-h-24 border p-1 ${
                dayInfo.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } ${isToday ? 'ring-2 ring-blue-400' : ''} ${
                dayOrders.length > 0 ? 'cursor-pointer hover:bg-gray-100' : ''
              }`}
              style={{ borderColor: '#8B4513' }}
              onClick={() => handleDateClick(dayInfo.date, dayOrders)}
            >
              <div
                className={`text-xs font-semibold mb-1 ${
                  dayInfo.isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
                } ${isToday ? 'text-blue-600' : ''}`}
              >
                {dayInfo.day}
              </div>
              
              {/* Orders for this date */}
              <div className="space-y-1">
                {loading && dayInfo.isCurrentMonth ? (
                  <div className="text-xs text-gray-400">Loading...</div>
                ) : (
                  dayOrders.map((order) => (
                    <div
                      key={order.id}
                      className="text-xs px-2 py-1 rounded font-medium truncate shadow-sm"
                      style={{ 
                        backgroundColor: getColorForQuantity(order.totalQuantity),
                        color: '#1F2937'
                      }}
                      title={`${order.companyName} - ${order.totalQuantity} units (Order: ${order.order_id})`}
                    >
                      {order.companyName}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}