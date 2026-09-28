import React from 'react';

export default function SchoolAnnouncements() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Announcements</h1>
      <button className="px-4 py-2 bg-blue-600 text-white rounded mb-4">New Announcement</button>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Title</th>
            <th className="p-2 border">Date</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 border">Welcome Back</td>
            <td className="p-2 border">2026-09-20</td>
            <td className="p-2 border">Pinned</td>
            <td className="p-2 border">
              <button className="px-2 py-1 bg-yellow-500 text-white rounded mr-2">Edit</button>
              <button className="px-2 py-1 bg-green-500 text-white rounded mr-2">Pin/Unpin</button>
              <button className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4 text-sm text-gray-500">Announcements visible to school only</p>
    </div>
  );
}
