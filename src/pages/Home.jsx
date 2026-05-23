import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  const roles = [
    {
      name: "Employee",
      icon: "👨‍💼",
      path: "/Employee/home",
    },
    {
      name: "Admin",
      icon: "🛠️",
      path: "/Admin/home",
    },
    {
      name: "Super Admin",
      icon: "👑",
      path: "/SuperAdmin/home",
    },
  ];

  return (
    <div className="min-h-[60vh] bg-gray-100 flex items-center justify-center">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 p-8">
        {roles.map((role) => (
          <Link
            key={role.name}
            to={role.path}
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition duration-300 transform hover:-translate-y-2 p-8 flex flex-col items-center"
          >
            <div className="text-6xl mb-4">{role.icon}</div>

            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition">
              {role.name}
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Home;