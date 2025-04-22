import { useState } from "react";
import AdminSidebar from "../components/AdminSidebar";

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("Complaints");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4">
        <AdminSidebar />
      </div>

      {/* Main Section */}
      <div className="w-full md:w-3/4 flex flex-col px-6 py-4">Admin Dashboard Analytics</div>
    </div>
  );
};

export default AdminDashboard;
