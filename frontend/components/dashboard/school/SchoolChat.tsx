import React from 'react';

export default function SchoolChat() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Chat</h1>
      <div className="flex">
        <div className="w-1/3 border-r pr-4">
          <h2 className="font-semibold mb-2">Conversations</h2>
          <ul>
            <li className="p-2 border-b">School Group</li>
            <li className="p-2 border-b">Hanbee Staff</li>
            <li className="p-2 border-b">Manager</li>
          </ul>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Add Group Member</button>
          <button className="mt-2 px-4 py-2 bg-red-600 text-white rounded">Remove Group Member</button>
        </div>
        <div className="w-2/3 pl-4">
          <div className="border rounded p-4 h-64 overflow-y-auto mb-4">
            <p><strong>Alice:</strong> Hello class!</p>
            <p><strong>Teacher:</strong> Welcome back!</p>
          </div>
          <input className="w-full border rounded p-2" placeholder="Type a message..." />
        </div>
      </div>
    </div>
  );
}
