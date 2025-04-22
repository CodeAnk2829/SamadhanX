import React, { useCallback, useEffect, useState } from "react";
import SearchBar from "../components/SearchBar";
import ComplaintCard from "../components/ComplaintCard";
import { Button, Pagination, Spinner } from "flowbite-react";
import SideBar from "../components/SideBar";
import ScrollToTop from "react-scroll-to-top";
import { FaChevronUp } from "react-icons/fa";
import { customThemePagination } from "../utils/flowbiteCustomThemes";
import { useComplaintWebSocket } from "../hooks/useComplaintWebSocket";
import { IoMdRefresh } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment-timezone";
interface Complaint {
  id: string;
  complaintDetails: {
    upvotes: number;
  };
}

const Home = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [upvotedComplaints, setUpvotedComplaints] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [complaintsPerPage, setComplaintsPerPage] = useState(10);
  const [newComplaintsAvailable, setNewComplaintsAvailable] = useState(false);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const onPageChange = (page: number) => setCurrentPage(page);
  const lastComplaintIndex = currentPage * complaintsPerPage;
  const firstComplaintIndex = lastComplaintIndex - complaintsPerPage;
  const currentComplaints = complaints.slice(
    firstComplaintIndex,
    lastComplaintIndex
  );

  const handleWebSocketUpdate = useCallback((message) => {
    switch (message.type) {
      case "CREATED":
        console.log("created: ", message.data);
        setNewComplaintsAvailable(true);
        break;
      case "DELETED":
        setComplaints((prev) =>
          prev.filter((c) => c.id !== message.data.complaintId)
        );
        setFilteredComplaints((prev) =>
          prev.filter((c) => c.id !== message.data.complaintId)
        );
        break;
      case "UPDATED":
        setComplaints((prevComplaints) =>
          prevComplaints.map((complaint) =>
            complaint.id === message.data.complaintId
              ? {
                  ...complaint,
                  title: message.data.title,
                  description: message.data.description,
                  access: message.data.access,
                  postAsAnonymous: message.data.postAsAnonymous,
                  status: complaint.status, // Preserve existing status
                  isAssignedTo: message.data.isAssignedTo,
                  attachments: message.data.attachments || [],
                  tags: message.data.tags.map((t) => t.tags.tagName) || [],
                  updatedAt: message.data.updatedAt,
                }
              : complaint
          )
        );

        setFilteredComplaints((prevComplaints) =>
          prevComplaints.map((complaint) =>
            complaint.id === message.data.complaintId
              ? {
                  ...complaint,
                  title: message.data.title,
                  description: message.data.description,
                  access: message.data.access,
                  postAsAnonymous: message.data.postAsAnonymous,
                  status: complaint.status,
                  isAssignedTo: message.data.isAssignedTo,
                  attachments: message.data.attachments || [],
                  tags: message.data.tags.map((t) => t.tags.tagName) || [],
                  updatedAt: message.data.updatedAt,
                }
              : complaint
          )
        );
        break;
      case "RESOLVED":
        console.log("Complaint resolved:", message.data);
        setComplaints((prevComplaints) =>
          prevComplaints.map((complaint) =>
            complaint.id === message.data.complaintId
              ? {
                  ...complaint,
                  status: "RESOLVED",
                  resolver: {
                    name: message.data.resolverDetails.name,
                    email: message.data.resolverDetails.email,
                    phoneNumber: message.data.resolverDetails.phoneNumber,
                  },
                  resolvedAt:
                    message.data.resolverdAt || message.data.resolvedAt, //typo
                }
              : complaint
          )
        );
        setFilteredComplaints((prevComplaints) =>
          prevComplaints.map((complaint) =>
            complaint.id === message.data.complaintId
              ? {
                  ...complaint,
                  status: "RESOLVED",
                  resolver: {
                    name: message.data.resolverDetails.name,
                    email: message.data.resolverDetails.email,
                    phoneNumber: message.data.resolverDetails.phoneNumber,
                  },
                  resolvedAt:
                    message.data.resolverdAt || message.data.resolvedAt, //typo
                }
              : complaint
          ));
        break;

      case "DELEGATED":
        setComplaints((prevComplaints) =>
          prevComplaints.map((complaint) =>
            complaint.id === message.data.complaintId
              ? {
                  ...complaint,
                  status: "DELEGATED",
                  assignedTo: message.data.delegateDetails?.name,
                  assignedAt:
                    moment(message.data.delegatedAt || new Date()).format(),
                }
              : complaint
          )
        );

        setFilteredComplaints((prevComplaints) =>
          prevComplaints.map((complaint) =>
            complaint.id === message.data.complaintId
              ? {
                  ...complaint,
                  status: "DELEGATED",
                  assignedTo: message.data.delegateDetails?.name,
                  assignedAt:
                    moment(message.data.delegatedAt || new Date())
                    .format(),
                }
              : complaint
          ));
        break;

      case "ESCALATED":
        console.log("Complaint escalated:", message.data);
        const escalateComplaint = (complaint) => {
          if (complaint.id === message.data.complaintId) {
            return {
              ...complaint,
              //status: "ESCALATED",
              assignedTo: message.data.inchargeName,
              assignedAt: moment(message.data.escalatedAt || new Date()).format(),
            };
          }
          return complaint;
        };

        setComplaints((prev) => prev.map(escalateComplaint));
        setFilteredComplaints((prev) => prev.map(escalateComplaint));
        break;

      case "UPVOTED":
        const updatedComplaints = complaints.map((complaint) => {
          if (complaint.id === message.data.complaintId) {
            return { ...complaint, upvotes: message.data.upvotes };
          }
          return complaint;
        });
        setComplaints(updatedComplaints);
        setFilteredComplaints(updatedComplaints);
        
        setUpvotedComplaints((prevUpvoted) =>
          message.data.hasUpvoted
            ? [...new Set([...prevUpvoted, message.data.complaintId])]
            : prevUpvoted.filter((id) => id !== message.data.complaintId)
        );
        break;

      case "CLOSED":
        console.log("Complaint closed:", message.data);
        setComplaints((prevComplaints) =>
          prevComplaints.map((complaint) =>
            complaint.id === message.data.complaintId
              ? {
                  ...complaint,
                  status: "CLOSED",
                }
              : complaint
          )
        );
        setFilteredComplaints((prevComplaints) =>
          prevComplaints.map((complaint) =>
            complaint.id === message.data.complaintId
              ? {
                  ...complaint,
                  status: "CLOSED",
                }
              : complaint
          )
        );
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  }, []);
  useComplaintWebSocket(handleWebSocketUpdate);

  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true); // Start the loading state
      try {
        const res = await fetch("/api/v1/complaint/get/all-complaints");
        if (!res.ok) {
          throw new Error(
            "Failed to fetch complaints. Please try again later."
          );
        }
        const data = await res.json();
        if (!data.complaintDetails) {
          throw new Error("Unexpected response format.");
        }
        setComplaints(data.complaintDetails);
        setFilteredComplaints(data.complaintDetails);
        setUpvotedComplaints(data.upvotedComplaints.map((c: any) => String(c)));
      } catch (error) {
        console.error("Error fetching complaints:", error.message);
        setComplaints([]);
        setFilteredComplaints([]);
      } finally {
        setLoading(false); // Ensure loading stops regardless of success or failure
      }
    };

    fetchComplaints();
  }, []);

  const handleUpvote = async (complaintId) => {
    try {
      const res = await fetch(`/api/v1/complaint/upvote/${complaintId}`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!data.ok) {
        console.error("Failed to toggle upvote:", data.error);
        return;
      }

      setComplaints((prevComplaints) => {
        const newComplaints = prevComplaints.map((complaint) =>
          complaint.id === complaintId
            ? {
                ...complaint,
                upvotes: data.upvotes,
              }
            : complaint
        );
        // console.log("here : ", newComplaints);
        return [...newComplaints]; // Ensure a fresh array
      });

      setUpvotedComplaints((prevUpvoted) => {
        return data.hasUpvoted
          ? [...new Set([...prevUpvoted, complaintId])]
          : prevUpvoted.filter((id) => id !== complaintId);
      });

      setFilteredComplaints((prevComplaints) => {
        const newComplaints = prevComplaints.map((complaint) =>
          complaint.id === complaintId
            ? {
                ...complaint,
                upvotes: data.upvotes,
              }
            : complaint
        );
        // console.log("here : ", newComplaints);
        return [...newComplaints]; // Ensure a fresh array
      });
    } catch (error) {
      console.error("Failed to upvote the complaint:", error);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fetchNewComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/complaint/get/all-complaints");
      if (!res.ok) {
        throw new Error("Failed to fetch new complaints.");
      }
      const data = await res.json();
      setComplaints([...data.complaintDetails]);
      setFilteredComplaints([...data.complaintDetails]);
      setNewComplaintsAvailable(false);
    } catch (error) {
      console.error("Error fetching new complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredComplaints(complaints);
      return;
    }

    const lowercasedTerm = searchTerm.toLowerCase();
    const filtered = complaints.filter(
      (complaint) =>
        complaint.title?.toLowerCase().includes(lowercasedTerm) ||
        complaint.description?.toLowerCase().includes(lowercasedTerm) ||
        complaint.complainerName?.toLowerCase().includes(lowercasedTerm) ||
        complaint.tags?.some((tag) =>
          tag.toLowerCase().includes(lowercasedTerm)
        ) ||
        complaint.location?.toLowerCase().includes(lowercasedTerm)
    );

    setFilteredComplaints(filtered);
    setCurrentPage(1); // Reset to first page on new search
  };
  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4">
        <SideBar />
      </div>

      {/* Main Section */}
      <div className="w-full md:w-3/4 flex flex-col px-6 py-4">
        <div className="md:visible mb-8">
          <SearchBar onSearch={handleSearch} />
        </div>
        <AnimatePresence mode="popLayout">
          {newComplaintsAvailable && (
            <Button
              onClick={fetchNewComplaints}
              className="mb-4 w-1/4 self-center bg-[rgb(60,79,131)]"
              size="lg"
            >
              New Complaints Available &nbsp;
              <IoMdRefresh size={24} />
            </Button>
          )}

          {loading ? (
            // Loading spinner
            <div className="flex justify-center items-center h-full">
              <Spinner size="xl" className="fill-[rgb(60,79,131)]" />
            </div>
          ) : (
            <div className="max-w-6xl mx-auto flex flex-col gap-8">
              {complaints && complaints.length > 0 ? (
                <div className="flex flex-col gap-6">
                  <h2 className="text-2xl font-semibold text-center">
                    Recent Complaints
                  </h2>
                  <ScrollToTop
                    smooth
                    component={<FaChevronUp />}
                    className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg"
                  />
                  <div className="flex flex-col gap-4">
                    {filteredComplaints
                      .slice(firstComplaintIndex, lastComplaintIndex)
                      .map((complaint) => (
                        <motion.div
                          key={complaint.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          layout
                        >
                          <ComplaintCard
                            key={complaint.id}
                            complaint={complaint}
                            showProfile={true}
                            showUpvote={true}
                            handleUpvote={handleUpvote}
                            upvotedComplaints={upvotedComplaints}
                            showActions={false}
                            showBadges={false}
                          />
                        </motion.div>
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
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(
              filteredComplaints.length / complaintsPerPage
            )}
            onPageChange={onPageChange}
            className="mt-5 self-center"
            showIcons
            theme={customThemePagination}
            onPageChange={handlePageChange}
          />
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Home;
