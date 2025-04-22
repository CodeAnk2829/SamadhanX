import { FaChevronRight, FaPlus, FaSignOutAlt } from "react-icons/fa";
import {
  HiHome,
  HiChartPie,
  HiBell,
  HiUser,
  HiClipboard,
  HiUsers,
  HiTag,
  HiLocationMarker,
} from "react-icons/hi";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signOutSuccess } from "../redux/user/userSlice";
import CreateComplaintModal from "./CreateComplaintModal";

const getInitials = (name: string) => {
  const nameParts = name.trim().split(" ");
  const initials =
    nameParts.length === 1
      ? nameParts[0][0]
      : nameParts[0][0] + nameParts[nameParts.length - 1][0];
  return initials.toUpperCase();
};

const SideBar = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [open, setOpen] = useState(true);
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignout = async () => {
    try {
      const res = await fetch("/api/v1/user/auth/signout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        console.log(data.message);
      } else {
        dispatch(signOutSuccess());
        navigate("/sign-in");
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  const sidebarOptions = [
    { label: "Home", icon: <HiHome className="text-2xl" />, path: "/" },
    { label: "Dashboard", icon: <HiChartPie className="text-2xl" />, path: "/dashboard" },
    { label: "Notifications", icon: <HiBell className="text-2xl" />, path: "/notifications" },
    { label: "Profile", icon: <HiUser className="text-2xl" />, path: "/profile" },
  ];

  return (
    <div
      className={`${
        open ? "w-full" : "w-24"
      } bg-[rgb(224,224,244)] p-5 pt-8 duration-300 sticky top-0 flex flex-col min-h-screen`}
    >
      {/* Sidebar Toggle */}
      <FaChevronRight
        className={`absolute cursor-pointer -right-3 top-9 w-7 bg-white border-dark-purple
        border-2 rounded-full ${!open && "rotate-180"}`}
        onClick={() => setOpen(!open)}
        color="bg-rgb[(224,224,244)]"
        fontSize="1.5em"
      />

      {/* Logo Section */}
      <div className={`flex gap-x-4 items-center`}>
        <img
          src="/manit_logo.png"
          className={`cursor-pointer duration-500 ${open && "rotate-[360deg] h-16"}`}
        />
        <div className={`${!open && "hidden"}`}>
          <span className="text-xl font-bold text-gray-800">Maulana Azad</span>
          <br />
          <span className="text-lg font-semibold text-gray-700">National Institute of Technology</span>
          <br />
          <span className="text-md font-light text-gray-600">Complaint Portal</span>
        </div>
      </div>

      {/* Sidebar Options */}
      <ul className="pt-6">
        <div className="flex-grow">
          {sidebarOptions.map((option, index) => (
            <Link to={option.path} key={index}>
              <li
                    className={`flex rounded-md p-3.5 cursor-pointer text-gray-800 hover:bg-gray-100 items-center gap-x-4 mt-3 text-2xl ${
                      location.pathname === option.path
                        ? "bg-[rgb(60,79,131)] text-white hover:text-slate-800"
                        : "text-gray-800 hover:bg-gray-100"
                    }`}
              >
                {option.icon}
                <span className={`${!open && "hidden"} origin-left duration-200 text-2xl`}>
                  {option.label}
                </span>
              </li>
            </Link>
          ))}

          {/* Create Complaint Button */}
          <li
            className={`flex justify-center rounded-md p-3.5 cursor-pointer text-gray-800 items-center gap-x-4 mt-3 text-2xl`}
          >
            <button
              className={`text-white bg-[rgb(60,79,131)] hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-2 py-5 text-center w-2/3 mt-10 ${
                !open && "hidden"
              }`}
              onClick={() => setIsModalOpen(true)}
            >
              Create Complaint
            </button>
            {!open && <FaPlus className="text-2xl" onClick={() => setIsModalOpen(true)} />}
          </li>

          {/* Profile Section */}
          <Link to={"/profile"}>
            <li
              className={`flex rounded-md p-3.5 cursor-pointer hover:bg-light-white text-gray-800 items-center gap-x-4 mt-3`}
            >
              <div
                className={`flex items-center ${!open ? "justify-center" : "justify-start"} w-full p-4`}
              >
                <div
                  className={`${
                    open ? "w-16 h-16" : "w-12 h-12 text-xl"
                  } bg-[rgb(60,79,131)] rounded-full flex items-center justify-center text-white text-2xl font-bold`}
                >
                  {getInitials(currentUser?.name || "Guest User")}
                </div>
                {open && (
                  <div className="ml-4">
                    <h2 className="font-bold">@{currentUser?.name}</h2>
                    <p className="text-gray-500">{currentUser?.email}</p>
                  </div>
                )}
              </div>
            </li>
          </Link>
        </div>
      </ul>

      {/* Sign Out Button */}
      <li
        className={`flex rounded-md p-3.5 cursor-pointer hover:bg-light-white text-gray-800 hover:bg-gray-100 items-center gap-x-4 mt-auto text-2xl`}
        onClick={handleSignout}
      >
        <FaSignOutAlt className="text-2xl" />
        <span className={`${!open && "hidden"} origin-left duration-200 text-2xl`}>Sign Out</span>
      </li>

      {/* Create Complaint Modal */}
      <CreateComplaintModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default SideBar;
