import React from 'react';

export default function SchoolSchedule() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Schedule</h1>
      <div className="mb-4 flex gap-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Day</button>
        <button className="px-4 py-2 bg-gray-200 rounded">Week</button>
        <button className="px-4 py-2 bg-gray-200 rounded">Month</button>
      </div>
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-2">School Events</h2>
        <ul className="mb-4">
          <li>2026-09-30: Parent Meeting</li>
          <li>2026-10-05: Tournament Finals</li>
        </ul>
        <h2 className="font-semibold mb-2">Personal Events</h2>
        <ul>
          <li>2026-09-28: Staff Meeting</li>
        </ul>
      </div>
    </div>
  );
}
