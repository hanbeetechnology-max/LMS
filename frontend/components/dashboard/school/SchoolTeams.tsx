import React from 'react';

export default function SchoolTeams() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Teams</h1>
      <div className="mb-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Create Team</button>
      </div>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Team Name</th>
            <th className="p-2 border">Members</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 border">Team A</td>
            <td className="p-2 border">Alice, Bob</td>
            <td className="p-2 border">Pending</td>
            <td className="p-2 border">
              <button className="px-2 py-1 bg-green-500 text-white rounded mr-2">Add Member</button>
              <button className="px-2 py-1 bg-red-500 text-white rounded mr-2">Remove Member</button>
              <button className="px-2 py-1 bg-yellow-500 text-white rounded mr-2">Withdraw</button>
              <div className="mt-2">
                <p className="text-sm">Payment QR</p>
                <div className="border w-24 h-24 flex items-center justify-center">[QR Placeholder]</div>
                <p className="text-xs text-gray-500 mt-1">QR managed by Hanbee staff/manager</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
