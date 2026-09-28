import React, { useState, useEffect } from 'react';

export default function StudentOverview() {
  const [mode, setMode] = useState('tournament');
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/student/overview')
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Student Overview</h1>
      <div className="flex gap-4 mb-6">
        <button className={`px-4 py-2 rounded ${mode==='tournament'?'bg-blue-600 text-white':'bg-gray-200'}`} onClick={()=>setMode('tournament')}>Tournament</button>
        <button className={`px-4 py-2 rounded ${mode==='learning'?'bg-blue-600 text-white':'bg-gray-200'}`} onClick={()=>setMode('learning')}>Learning</button>
      </div>
      {mode==='tournament' ? (
        <div>
          <h2>Next Tournament: {data.tournament.nextTournament.title}</h2>
          <p>My Team: {data.tournament.myTeam.name} - {data.tournament.myTeam.status}</p>
          <ul>
            {data.tournament.leaderboardTop3.map(item => (
              <li key={item.rank}>{item.rank}. {item.team} - {item.points}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <h2>My Courses</h2>
          <ul>
            {data.learning.courses.map(c => (
              <li key={c.id}>{c.name} - {c.progress}%</li>
            ))}
          </ul>
          <p>Certificate: {data.learning.certificate.course}</p>
        </div>
      )}
    </div>
  );
}
