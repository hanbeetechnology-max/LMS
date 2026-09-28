export default function Navbar() {
  return (
    <nav className="p-4 bg-gray-800 text-white flex justify-between">
      <div>Hanbee</div>
      <div>
        <a href="/login" className="mr-4">Login</a>
        <a href="/signup">Signup</a>
      </div>
    </nav>
  );
}
