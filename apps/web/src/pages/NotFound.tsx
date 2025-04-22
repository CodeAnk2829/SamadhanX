import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center p-6">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="text-6xl font-bold text-gray-800"
      >
        404
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-lg text-gray-600 mt-4"
      >
        Oops! The page you are looking for does not exist.
      </motion.p>
      <motion.img 
        src="https://i.imgur.com/qIufhof.png" 
        alt="Not Found" 
        className="w-64 mt-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
      />
      <Link to="/">
        <button className="mt-6 px-6 py-3 text-lg bg-blue-600 text-white rounded-xl hover:bg-blue-700">
          Go to Homepage
        </button>
      </Link>
      {/* <h1 className="text-gradient text-9xl font-bold">SamadhanX</h1>
      <h3 className="text-3xl text-blue-400">{"(Next-Gen Grievance Management System)"}</h3> */}
    </div>
  );
};

export default NotFound;
