import React from 'react';

export default function SchoolCourses() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Courses</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Course</th>
            <th className="p-2 border">Students</th>
            <th className="p-2 border">Progress</th>
            <th className="p-2 border">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 border">Math 101</td>
            <td className="p-2 border">Alice, Bob</td>
            <td className="p-2 border">75%</td>
            <td className="p-2 border"><span className="px-2 py-1 bg-green-200 rounded">New</span></td>
          </tr>
          <tr>
            <td className="p-2 border">Science 101</td>
            <td className="p-2 border">Charlie</td>
            <td className="p-2 border">40%</td>
            <td className="p-2 border"></td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4 text-sm text-gray-500">Read only view</p>
    </div>
  );
}
