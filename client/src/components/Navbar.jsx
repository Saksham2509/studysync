import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-purple-600 p-4 text-white flex justify-between">
      <h1 className="text-xl font-bold">StudySync</h1>
      <div className="flex space-x-4">
        <Link to="/" className="hover:text-gray-300">Home</Link>
        <Link to="/about" className="hover:text-gray-300">About</Link>
        <Link to="/study-room" className="hover:text-gray-300">Study Room</Link>
      </div>
    </nav>
  );
}
