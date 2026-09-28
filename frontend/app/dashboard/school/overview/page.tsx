export default function SchoolOverview() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">School Staff Overview</h1>
      <div className="flex gap-4 mb-6">
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Tournament</button>
        <button className="px-4 py-2 bg-gray-200 rounded">Learning</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded"><h2 className="font-semibold">Teams</h2><p>Teams and participants</p></div>
        <div className="p-4 border rounded"><h2 className="font-semibold">Best Rank</h2><p>Top performing team</p></div>
        <div className="p-4 border rounded"><h2 className="font-semibold">Next Tournament</h2><p>Upcoming tournament</p></div>
        <div className="p-4 border rounded"><h2 className="font-semibold">Team Status Counts</h2><p>Verified, Pending</p></div>
      </div>
      <div className="mt-8">
        <h2 className="font-semibold mb-2">Learning</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded"><h3>Students Enrolled</h3></div>
          <div className="p-4 border rounded"><h3>Lessons Completed</h3></div>
          <div className="p-4 border rounded"><h3>Average Completion</h3></div>
          <div className="p-4 border rounded"><h3>Per-Course Table</h3></div>
        </div>
      </div>
    </div>
  );
}
