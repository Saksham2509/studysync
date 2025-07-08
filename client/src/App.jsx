import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import StudyRoom from "./pages/StudyRoom";
import Navbar from "./components/Navbar";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/study-room" element={<StudyRoom />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </>
  );
}

export default App;
