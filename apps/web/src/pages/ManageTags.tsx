import React, { useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import {
  Alert,
  Badge,
  Button,
  Modal,
  Spinner,
  Table,
  TextInput,
  Toast,
} from "flowbite-react";
import { HiCheck } from "react-icons/hi";
import { GrCircleAlert } from "react-icons/gr";
import { customThemeTi } from "../utils/flowbiteCustomThemes";
import { IoSearch } from "react-icons/io5";
import { BsPlus } from "react-icons/bs";
import { motion } from "framer-motion";
import { IoMdClose } from "react-icons/io";

type Tag = {
  id: number;
  tagName: string;
};
function ManageTags() {
  const [tags, setTags] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddTagInput, setShowAddTagInput] = useState(false);
  const [tagDetails, setTagDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => {
      setError(null);
    }, 3000); // Disappear after 3 seconds
  };

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/admin/get/tags");
        if (!res.ok) {
          showError("Failed to fetch tags.");
        }
        const data = await res.json();
        setTags(data.tags);
      } catch (error) {
        showError("An error occurred while fetching tags. ", error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  const fetchTagDetails = async (tagId) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/v1/admin/get/tag-details/${tagId}`);
      const data = await res.json();
      console.log(data);
      if (data.ok) {
        setTagDetails(data);
      } else {
        console.error("Failed to fetch tag details:", data.error);
      }
    } catch (error) {
      console.error("Error fetching tag details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) {
      showError("Tag cannot be empty");
      return;
    }

    if (
      tags.some(
        (tag) => tag.tagName.toLowerCase() === newTag.trim().toLowerCase()
      )
    ) {
      showError("Tag already exists.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/create/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags: [newTag.trim()] }),
      });
      const data = await res.json();
      if (data.ok) {
        const updatedRes = await fetch("/api/v1/admin/get/tags");
        const updatedData = await updatedRes.json();
        if (updatedData.ok) {
          setTags(updatedData.tags); // Update state with the full tag list
          setNewTag("");
          setToastMessage("Tag added successfully!");
        } else {
          showError("Failed to add the tag");
        }
      }
    } catch (error) {
      showError("An error occured while creating a new tag. ", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagToDelete) => {
    console.log("tag to delete is : ", tagToDelete);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/remove/tags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: [tagToDelete] }), // Send tag name(s) as an array
      });

      const data = await res.json();
      console.log("ON tag delete: ", data);
      if (data.ok) {
        // Remove the deleted tag from the state
        setTags(tags.filter((tag) => tag.id !== tagToDelete));
        setToastMessage("Tag deleted successfully!");
        setShowModal(false);
      } else {
        showError(data.error || "Failed to delete the tag.");
      }
    } catch (err) {
      showError("An error occurred while deleting the tag.");
    } finally {
      setLoading(false); // Stop loading spinner
    }
  };

  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4">
        <AdminSidebar />
      </div>

      {/* Main Section */}
      <div className="w-full md:w-3/4 flex flex-col px-6 py-4">
        {toastMessage && (
          <div className="absolute top-5 left-1/2">
            <Toast>
              <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-500">
                <HiCheck className="h-5 w-5" />
              </div>
              <div className="ml-3 text-sm font-normal">{toastMessage}</div>
              <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 text-gray-400 hover:text-gray-900 focus:ring-2 focus:ring-gray-300"
                aria-label="Close"
                onClick={() => setToastMessage(null)}
              >
                ✖️
              </button>
            </Toast>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner size="xl" className="fill-[rgb(60,79,131)]" />
          </div>
        ) : (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Manage Tags</h1>
            {error && (
              <Alert color="failure" icon={GrCircleAlert}>
                <span className="font-medium">{error}</span>
              </Alert>
            )}
            <TextInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags"
              rightIcon={IoSearch}
              theme={customThemeTi}
              className="w-1/5 p-4"
            />
            <div className="mb-6 flex gap-4 items-center p-4">
              <motion.div animate={{ rotate: showAddTagInput ? 180 : 0 }}>
                <Button
                  onClick={() => setShowAddTagInput(!showAddTagInput)}
                  gradientMonochrome="purple"
                >
                  {showAddTagInput ? (
                    <IoMdClose size={20} />
                  ) : (
                    <BsPlus size={20} />
                  )}
                </Button>
              </motion.div>
              {showAddTagInput && (
                <>
                  <TextInput
                    id="new-tag"
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Enter new tag"
                    theme={customThemeTi}
                  />
                  <Button
                    onClick={handleAddTag}
                    disabled={loading || !newTag.trim()}
                    gradientDuoTone="purpleToBlue"
                  >
                    Add Tag
                  </Button>
                </>
              )}
            </div>
            <div className="">
              <Table hoverable className="w-1/2">
                <Table.Head>
                  <Table.HeadCell>Tag Name</Table.HeadCell>
                  <Table.HeadCell>Actions</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                  {tags &&
                    searchQuery === "" &&
                    tags.length > 0 &&
                    tags.map((tag) => (
                      <Table.Row key={tag.id}>
                        <Table.Cell>{tag.tagName}</Table.Cell>
                        <Table.Cell className="flex flex-row gap-4 self-center justify-start">
                          <Button
                            color="failure"
                            onClick={() => {
                              setTagToDelete(tag);
                              setShowModal(true);
                            }}
                            disabled={loading}
                          >
                            Delete
                          </Button>
                          <Button
                            className="bg-[rgb(60,79,131)]"
                            onClick={() => {
                              fetchTagDetails(tag.id);
                              setShowDetailsModal(true);
                            }}
                          >
                            View Details
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  {tags &&
                  searchQuery !== "" &&
                  tags.filter((tag) =>
                    tag.tagName
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                  ).length > 0 ? (
                    tags
                      .filter((tag) =>
                        tag.tagName
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())
                      )
                      .map((tag) => (
                        <Table.Row key={tag.id}>
                          <Table.Cell>{tag.tagName}</Table.Cell>
                          <Table.Cell>
                            <Button
                              color="failure"
                              onClick={() => {
                                setTagToDelete(tag.id);
                                setShowModal(true);
                              }}
                            >
                              Delete
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      ))
                  ) : (
                    <div className="p-4">No such tags found</div>
                  )}
                </Table.Body>
              </Table>
            </div>
          </div>
        )}
        {/* Modal */}
        <Modal show={showModal} onClose={() => setShowModal(false)}>
          <Modal.Header>Confirm Deletion</Modal.Header>
          <Modal.Body>
            <p>
              Are you sure you want to delete the tag{" "}
              <strong>{tagToDelete && tagToDelete.tagName}</strong>?
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => {
                if (tagToDelete) handleDeleteTag(tagToDelete.id);
              }}
              color="failure"
            >
              Delete
            </Button>
            <Button color="gray" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setTagDetails(null);
          }}
          size="2xl"
        >
          <Modal.Header>Tag Details</Modal.Header>
          <Modal.Body>
            {loadingDetails ? (
              <Spinner size="lg" className="fill-[rgb(60,79,131)]"/>
            ) : tagDetails ? (
              <>
                <h3 className="font-semibold">Locations:</h3>
                <div className="flex flex-row gap-3">
                  {tagDetails.locationDetails && tagDetails.locationDetails.length > 0 ? tagDetails.locationDetails.map((loc) => (
                    <Badge key={loc.id} color="warning">{loc.locationName}</Badge>
                  )) : (<Badge color="warning">N/A</Badge>)}
                </div>
                <h3 className="font-semibold mt-2">Designations:</h3>
                <div className="flex flex-row gap-3">
                  {tagDetails.designationDetails && tagDetails.designationDetails.length > 0 ? tagDetails.designationDetails.map((des) => (
                    <Badge key={des.id}>{des.designation}</Badge>
                  )) : (<Badge>N/A</Badge>)}
                </div>
                <h3 className="font-semibold mt-2">Occupations:</h3>
                <div className="flex flex-row gap-3">
                  {tagDetails.occupationDetails && tagDetails.occupationDetails.length > 0 ? tagDetails.occupationDetails.map((occ) => (
                    <Badge key={occ.id} color="purple">{occ.occupation}</Badge>
                  )) : (<Badge color="purple" >N/A</Badge>)}
                </div>
              </>
            ) : (
              <p>No details available.</p>
            )}
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
}

export default ManageTags;
