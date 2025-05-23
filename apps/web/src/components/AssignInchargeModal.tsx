import { Alert, Button, Label, Modal, Select, Spinner, TextInput, Toast } from "flowbite-react";
import { useEffect, useState } from "react";
import { HiCheck } from "react-icons/hi";
import { customThemeSelect, customThemeTi } from "../utils/flowbiteCustomThemes";

function AssignInchargeModal({ showModal, setShowModal, refreshIncharges, setToastMessage }) {
  const [error, setError] = useState<String|null>(null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [locations, setLocations] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [selectedTag, setSelectedTag] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedDesignation, setSelectedDesignation] = useState("");

  const [inchargeDetails, setInchargeDetails] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleTagChange = (event) => {
    const tagId = event.target.value;
    setSelectedTag(tagId);
    fetchTagDetails(tagId);
    setSelectedLocation("");
    setSelectedDesignation("");
  };

  const handleLocationChange = (event) => {
    setSelectedLocation(event.target.value);
  };

  const handleDesignationChange = (event) => {
    setSelectedDesignation(event.target.value);
  };

  useEffect(() =>{
    fetchTags();
  }, []);

  const fetchTags = async () =>{
    try {
        const res = await fetch('/api/v1/admin/get/tags');
        const data = await res.json();
        if(data.ok){
            setTags(data.tags);
        }
    } catch (error) {
        setError("Failed to fetch tags");
    }
  }

  const fetchTagDetails = async(tagId) =>{
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/get/tag-details/${tagId}`);
      const data = await res.json();
      if (data.ok) {
        setLocations(data.locationDetails);
        setDesignations(data.designationDetails);
      }
    } catch {
      setError("Failed to fetch locations and designations.");
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async () => {
    if(!inchargeDetails.name || !inchargeDetails.email || !inchargeDetails.phone){
        setError("All fields are mandatory!");
        return;
    }
    if (!selectedTag || !selectedLocation || !selectedDesignation) {
      setError("All fields are required!");
      return;
    }

    if(inchargeDetails.name.length < 3){
        setError("The name should be atleast 3 characters.");
    }

    const payload = {
      name: inchargeDetails.name,
      email: inchargeDetails.email,
      phoneNumber: inchargeDetails.phone,
      locationId: Number(selectedLocation),
      designationTagId: Number(selectedDesignation),
      role: "ISSUE_INCHARGE"
    };

    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/assign/incharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        setToastMessage("Issue Incharge assigned successfully!");
        setInchargeDetails({ name: "", email: "", phone: "" });
        setSelectedTag("");
        setSelectedLocation("");
        setSelectedDesignation("");
        setShowModal(false);
        refreshIncharges(); 
      } else {
        setError(data.error || "Failed to assign incharge.");
      }
    } catch {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={showModal} onClose={() => {
        setShowModal(false);
        setInchargeDetails({ name: "", email: "", phone: "" });
        setSelectedTag("");
        setSelectedLocation("");
        setSelectedDesignation("");
        }}>
      <Modal.Header>Add Issue Incharge</Modal.Header>
      <Modal.Body>
        {error && <Alert color="failure">{error}</Alert>}

        {/* Name, Email, Phone Fields */}
        <Label>Name: </Label>
        <TextInput
          className="mb-4 mt-2"
          placeholder="Name"
          value={inchargeDetails.name}
          theme={customThemeTi}
          onChange={(e) =>
            setInchargeDetails({ ...inchargeDetails, name: e.target.value })
          }
        />

        <Label>Email: </Label>
        <TextInput
          className="mb-4 mt-2"
          placeholder="Email"
          theme={customThemeTi}
          value={inchargeDetails.email}
          onChange={(e) =>
            setInchargeDetails({ ...inchargeDetails, email: e.target.value })
          }
        />

        <Label>Phone: </Label>
        <TextInput
          className="mb-4 mt-2"
          placeholder="Phone"
          theme={customThemeTi}
          value={inchargeDetails.phone}
          onChange={(e) =>
            setInchargeDetails({ ...inchargeDetails, phone: e.target.value })
          }
        />

        {/* Tag Selection */}
        <Select className="mb-4" value={selectedTag} onChange={handleTagChange} theme={customThemeSelect}>
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

        {/* Designation Selection */}
        <Select
          className="mb-4"
          value={selectedDesignation}
          onChange={handleDesignationChange}
          disabled={!selectedLocation}
          theme={customThemeSelect}
        >
          <option value="">Select Designation</option>
          {designations.map((des) => (
            <option key={des.id} value={des.id}>
              {des.designation}
            </option>
          ))}
        </Select>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={loading}
          gradientDuoTone="purpleToBlue"
        >
          {loading ? <Spinner size="sm" className="mr-2" /> : "Assign Incharge"}
        </Button>
      </Modal.Body>
    </Modal>
  );
}

export default AssignInchargeModal;
