import {
  Alert,
  Button,
  HR,
  Label,
  Select,
  Spinner,
  Table,
  TextInput,
  Toast,
  Tooltip,
} from "flowbite-react";
import React, { useEffect, useState } from "react";
import { GrCircleAlert } from "react-icons/gr";
import { HiCheck } from "react-icons/hi";
import { customThemeSelect, customThemeTi } from "../utils/flowbiteCustomThemes";

function ManageDesignations() {
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [newDesignation, setNewDesignation] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editableRow, setEditableRow] = useState<number | null>();
  const [selectedTag, setSelectedTag] = useState("");
  const [rank, setRank] = useState("");

  useEffect(() => {
    fetchTags();
    fetchDesignations();
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

  const fetchDesignations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/get/designations");
      const data = await res.json();
      if (data.ok) setDesignations(data.designationDetails);
      else setError("Failed to fetch designations.");
    } catch {
      setError("Error fetching designations.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDesignation = async () => {
    if (!newDesignation.trim()) {
      setError("Designation name cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/create/designations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designations: [newDesignation.trim()] }),
      });

      const data = await res.json();
      if (data.ok) {
        setNewDesignation("");
        fetchDesignations();
        setToastMessage("Designation created successfully!");
      } else {
        setError(data.error);
      }
    } catch {
      setError("Error creating designation.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDesignation = async (designationId) => {
    if (!selectedTag) {
      setError("Please select a tag");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/set/designation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designationId, tagId: parseInt(selectedTag)}),
      });

      const data = await res.json();
      if (data.ok) {
        fetchDesignations();
        setToastMessage(`Designation set successfully!`);
        setEditableRow(null);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Error setting designation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4 underline">Manage Designations</h1>

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

      <h2 className="text-2xl font-semibold mb-2">Create Designations</h2>
      <Label className="text-md font-medium">Add New Designation Name:</Label>
      <div className="flex flex-row gap-4">
        <TextInput
          placeholder="Enter new designation"
          value={newDesignation}
          onChange={(e) => setNewDesignation(e.target.value)}
          theme={customThemeTi}
          className="mt-1 w-1/5"
        />
        <Button
          className="mt-1"
          gradientDuoTone="purpleToBlue"
          outline
          onClick={handleCreateDesignation}
        >
          Add
        </Button>
      </div>
      <HR />
      {/* <h2 className="text-2xl font-semibold mb-2">Set Designations</h2>
      <HR /> */}
      <div>
        <h2 className="font-bold text-md mb-2 italic">NOTE: Set the tag for the highest level designation first & then the next highest (rank is assigned from 1 onwards)</h2>
        <Table hoverable className="w-3/4">
          <Table.Head>
            <Table.HeadCell>Designation</Table.HeadCell>
            <Table.HeadCell>Tag</Table.HeadCell>
            <Table.HeadCell>Rank</Table.HeadCell>
            <Table.HeadCell>Actions</Table.HeadCell>
          </Table.Head>
          <Table.Body>
            {designations &&
              designations.length > 0 &&
              designations.map((designation) => (
                <Table.Row key={designation.id}>
                  <Table.Cell>{designation.designation}</Table.Cell>
                  <Table.Cell className="w-10">
                    {editableRow === designation.id ? (
                      <Select
                        value={selectedTag}
                        onChange={(e) => setSelectedTag(e.target.value)}
                        className="w-40"
                        theme={customThemeSelect}
                      >
                        <option value="">Select a Tag</option>
                        {tags.map((tag) => (
                          <option key={tag.id} value={tag.id}>
                            {tag.tagName}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      designation.tag || "-"
                    )}
                  </Table.Cell>

                  <Table.Cell>
                    {designation.rank || '-'}
                  </Table.Cell>

                  <Table.Cell>
                    {editableRow === designation.id ? (
                      <div className="flex gap-2">
                        <Button
                          gradientDuoTone="greenToBlue"
                          onClick={() => handleSetDesignation(designation.id)}
                        >
                          Save
                        </Button>
                        <Button
                          color="gray"
                          onClick={() => setEditableRow(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Tooltip
                        content={
                          designation.tag && designation.rank
                            ? "Designation has an associated tag and rank"
                            : "Set tag and rank for this designation"
                        }
                        arrow={false}
                        trigger="hover"
                      >
                        <Button
                          disabled={!!designation.tag && !!designation.rank}
                          gradientDuoTone="purpleToBlue"
                          onClick={() => {
                            setEditableRow(designation.id);
                            setSelectedTag(designation.tag || "");
                            setRank(designation.rank || "");
                          }}
                        >
                          Set Tag & Rank
                        </Button>
                      </Tooltip>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
          </Table.Body>
        </Table>
      </div>
    </div>
  );
}

export default ManageDesignations;
