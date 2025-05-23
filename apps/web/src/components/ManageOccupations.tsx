import {
  Alert,
  Badge,
  Button,
  Label,
  Select,
  Spinner,
  Table,
  TextInput,
  Toast,
} from "flowbite-react";
import React, { useEffect, useState } from "react";
import { GrCircleAlert } from "react-icons/gr";
import { HiCheck } from "react-icons/hi";
import {
  customThemeSelect,
  customThemeTi,
} from "../utils/flowbiteCustomThemes";

function ManageOccupations() {
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [occupations, setOccupations] = useState([]);
  const [newOccupation, setNewOccupation] = useState("");
  const [selectedTags, setSelectedTags] = useState({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editableRow, setEditableRow] = useState(null);

  useEffect(() => {
    fetchTags();
    fetchOccupations();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/get/tags");
      const data = await res.json();
      if (data.ok) setTags(data.tags);
      else setError("Failed to fetch tags.");
    } catch {
      setError("Error fetching tags.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOccupations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/get/occupations");
      const data = await res.json();
      if (data.ok) setOccupations(data.occupationDetails);
      else setError("Failed to fetch occupations.");
      console.log(data.occupationDetails);
    } catch {
      setError("Error fetching occupations.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOccupation = async () => {
    if (!newOccupation.trim()) {
      setError("Occupation name cannot be empty");
      return;
    }

    try {
      const res = await fetch("/api/v1/admin/create/occupations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ occupations: [newOccupation] }),
      });
      const data = await res.json();
      if (data.ok) {
        setToastMessage("Occupation added successfully!");
        fetchOccupations(); // Refresh list
        setNewOccupation("");
      } else {
        setError(data.error || "Failed to add occupation.");
      }
    } catch {
      setError("Error adding occupation.");
    }
  };

  const handleAddTagToOccupation = (occupationId, tagId, tagName) => {
    setSelectedTags((prevTags) => {
      const updatedTags = { ...prevTags };
      if (!updatedTags[occupationId]) {
        updatedTags[occupationId] = [];
      }
      if (!updatedTags[occupationId].some((tag) => tag.id === tagId)) {
        updatedTags[occupationId].push({ id: tagId, name: tagName });
      }
      return updatedTags;
    });
  };

  const handleRemoveTag = (occupationId, tagId) => {
    setSelectedTags((prevTags) => {
      const updatedTags = { ...prevTags };
      updatedTags[occupationId] = updatedTags[occupationId].filter(
        (tag) => tag.id !== tagId
      );
      return updatedTags;
    });
  };

  const handleSaveTags = async (occupationId) => {
    const tagsToSend = selectedTags[occupationId]?.map((tag) => parseInt(tag.id)) || [];

    if (tagsToSend.length === 0) {
      setError("Please select at least one tag.");
      return;
    }

    try {
      const res = await fetch("/api/v1/admin/set/occupations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          occupationId,
          tags: tagsToSend,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setToastMessage("Tags updated successfully!");
        fetchOccupations();
        setEditableRow(null);
      } else {
        setError(data.error || "Failed to update tags.");
      }
    } catch {
      setError("Error updating occupation tags.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4 underline">Manage Occupations</h1>

      {/* Toast Messages */}
      {toastMessage && (
        <Toast>
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-500">
            <HiCheck className="h-5 w-5" />
          </div>
          <div className="ml-3 text-sm font-normal">{toastMessage}</div>
          <button onClick={() => setToastMessage(null)}>✖️</button>
        </Toast>
      )}

      {loading && (
        <div className="flex justify-center items-center h-full">
          <Spinner size="xl" className="fill-[rgb(60,79,131)]" />
        </div>
      )}

      {error && (
        <Alert color="failure" icon={GrCircleAlert}>
          {error}
        </Alert>
      )}

      <h2 className="text-2xl font-semibold mb-2">Create Occupations</h2>
      <Label className="text-md font-medium">New Occupation Name:</Label>
      <div className="flex flex-row gap-4">
        <TextInput
          placeholder="Enter new occupation"
          value={newOccupation}
          onChange={(e) => setNewOccupation(e.target.value)}
          theme={customThemeTi}
          className="mt-1 w-1/5"
        />
        <Button
          className="mt-1"
          gradientDuoTone="purpleToBlue"
          outline
          onClick={handleAddOccupation}
        >
          Add
        </Button>
      </div>

      <div>
        <Table hoverable className="w-full mt-6">
          <Table.Head>
            <Table.HeadCell>Occupation</Table.HeadCell>
            <Table.HeadCell>Tags</Table.HeadCell>
            <Table.HeadCell>Actions</Table.HeadCell>
          </Table.Head>
          <Table.Body>
            {occupations &&
              occupations.length > 0 &&
              occupations.map((occupation) => (
                <Table.Row key={occupation.id}>
                  <Table.Cell>{occupation.occupation}</Table.Cell>
                  <Table.Cell className="">
                    {occupation.tags.length === 0 ?  <div className="flex flex-wrap gap-2">
                      {selectedTags[occupation.id] ? (
                        selectedTags[occupation.id].map((tag) => (
                          <Badge
                            key={tag.id}
                            color="info"
                            onClick={() =>
                              handleRemoveTag(occupation.id, tag.id)
                            }
                          >
                            {tag.name} ✖
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </div> : (<div className="flex flex-wrap gap-2">{occupation.tags.map((tag) => (
                        <Badge key={tag.id} color="info">{tag}</Badge>
                    ))}</div>)}
                  </Table.Cell>
                  <Table.Cell className="flex flex-row gap-4">
                    <Select
                      onChange={(e) =>
                        handleAddTagToOccupation(
                          occupation.id,
                          e.target.value,
                          e.target.selectedOptions[0].text
                        )
                      }
                      theme={customThemeSelect}
                      disabled={occupation.tags.length !== 0}
                    >
                      <option value="">Select a tag</option>
                      {tags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.tagName}
                        </option>
                      ))}
                    </Select>
                    <Button
                      onClick={() => handleSaveTags(occupation.id)}
                      gradientDuoTone="greenToBlue"
                      disabled={occupation.tags.length !== 0}
                    >
                      Save
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
          </Table.Body>
        </Table>
      </div>
    </div>
  );
}

export default ManageOccupations;
