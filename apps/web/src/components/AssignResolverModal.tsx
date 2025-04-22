import { Alert, Button, Label, Modal, Select, Spinner, TextInput } from "flowbite-react";
import React, { useEffect, useState } from "react";
import { customThemeSelect, customThemeTi } from "../utils/flowbiteCustomThemes";

function AssignResolverModal({
  showModal,
  setShowModal,
  refreshResolvers,
  setToastMessage,
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [locations, setLocations] = useState([]);
  const [occupations, setOccupations] = useState([]);

  const [selectedTag, setSelectedTag] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedOccupation, setSelectedOccupation] = useState("");

  const [resolverDetails, setResolverDetails] = useState({
    name: "",
    email: "",
    phoneNumber: "",
  });

  const handleTagChange = (event) => {
    const tagId = event.target.value;
    setSelectedTag(tagId);
    fetchTagDetails(tagId);
    setSelectedLocation("");
    setSelectedOccupation("");
  };

  const handleLocationChange = (event) => {
    setSelectedLocation(event.target.value);
  };

  const handleOccupationChange = (event) => {
    setSelectedOccupation(event.target.value);
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/v1/admin/get/tags");
      const data = await res.json();
      if (data.ok) {
        setTags(data.tags);
      }
    } catch (error) {
      setError("Failed to fetch tags");
    }
  };

  const fetchTagDetails = async (tagId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/get/tag-details/${tagId}`);
      const data = await res.json();
      if (data.ok) {
        setLocations(data.locationDetails);
        setOccupations(data.occupationDetails);
      }
    } catch {
      setError("Failed to fetch locations and designations.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if(!resolverDetails.name || !resolverDetails.email || !resolverDetails.phoneNumber){
        setError("All fields are mandatory!");
        return;
    }
    if (!selectedTag || !selectedLocation || !selectedOccupation) {
      setError("All fields are required!");
      return;
    }

    if(resolverDetails.name.length < 3){
        setError("The name should be atleast 3 characters.");
        return;
    }

    const payload = {
      name: resolverDetails.name,
      email: resolverDetails.email,
      phoneNumber: resolverDetails.phoneNumber,
      locationId: Number(selectedLocation),
      occupationId: Number(selectedOccupation),
      role: "RESOLVER"
    };
    console.log(payload);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/assign/resolver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        setToastMessage("Resolver assigned successfully!");
        setResolverDetails({ name: "", email: "", phoneNumber: "" });
        setSelectedTag("");
        setSelectedLocation("");
        setSelectedOccupation("");
        setShowModal(false);
        refreshResolvers(); 
      } else {
        setError(data.error || "Failed to assign resolver.");
      }
    } catch {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      show={showModal}
      onClose={() => {
        setShowModal(false);
        setResolverDetails({ name: "", email: "", phoneNumber: "" });
        setSelectedTag("");
        setSelectedLocation("");
        setSelectedOccupation("");
      }}
    >
      <Modal.Header>Add a new resolver</Modal.Header>
      <Modal.Body>
        {error && <Alert color="failure">{error}</Alert>}

        {/* Name, Email, Phone Fields */}
        <Label>Name: </Label>
        <TextInput
          className="mb-4 mt-2"
          placeholder="Name"
          value={resolverDetails.name}
          theme={customThemeTi}
          onChange={(e) =>
            setResolverDetails({ ...resolverDetails, name: e.target.value })
          }
        />

        <Label>Email: </Label>
        <TextInput
          className="mb-4 mt-2"
          placeholder="Email"
          theme={customThemeTi}
          value={resolverDetails.email}
          onChange={(e) =>
            setResolverDetails({ ...resolverDetails, email: e.target.value })
          }
        />

        <Label>Phone: </Label>
        <TextInput
          className="mb-4 mt-2"
          placeholder="Phone"
          theme={customThemeTi}
          value={resolverDetails.phoneNumber}
          onChange={(e) =>
            setResolverDetails({ ...resolverDetails, phoneNumber: e.target.value })
          }
        />

        {/* Tag Selection */}
        <Select
          className="mb-4"
          value={selectedTag}
          onChange={handleTagChange}
          theme={customThemeSelect}
        >
          <option value="">Select Tag</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.tagName}
            </option>
          ))}
        </Select>

        {/* Location Selection */}
        <Select
          className="mb-4"
          value={selectedLocation}
          onChange={handleLocationChange}
          disabled={!selectedTag}
          theme={customThemeSelect}
        >
          <option value="">Select Location</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.locationName}
            </option>
          ))}
        </Select>

        {/* Occupation Selection */}
        <Select
          className="mb-4"
          value={selectedOccupation}
          onChange={handleOccupationChange}
          disabled={!selectedLocation}
          theme={customThemeSelect}
        >
          <option value="">Select Occupation</option>
          {occupations.map((des) => (
            <option key={des.id} value={des.id}>
              {des.occupation}
            </option>
          ))}
        </Select>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={loading}
          gradientDuoTone="purpleToBlue"
        >
          {loading ? <Spinner size="sm" className="mr-2" /> : "Assign resolver"}
        </Button>
      </Modal.Body>
    </Modal>
  );
}

export default AssignResolverModal;
