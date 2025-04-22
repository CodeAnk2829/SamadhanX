import {
  Badge,
  Button,
  Card,
  Modal,
  Spinner,
  TextInput,
  Toast,
  Tooltip,
} from "flowbite-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import statusColors from "../utils/statusColors";
import Lightbox from "yet-another-react-lightbox";
import Inline from "yet-another-react-lightbox/plugins/inline";
import moment from "moment";
import { customThemeTi } from "../utils/flowbiteCustomThemes";

function InchargeComplaintPage() {
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [slides, setSlides] = useState<{ src: string }[]>([]);
  const [toastMessage, setToastMessage] = useState<string|null>(null);
  const [resolvers, setResolvers] = useState([]);
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [selectedResolver, setSelectedResolver] = useState<any>(null);
  const [filteredResolvers, setFilteredResolvers] = useState([]);
  const [loadingResolvers, setLoadingResolvers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const id = useParams().complaintId;

  const createdAtDisplay = moment(complaint && complaint.createdAt)
    
    .format("dddd, Do MMMM YYYY, h:mm A");

  useEffect(() => {
    fetchComplaint();
    fetchResolvers();
  }, []);

  //TODO: Websockets for compalaint updates, escalation, resolved (on complaint update add edited tag)

  const fetchComplaint = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/incharge/get/complaint/${id}`);
      const data = await res.json();
      if (!res.ok && !data.ok) {
        throw new Error(data.error || "Failed to fetch complaint.");
      }
      setComplaint(data);
      if (data.attachments.length > 0) {
        setSlides(
          data.attachments.map((attachment) => ({ src: attachment.imageUrl }))
        );
      }
    } catch (error) {
      console.error("Error fetching complaint:", error);
      setToastMessage("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: any) => {
    try {
      const res = await fetch("/api/v1/incharge/mark/resolved", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ complaintId: id }),
      });
      const data = await res.json();
      if (data.ok) {
        setToastMessage("Complaint resolved successfully.");
        navigate("/incharge/complaints");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setToastMessage("An unexpected error occurred.");
      console.error(error.message);
    }
  };

  const fetchResolvers = async () => {
    setLoadingResolvers(true);
    try {
      const res = await fetch("/api/v1/incharge/get/resolvers");
      const data = await res.json();
      if (data.ok) {
        setResolvers(data.resolversDetails);
      }
    } catch (error) {
      console.error("Error fetching resolvers:", error);
      setToastMessage("An unexpected error occurred.");
    } finally {
      setLoadingResolvers(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase(); // Convert the input to lowercase for case-insensitive search
    setSearchQuery(query); // Update the searchQuery state

    // Filter resolvers by name or occupation matching the search query
    const filtered = resolvers.filter(
      (resolver) =>
        resolver.name.toLowerCase().includes(query) ||
        resolver.occupation.toLowerCase().includes(query)
    );

    setFilteredResolvers(filtered); // Update the filteredResolvers state with the matching results
  };

  const handleDelegate = async () => {
    if (!selectedResolver) {
      setToastMessage("Please select a resolver to delegate.");
      return;
    }
    try {
      const res = await fetch("/api/v1/incharge/delegate", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          complaintId: complaint.id,
          resolverId: selectedResolver.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setToastMessage("Complaint delegated successfully.");
        setDelegateModalOpen(false);
        setSelectedResolver(null);
        navigate("/incharge/complaints");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setToastMessage("An unexpected error occurred.");
    }
  };

  const handleCloseModal = () => {
    setDelegateModalOpen(false);
    setSelectedResolver(null);
    setSearchQuery("");
    setFilteredResolvers(resolvers);
  };

  //TODO: Handle for next incharge not found 
  const handleEscalate = async (id: any) => {
    try {
      const res = await fetch("/api/v1/incharge/escalate", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ complaintId: id }),
      });
      const data = await res.json();
      if (data.ok) {
        setToastMessage("Complaint escalated successfully.");
        navigate("/incharge/complaints");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setToastMessage("An unexpected error occurred.");
      console.error(error.message);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="xl" className="fill-[rgb(60,79,131)]" />
      </div>
    );
  return (
    <main className="p-3 flex flex-col max-w-6xl mx-auto min-h-screen">
      <h1 className="text-3xl mt-10 p-3 text-center font-serif max-w-2xl mx-auto lg:text-4xl">
        {complaint && complaint.title}
      </h1>
      <div className="mt-5 flex flex-wrap gap-2 self-center">
        {complaint &&
          complaint.tags.length > 0 &&
          complaint.tags.map((tag: string, index: number) => (
            <Badge key={index} color="info">
              {tag}
            </Badge>
          ))}
      </div>
      <div className="mt-4 flex self-center">
        <Badge color="purple">{complaint && complaint.location}</Badge>
      </div>
      <div className="mt-4 flex gap-4 self-center">
        <Badge color={statusColors[complaint && complaint.status]}>
          {complaint && complaint.status}
        </Badge>
      </div>
      {complaint &&
        complaint.attachments &&
        complaint.attachments.length > 0 && (
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
          </div>
        )}
      <div className="mt-4 flex gap-4 self-center border-b border-slate-500">
        <p>
          <strong>Created by:</strong> {complaint && complaint.complainerName}
        </p>
        <p>
          <strong>Created:</strong> {complaint && createdAtDisplay}
        </p>
        <p className="flex">
          <span className="ml-2 text-gray-600 text-sm">
            {complaint && complaint.upvotes} upvotes
          </span>
        </p>
      </div>
      <div
        className="p-3 max-w-2xl mx-auto w-full"
        dangerouslySetInnerHTML={{ __html: complaint && complaint.description }}
      ></div>
      {complaint && (
        <div className="flex items-center gap-2 self-center mt-5">
          <Tooltip
            content={
              complaint &&
              complaint.status !== "DELEGATED" &&
              complaint.status !== "ASSIGNED" &&
              complaint.status !== "RECREATED"
                ? `cannot perform action as status is ${complaint.status}`
                : "resolve the complaint"
            }
            arrow={false}
          >
            <Button
              color="blue"
              onClick={() => handleResolve(complaint.id)}
              disabled={
                complaint.status !== "DELEGATED" &&
                complaint.status !== "ASSIGNED" &&
                complaint.status !== "RECREATED"
              }
            >
              Resolve
            </Button>
          </Tooltip>

          <Tooltip
            content={
              complaint &&
              complaint.status !== "DELEGATED" &&
              complaint.status !== "ASSIGNED" &&
              complaint.status !== "RECREATED"
                ? `cannot perform action as status is ${complaint.status}`
                : "delegate to a resolver"
            }
            arrow={false}
          >
            <Button
              color="light"
              onClick={() => {
                setDelegateModalOpen(true);
              }}
              disabled={
                complaint.status !== "DELEGATED" &&
                complaint.status !== "ASSIGNED" &&
                complaint.status !== "RECREATED"
              }
            >
              Delegate
            </Button>
          </Tooltip>

          <Tooltip
            content={
              complaint &&
              complaint.status !== "DELEGATED" &&
              complaint.status !== "ASSIGNED" &&
              complaint.status !== "RECREATED"
                ? `cannot perform action as status is ${complaint.status}`
                : "escalate to higher authorities"
            }
            arrow={false}
          >
            <Button
              color="purple"
              onClick={() => handleEscalate(complaint.id)} //may change
              disabled={
                complaint.status !== "DELEGATED" &&
                complaint.status !== "ASSIGNED" &&
                complaint.status !== "RECREATED"
              }
            >
              Escalate
            </Button>
          </Tooltip>
        </div>
      )}

      {/* Delegate Modal */}
      <Modal show={delegateModalOpen} onClose={handleCloseModal}>
        <Modal.Header>Delegate Complaint</Modal.Header>
        <Modal.Body>
          <TextInput
            type="text"
            placeholder="Search by name or occupation"
            value={searchQuery}
            onChange={handleSearchChange}
            className="mb-4"
            theme={customThemeTi}
          />
          <div className="space-y-4">
            {filteredResolvers &&
              filteredResolvers.length > 0 &&
              filteredResolvers.map((resolver) => (
                <Card
                  key={resolver.id}
                  className={`cursor-pointer border ${
                    selectedResolver?.id === resolver.id
                      ? "bg-sky-200"
                      : "border-gray-300"
                  }`}
                  onClick={() => setSelectedResolver(resolver)}
                >
                  <h5 className="text-lg font-semibold">{resolver.name}</h5>
                  <p className="text-sm text-gray-600">
                    Occupation: {resolver.occupation}
                  </p>
                  {resolver && resolver.phoneNumber && (
                    <p className="text-sm text-gray-600">
                      Phone: {resolver.phoneNumber}
                    </p>
                  )}
                  {resolver && resolver.email && (
                    <p className="text-sm text-gray-600">
                      Email: {resolver.email}
                    </p>
                  )}
                </Card>
              ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={handleDelegate}
            gradientDuoTone="purpleToBlue"
            outline
          >
            Delegate
          </Button>
          <Button
            color="gray"
            onClick={handleCloseModal}
            className="hover: text-[rgb(61,79,131)]"
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {toastMessage && (
        <div className="fixed top-4 right-5 z-50">
          <Toast className="bg-blue-500 text-white">
            {toastMessage}
            <Toast.Toggle onDismiss={() => setToastMessage(null)} />
          </Toast>
        </div>
      )}
    </main>
  );
}

export default InchargeComplaintPage;
