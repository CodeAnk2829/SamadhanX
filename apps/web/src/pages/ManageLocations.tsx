import React, { useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import {
  Alert,
  Button,
  Card,
  Dropdown,
  Label,
  Modal,
  Select,
  Spinner,
  Table,
  TextInput,
  Toast,
} from "flowbite-react";
import { GrCircleAlert } from "react-icons/gr";
import { HiCheck } from "react-icons/hi";
import { RxHamburgerMenu } from "react-icons/rx";
import {
  customThemeDropdown,
  customThemeSelect,
  customThemeTi,
} from "../utils/flowbiteCustomThemes";
import { useNavigate } from "react-router-dom";
import { FaRegTrashAlt } from "react-icons/fa";

function ManageLocations() {
  const [locations, setLocations] = useState([]);
  const [tags, setTags] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [locationToDelete, setLocationToDelete] = useState(null);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newLocation, setNewLocation] = useState({
    tagId: 0,
    locationCategory: "",
    locationName: "",
    locationBlock: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchTags();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/get/locations");
      const data = await res.json();
      if (data.ok) {
        const formattedLocations = data.locations.map((loc) => {
          const [category, name, block] = loc.locationName.split("-");
          return { ...loc, category, name, block };
        });
        setLocations(formattedLocations);
      }
    } catch (error) {
      setError("Failed to fetch locations");
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/get/tags");
      const data = await res.json();
      if (data.ok) {
        setTags(data.tags);
      }
    } catch (error) {
      setError("cannot fetch tags");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async () => {
    const locationNameToSend = `${newLocation.locationCategory}${
      newLocation.locationName ? `-${newLocation.locationName}` : ""
    }${newLocation.locationBlock ? `-${newLocation.locationBlock}` : ""}`;
    const dataToSend = {
      tagId: Number(newLocation.tagId),
      locationName: locationNameToSend,
    };
    console.log(dataToSend);
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/admin/set/location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });
      const data = await res.json();
      if (data.ok) {
        setNewLocation({
          tagId: 0,
          locationCategory: "",
          locationName: "",
          locationBlock: "",
        });
        setShowAddLocationModal(false);
        const newLocation = data.location;
        const formattedLocation = {
          ...newLocation,
          category: newLocation.locationName.split("-")[0],
          name: newLocation.locationName.split("-")[1],
          block: newLocation.locationName.split("-")[2],
        };
        setLocations([...locations, formattedLocation]);
        setToastMessage("New Location added successfully :)");
      } else {
        console.error("Error:", data.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLocation = async () => {
    const dataToSend = { locations: [locationToDelete] };
    try {
      const res = await fetch("/api/v1/admin/remove/locations", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });
      const data = await res.json();
      if (data.ok) {
        setShowModal(false);
        setLocations(
          locations.filter((location) => location.id !== locationToDelete)
        );
        setToastMessage("Location deleted successfully :)");
        setLocationToDelete(null);
      } else {
        setError(data.error || "Failed to delete location.");
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      setError("An error occurred while deleting the location.");
    }
  };


  //TODO: Handle view complaints, view locations, view resolvers at a location
  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4">
        <AdminSidebar />
      </div>

      {/* Main Section */}
      <div className="w-full md:w-3/4 flex flex-col px-6 py-4">
        {/* Toast */}
        {toastMessage && (
          <div className="absolute top-5 left-1/2 transform -translate-x-1/2">
            <Toast>
              <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-500">
                <HiCheck className="h-5 w-5" />
              </div>
              <div className="ml-3 text-sm font-normal">{toastMessage}</div>
              <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 text-gray-400 hover:text-gray-900 focus:ring-2 focus:ring-gray-300"
                onClick={() => setToastMessage(null)}
              >
                ✖️
              </button>
            </Toast>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert color="failure" icon={GrCircleAlert}>
            <span className="font-medium">{error}</span>
          </Alert>
        )}

        {loading && (
          <div className="flex justify-center items-center mb-4">
            <Spinner
              size="xl"
              aria-label="Loading..."
              className="fill-[rgb(60,79,131)]"
            />
          </div>
        )}

        {/* Header */}
        <h1 className="text-2xl font-bold mb-4">Manage Locations</h1>

        {/* Add new locations */}
        <Button
          gradientDuoTone="purpleToBlue"
          onClick={() => setShowAddLocationModal(true)}
          className="w-1/5 mb-8"
        >
          Add a new location
        </Button>

        {/* Location Cards */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-6 w-3/5 self-center">
            {locations &&
              locations.map((loc, index) => (
                <Card
                  key={index}
                  className="flex justify-between gap-8 p-4 shadow-lg relative"
                >
                  <div className="flex-1">
                    <h5 className="text-2xl font-bold text-gray-900">
                      {loc.locationName}
                    </h5>
                    <p className="text-gray-700">
                      Category: {loc.category || "-"}
                    </p>
                    <p className="text-gray-700">Name: {loc.name || "-"}</p>
                    <p className="text-gray-700">Block: {loc.block || "-"}</p>
                  </div>
                  <div className="flex-1 absolute top-6 right-6">
                    <Dropdown
                      label={<RxHamburgerMenu size={18} />}
                      theme={customThemeDropdown}
                      arrowIcon={false}
                    >
                      <Dropdown.Item
                        // onClick={() => handleView("incharges", loc.id)}
                      >
                        View Incharges
                      </Dropdown.Item>
                      <Dropdown.Item
                        // onClick={() => handleView("resolvers", loc.id)}
                      >
                        View Resolvers
                      </Dropdown.Item>
                      <Dropdown.Item
                        // onClick={() => handleView("complaints", loc.id)}
                      >
                        View Complaints
                      </Dropdown.Item>
                    </Dropdown>
                  </div>
                  <div className="flex-1 absolute bottom-6 right-6">
                    <Button
                      color="failure"
                      onClick={() => {
                        setLocationToDelete(loc.id);
                        setShowModal(true);
                      }}
                    >
                      <FaRegTrashAlt />
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      </div>
      {/* Add new location modal */}
      <Modal
        show={showAddLocationModal}
        onClose={() => {
          setShowAddLocationModal(false);
          setNewLocation({
            tagId: 0,
            locationCategory: "",
            locationName: "",
            locationBlock: "",
          });
        }}
      >
        <Modal.Header>Add a new location</Modal.Header>
        <Modal.Body>
          <Label>Tag</Label>
          <Select
            value={newLocation.tagId}
            onChange={(e) =>
              setNewLocation({ ...newLocation, tagId: e.target.value })
            }
            theme={customThemeSelect}
          >
            <option value="">Select a Tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.tagName}
              </option>
            ))}
          </Select>
          <Label>Location Category</Label>
          <TextInput
            value={newLocation.locationCategory}
            onChange={(e) =>
              setNewLocation({
                ...newLocation,
                locationCategory: e.target.value,
              })
            }
            placeholder="Location category"
            theme={customThemeTi}
          />
          <Label>Location Name</Label>
          <TextInput
            value={newLocation.locationName}
            onChange={(e) =>
              setNewLocation({ ...newLocation, locationName: e.target.value })
            }
            placeholder="Location name"
            theme={customThemeTi}
          />
          <Label>Location Block</Label>
          <TextInput
            value={newLocation.locationBlock}
            onChange={(e) =>
              setNewLocation({ ...newLocation, locationBlock: e.target.value })
            }
            placeholder="Location block"
            theme={customThemeTi}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={handleAddLocation}
            gradientDuoTone="purpleToBlue"
            outline
            disabled={submitting}
          >
            Add
          </Button>
          <Button color="gray" onClick={() => setShowAddLocationModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Modal */}
      <Modal
        show={showModal}
        onClose={() => {
          setShowModal(false);
          setLocationToDelete(null);
        }}
      >
        <Modal.Header>Confirm Deletion</Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this location?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button color="failure" onClick={handleDeleteLocation}>
            Delete
          </Button>
          <Button color="gray" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ManageLocations;
