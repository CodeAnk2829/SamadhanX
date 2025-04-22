import {
  Badge,
  Button,
  Carousel,
  Modal,
  Spinner,
  Tooltip,
} from "flowbite-react";
import React, { useCallback, useEffect, useState } from "react";
import { AiOutlineDelete, AiOutlineEdit } from "react-icons/ai";
import { BiSolidUpvote, BiUpvote } from "react-icons/bi";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import UpdateComplaintModal from "../components/UpdateComplaintModal";
import statusColors from "../utils/statusColors";
import Lightbox from "yet-another-react-lightbox";
import Inline from "yet-another-react-lightbox/plugins/inline";
import "yet-another-react-lightbox/styles.css";
import ComplaintTimeline from "../components/ComplaintTimeline";
import { motion } from "framer-motion";
import { useComplaintWebSocket } from "../hooks/useComplaintWebSocket";
import { formatDate } from "../utils/formatDate";


function ComplaintPage() {
  const id = useLocation().pathname.split("/")[2];
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useSelector((state: any) => state.user);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [hasUserUpvoted, setHasUserUpvoted] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [slides, setSlides] = useState<{ src: string }[]>([]);
  const [complaintHistory, setComplaintHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchComplaint();
    fetchComplaintHistory();
  }, [id]);

  const handleComplaintWebSocketUpdate = useCallback((message) => {
    if (!complaint || message.data.complaintId !== complaint.id) return;
  
    switch (message.type) {
      case "RESOLVED":
        setComplaint((prev) => ({
          ...prev,
          status: "RESOLVED",
          resolver: message.data.resolverDetails,
          resolvedAt: formatDate(message.data.resolvedAt),
        }));
        fetchComplaintHistory();
        break;
  
      case "ESCALATED":
      case "DELEGATED":
        
        setComplaint((prev) => ({
          ...prev,
          status: "ESCALATED",
          assignedTo: message.data.inchargeName,
          assignedAt: formatDate(
            message.data.escalatedAt ||
              new Date(
                Date.now() + 5 * 60 * 60 * 1000 + 30 * 60 * 1000
              ).toISOString()
          ),
        }));
        fetchComplaintHistory();
        break;
  
      case "CLOSED":
        setComplaint((prev) => ({
          ...prev,
          status: "CLOSED",
        }));
        fetchComplaintHistory();
        break;
  
      default:
        break;
    }
  }, [complaint]);

  useComplaintWebSocket(handleComplaintWebSocketUpdate);

  const fetchComplaint = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/complaint/get/complaint/${id}`);
      const data = await response.json();
      console.log(data);
      setComplaint(data);
      setHasUserUpvoted(data.hasUpvoted);

      if (data.attachments.length > 0) {
        setSlides(
          data.attachments.map((attachment) => ({ src: attachment.imageUrl }))
        );
      }
    } catch (err) {
      console.error("Error fetching complaint:", err);
      setError("Failed to load complaint. Please try again later.");
      navigate("*");
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    try {
      const res = await fetch(`/api/v1/complaint/upvote/${id}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (data.ok) {
        // Update the complaint with new upvote count and status
        setComplaint((prev) => ({
          ...prev,
          upvotes: data.upvotes,
        }));
        setHasUserUpvoted(data.hasUpvoted);
      } else {
        console.error("Failed to toggle upvote:", data.error);
      }
    } catch (error) {
      console.error("Failed to upvote the complaint:", error);
    }
  };

  const handleUpdate = async () => {
    console.log("complaint update clicked");
    setUpdateModalOpen(true);
  };

  const handleDelete = async () => {
    setDeleteModal(false);
    try {
      const res = await fetch(`/api/v1/complaint/delete/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        console.log(data.error);
      } else {
        navigate("/");
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  const fetchComplaintHistory = async () => {
    const generateDescription = (entry) => {
      if (entry.createdBy)
        return `Complaint was created by ${entry.createdBy}.`;
      if (entry.assignedTo) return `Complaint assigned to ${entry.assignedTo}.`;
      if (entry.delegatedTo) return `Delegated to ${entry.delegatedTo}.`;
      if (entry.escalatedTo) return `Escalated to ${entry.escalatedTo}.`;
      if (entry.resolvedBy) return `Resolved by ${entry.resolvedBy}.`;
      if (entry.closedBy) return `Closed by ${entry.closedBy}.`;
      return "Status updated.";
    };
    try {
      const res = await fetch(`/api/v1/complaint/get/complaint-history/${id}`);
      const data = await res.json();
      console.log(data);
      if (data.ok) {
        const timelineFormatted = data.complaintHistory.map((entry) => {
          const status = Object.keys(entry).find((k) =>
            [
              "createdBy",
              "assignedTo",
              "delegatedTo",
              "escalatedTo",
              "resolvedBy",
              "closedBy",
            ].includes(k)
          );
          return {
            status: status?.replace(/By|To/g, "") ?? "Unknown",
            description: generateDescription(entry),
            timestamp: moment(
              entry[Object.keys(entry).find((k) => /At$/.test(k))]
            )
              
              .format("DD-MM-YYYY HH:mm:ss"),
            assignedTo:
              entry.assignedTo ||
              entry.delegatedTo ||
              entry.escalatedTo ||
              entry.resolvedBy ||
              entry.closedBy ||
              "",
            designation: entry.designation || "",
            location: data.location || "",
            expiry: entry.expiredAt
              ? moment(entry.expiredAt)
                  
                  .format("DD-MM-YYYY HH:mm:ss")
              : null,
          };
        });
        setComplaintHistory(timelineFormatted);
      }
    } catch (error) {
      console.error("Error fetching complaint:", error);
      setError("Failed to load complaint. Please try again later.");
      //navigate("*");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="xl" className="fill-[rgb(60,79,131)]" />
      </div>
    );
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const createdAtDisplay = formatDate(complaint.createdAt);

  return (
    <main className="p-3 flex flex-col max-w-6xl mx-auto min-h-screen">
      <h1 className="text-3xl mt-10 p-3 text-center font-serif max-w-2xl mx-auto lg:text-4xl">
        {complaint && complaint.title}
      </h1>
      <div className="mt-4 flex flex-wrap gap-2 self-center mt-5">
        {complaint &&
          complaint.tags.length > 0 &&
          complaint.tags.map((tag: string, index: number) => (
            <Badge key={index} color="info">
              {tag}
            </Badge>
          ))}
      </div>
      <div className="mt-4 flex self-center">
        <Badge color="purple">{complaint.location}</Badge>
      </div>
      <div className="mt-4 flex gap-4 self-center">
        <Badge color={statusColors[complaint.status]}>{complaint.status}</Badge>
      </div>
      {complaint.attachments.length > 0 && (
        <div className="mt-4 flex flex-col items-center">
          <Lightbox
            styles={{
              container: { backgroundColor: "rgba(255,255,255)" },
              root: {
                "--yarl__color_button": "rgb(66,66,66)",
                "--yarl__color_button_active": "rgb(158, 158, 158)",
              },
            }}
            index={lightboxIndex}
            slides={slides}
            plugins={[Inline]}
            on={{
              view: ({ index }) => setLightboxIndex(index),
              click: () => setLightboxOpen(true),
            }}
            carousel={{
              padding: 0,
              spacing: 0,
              imageFit: "cover", // Ensures the image fills the container
            }}
            inline={{
              style: {
                width: "100%",
                height: "450px",
                maxWidth: "1000px",
                cursor: "pointer",
                alignItems: "center",
                justifyContent: "center",
              },
            }}
          />
        </div>
      )}

      {/* Lightbox for Full-Screen View */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={slides}
        on={{
          view: ({ index }) => setLightboxIndex(index),
        }}
        animation={{ fade: 0 }}
        controller={{ closeOnPullDown: true, closeOnBackdropClick: true }}
        styles={{
          container: { backgroundColor: "rgba(0,0,0,0.8)" },
          root: {
            "--yarl__color_button": "rgb(99,99,99)",
            "--yarl__color_button_active": "rgb(158, 158, 158)",
          },
        }}
      />
      <div className="mt-4 flex gap-4 self-center border-b border-slate-500">
        <p>
          <strong>Created by:</strong> {complaint && complaint.complainerName}
        </p>
        <p>
          <strong>Created:</strong> {complaint && createdAtDisplay}
        </p>
        <p>{/* <strong>Location:</strong> Location */}</p>
        <p className="flex">
          <button
            className={`text-xl ${
              hasUserUpvoted ? "text-blue-800" : "text-gray-600"
            } hover:text-blue-800`}
            onClick={handleUpvote}
          >
            {hasUserUpvoted ? <BiSolidUpvote /> : <BiUpvote />}
          </button>
          <span className="ml-2 text-gray-600 text-sm">
            {complaint && complaint.upvotes} upvotes
          </span>
        </p>
      </div>
      <div
        className="p-3 max-w-2xl mx-auto w-full"
        dangerouslySetInnerHTML={{ __html: complaint && complaint.description }}
      ></div>
      {currentUser && currentUser.id === complaint.complainerId && (
        <div className="mt-8 flex gap-4 self-center">
          <Tooltip
            content={
              complaint.status !== "ASSIGNED"
                ? "Complaint is assigned to a resolver and cannot be updated"
                : "edit complaint details"
            }
            arrow={false}
            trigger="hover"
          >
            <Button
              color="light"
              onClick={handleUpdate}
              disabled={complaint.status !== "ASSIGNED"}
            >
              <AiOutlineEdit className="mr-2" />
              Update
            </Button>
          </Tooltip>
          <Tooltip
            content={
              complaint.status !== "ASSIGNED"
                ? "Complaint is assigned to a resolver and cannot be updated"
                : "delete complaint"
            }
            arrow={false}
            trigger="hover"
          >
            <Button
              color="failure"
              onClick={() => setDeleteModal(true)}
              disabled={complaint.status !== "ASSIGNED"}
            >
              <AiOutlineDelete className="mr-2" />
              Delete
            </Button>
          </Tooltip>
          <Tooltip
            content="Show Complaint History"
            arrow={false}
            trigger="hover"
          >
            <Button
              gradientDuoTone="purpleToBlue"
              onClick={() => setShowHistory(!showHistory)}
              outline
            >
              {showHistory
                ? "Hide Complaint History"
                : "Show Complaint History"}
            </Button>
          </Tooltip>
        </div>
      )}
      <Modal show={deleteModal} onClose={() => setDeleteModal(false)} size="lg">
        <Modal.Header>Delete Complaint</Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this complaint?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button color="failure" onClick={handleDelete}>
            Delete
          </Button>
          <Button color="gray" onClick={() => setDeleteModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
      <UpdateComplaintModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        complaintIdProp={id}
      />
      {/* <ComplaintTimeline timelineData={complaintHistory} /> */}

      {showHistory && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed right-0 top-0 h-full w-1/4 shadow-lg bg-white z-50 overflow-y-auto p-6 border-l"
        >
          <ComplaintTimeline timelineData={complaintHistory} />
        </motion.div>
      )}
    </main>
  );
}

export default ComplaintPage;
