import Timer from "../components/Timer";
import Chat from "../components/Chat";

export default function StudyRoom() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold text-purple-600 mb-8">Study Room</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Timer />
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Tasks Completed</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Solved LeetCode #123</li>
              <li>Reviewed Graph Algorithms</li>
              <li>Completed Pomodoro session</li>
            </ul>
          </div>
        </div>
        <div>
          <Chat />
        </div>
      </div>
    </div>
  );
}
