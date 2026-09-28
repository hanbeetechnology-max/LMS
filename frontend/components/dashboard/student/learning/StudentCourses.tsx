import React from 'react';

export default function StudentCourses() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Courses</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded p-4">
          <h2 className="font-semibold">Math 101</h2>
          <div className="w-full bg-gray-200 rounded h-2 mt-2">
            <div className="bg-blue-600 h-2 rounded" style={{width: '60%'}}></div>
          </div>
          <p className="text-sm mt-1">60% complete</p>
          <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded">Continue learning</button>
        </div>
        <div className="border rounded p-4">
          <h2 className="font-semibold">Science 101</h2>
          <div className="w-full bg-gray-200 rounded h-2 mt-2">
            <div className="bg-blue-600 h-2 rounded" style={{width: '100%'}}></div>
          </div>
          <p className="text-sm mt-1">100% complete</p>
          <a className="mt-2 inline-block px-3 py-1 bg-green-600 text-white rounded" href="#">Certificate</a>
        </div>
      </div>
      <h2 className="font-semibold mt-6 mb-2">Published Courses I Can Apply For</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded p-4">
          <h3 className="font-semibold">History 101</h3>
          <button className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded">Apply with payment QR</button>
        </div>
      </div>
    </div>
  );
}
