import React from 'react';

export default function SchoolOverview() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">School Staff Overview</h1>
      <div className="flex gap-4 mb-6">
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Tournament</button>
        <button className="px-4 py-2 bg-gray-200 rounded">Learning</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold">Teams</h2>
          <p>List of teams with participants</p>
        </div>
        <div className="p-4 border rounded">
          <h2 className="font-semibold">Best Rank</h2>
          <p>Top performing team</p>
        </div>
        <div className="p-4 border rounded">
          <h2 className="font-semibold">Next Tournament</h2>
          <p>Upcoming tournament details</p>
        </div>
        <div className="p-4 border rounded">
          <h2 className="font-semibold">Team Status Counts</h2>
          <p>Verified, Pending, etc.</p>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="font-semibold mb-2">Learning Tab</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <h3 className="font-semibold">Students Enrolled</h3>
            <p>Count</p>
          </div>
          <div className="p-4 border rounded">
            <h3 className="font-semibold">Lessons Completed</h3>
            <p>Count</p>
          </div>
          <div className="p-4 border rounded">
            <h3 className="font-semibold">Average Completion</h3>
            <p>%</p>
          </div>
          <div className="p-4 border rounded">
            <h3 className="font-semibold">Per-Course Table</h3>
            <p>Course-wise stats</p>
          </div>
        </div>
      </div>
    </div>
  );
}
