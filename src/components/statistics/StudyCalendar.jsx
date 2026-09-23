import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

export default function StudyCalendar({ calendarEvents = [], onSelectDate }) {
  const events = calendarEvents.map((event) => ({
    title: event.displayTitle || event.title,
    start: event.date,
    allDay: true,
    backgroundColor: '#6366f1',
    borderColor: '#4f46e5',
    textColor: '#ffffff',
    classNames: ['study-event'],
    extendedProps: {
      duration: event.duration,
      sessions: event.sessions,
      formattedTitle: event.title,
    },
  }));

  const handleEventClick = (info) => {
    info.jsEvent.preventDefault();
    const event = info.event;
    const { sessions, formattedTitle } = event.extendedProps;
    if (onSelectDate) {
      onSelectDate(event.startStr, formattedTitle, sessions);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Study Calendar</h2>
      <div className="study-calendar overflow-x-auto">
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth',
          }}
          buttonText={{
            today: 'Today',
            month: 'Month',
          }}
          height="auto"
          events={events}
          eventDisplay="block"
          displayEventTime={false}
          dayMaxEvents={3}
          eventClick={handleEventClick}
        />
      </div>
    </div>
  );
}
