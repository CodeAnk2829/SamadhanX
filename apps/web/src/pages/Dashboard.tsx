import React, { useEffect, useState } from "react";
import SideBar from "../components/SideBar";
import { Badge, Button, Modal, Spinner, Table } from "flowbite-react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { AiOutlineDelete, AiOutlineEdit } from "react-icons/ai";
import { TiTick } from "react-icons/ti";
import { ImCross } from "react-icons/im";
import { HiOutlineExclamationCircle } from "react-icons/hi2";
import UpdateComplaintModal from "../components/UpdateComplaintModal";
import ComplaintCard from "../components/ComplaintCard";
import AdminSidebar from "../components/AdminSidebar";
import ScrollToTop from "react-scroll-to-top";
import { FaChevronUp } from "react-icons/fa";

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const { currentUser } = useSelector((state) => state.user);
  const [userComplaints, setUserComplaints] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [complaintIdToDelete, setComplaintIdToDelete] = useState('');
  const [error, setError] = useState(null);
  const [complaintIdToUpdate, setComplaintIdToUpdate] = useState('');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  useEffect(() => {
    const fetchUserComplaints = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/v1/complaint/get/user-complaints`
        );
        const data = await response.json();
        if (!data.ok) {
          throw new Error(data.error || "Failed to fetch complaints.");
        }
        setUserComplaints(data.complaintDetails);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch complaints. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserComplaints();
  }, [currentUser.id]);

  const handleDeleteComplaint = async () => {
    setShowModal(false);
    try {
      const res = await fetch(
        `/api/v1/complaint/delete/${complaintIdToDelete}`,
        {
          method: 'DELETE',
        }
      );
      const data = await res.json();
      if (!res.ok) {
        console.log(data.message);
      } else {
        setUserComplaints((prev) =>
          prev.filter((complaint) => complaint.id !== complaintIdToDelete)
        );
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4">
        {currentUser.role !== 'ADMIN' ? <SideBar/> : <AdminSidebar/>}
      </div>

      {/* Main Section */}
      <div className="w-full md:w-3/4 flex flex-col px-6 py-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner size="xl" className="fill-[rgb(60,79,131)]" />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto flex flex-col gap-8">
            {userComplaints && userComplaints.length > 0 ? (
              <div className="flex flex-col gap-6">
                <h2 className="text-2xl font-semibold text-center">
                  Dashboard
                </h2>
                <ScrollToTop smooth component={<FaChevronUp />} className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg"/>
                <div className="flex flex-col gap-4">
                  {userComplaints.map((complaint) => (
                    <ComplaintCard
                      key={complaint.id}
                      complaint={complaint}
                      showProfile={false}
                      showUpvote={false}
                      showActions={true}
                      showBadges={true}
                      onUpdate={(id) => {
                        setComplaintIdToUpdate(id);
                        setUpdateModalOpen(true);
                      }}
                      onDelete={(id) => {
                        setComplaintIdToDelete(id);
                        setShowModal(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                No complaints found.
              </div>
            )}
          </div>
        )}
      </div>
      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        popup
        size='md'
      >
        <Modal.Header />
        <Modal.Body>
          <div className='text-center'>
            <HiOutlineExclamationCircle className='h-14 w-14 text-gray-400 dark:text-gray-200 mb-4 mx-auto' />
            <h3 className='mb-5 text-lg text-gray-500 dark:text-gray-400'>
              Are you sure you want to delete this complaint?
            </h3>
            <div className='flex justify-center gap-4'>
              <Button color='failure' onClick={handleDeleteComplaint}>
                Yes, I'm sure
              </Button>
              <Button color='gray' onClick={() => setShowModal(false)}>
                No, cancel
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
      <UpdateComplaintModal isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)} 
        complaintIdProp={complaintIdToUpdate}/>
    </div>
  );
}

export default Dashboard;
