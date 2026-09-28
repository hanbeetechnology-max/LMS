import React from 'react';

export default function SchoolStudents() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Students</h1>
      <div className="mb-4 flex gap-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Tournament</button>
        <button className="px-4 py-2 bg-gray-200 rounded">Learning</button>
      </div>
      <div className="mb-4 flex gap-4">
        <button className="px-4 py-2 bg-green-600 text-white rounded">Bulk Invite</button>
        <button className="px-4 py-2 bg-gray-200 rounded">Mail Step</button>
      </div>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Team</th>
            <th className="p-2 border">Courses</th>
            <th className="p-2 border">Progress</th>
            <th className="p-2 border">Last Active</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 border">Team A</td>
            <td className="p-2 border">Math, Science</td>
            <td className="p-2 border">75%</td>
            <td className="p-2 border">2026-09-27</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Invitation List</h2>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 border">student@example.com</td>
              <td className="p-2 border">Pending</td>
              <td className="p-2 border">
                <button className="px-2 py-1 bg-red-500 text-white rounded mr-2">Revoke</button>
                <button className="px-2 py-1 bg-yellow-500 text-white rounded">Resend</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
