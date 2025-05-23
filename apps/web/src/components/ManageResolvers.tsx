import {
  Alert,
  Button,
  Modal,
  Select,
  Spinner,
  Table,
  TextInput,
  Toast,
} from "flowbite-react";
import React, { useEffect, useState } from "react";
import { AiOutlineNotification } from "react-icons/ai";
import {
  customThemeSelect,
  customThemeTi,
} from "../utils/flowbiteCustomThemes";
import AssignResolverModal from "./AssignResolverModal";

function ManageResolvers() {
  const [resolvers, setResolvers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [locations, setLocations] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newResolver, setNewResolver] = useState({ role: "RESOLVER" });
  const [selectedResolver, setSelectedResolver] = useState({});
  const [updatedResolver, setUpdatedResolver] = useState({});
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [resolverToDelete, setResolverToDelete] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tags, setTags] = useState([]);
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => {
      setError(null);
    }, 3000);
  };

  useEffect(() => {
    fetchResolvers();
    fetchLocations();
  }, []);

  const fetchResolvers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/get/resolvers");
      const data = await res.json();
      if (data.ok) {
        setResolvers(data.resolversDetails);
        console.log(data.resolversDetails);
      }
    } catch (error) {
      showError("Failed to fetch resolvers: ", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/get/locations");
      const data = await res.json();
      if (data.ok) {
        setLocations(data.locations);
      } else {
        console.error("Cannot fetch locations: ", data.error);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResolverDetails = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/get/resolver/${id}`);
      const data = await res.json();
      console.log(data.resolverDetails);
      if (data.ok) {
        setSelectedResolver(data.resolverDetails);
        setUpdatedResolver({
          resolverId: id,
          name: resolverDetails.resolverName,
          email: resolverDetails.email,
          phoneNumber: resolverDetails.phoneNumber,
          location: resolverDetails.location,
          role: resolverDetails.role,
          occupation: resolverDetails.occupation,
        });
        console.log("Updated : ", updatedResolver);
      }
    } catch (error) {
      console.error("Failed to fetch resolver details: ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResolver = async () => {
    setLoading(true);
    try {
      const { resolverId, ...dataToSend } = updatedResolver;
      const res = await fetch(`/api/v1/admin/update/resolver/${resolverId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });
      const data = await res.json();
      if (data.ok) {
        setToastMessage("Resolver updated successfully!");
        setResolvers(
          resolvers.map((resv) =>
            resv.id === updatedResolver.resolverId
              ? {
                  ...resv,
                  name: data.name,
                  email: data.email,
                  phoneNumber: data.phoneNumber,
                  resolver: {
                    ...resv.resolver,
                    location: {
                      location: data.location.split("-")[0],
                      locationName: data.location.split("-")[1] || null,
                      locationBlock: data.location.split("-")[2] || null,
                    },
                    occupation: data.occupation,
                  },
                }
              : resv
          )
        );
      }
      setShowUpdateModal(false);
      setShowDetailsModal(false);
    } catch (error) {
      console.error("Failed to update resolver:", error);
      setToastMessage("Failed to update resolver.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResolver = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/remove/user/${resolverToDelete}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setResolvers(
          resolvers.filter((resolver) => resolver.id !== resolverToDelete)
        );
        setToastMessage("Resolver deleted successfully!");
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error("Failed to delete resolver:", error);
      setToastMessage("Failed to delete resolver.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Add Button*/}
      <Button
        gradientDuoTone="purpleToBlue"
        onClick={() => setShowAddModal(true)}
        className="mb-4"
      >
        Add New Resolver
      </Button>
      {/* loading Spinner */}
      {loading && (
        <div className="flex justify-center items-center h-full">
          <Spinner size="xl" className="fill-[rgb(60,79,131)]" />
        </div>
      )}
      {/* toast message */}
      {toastMessage && (
        <div className="absolute top-5 left-1/2">
          <Toast>
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-500">
              <AiOutlineNotification className="h-5 w-5" />
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

      <Table hoverable>
        <Table.Head>
          <Table.HeadCell>Name</Table.HeadCell>
          <Table.HeadCell>Email</Table.HeadCell>
          <Table.HeadCell>Phone</Table.HeadCell>
          <Table.HeadCell>Location</Table.HeadCell>
          <Table.HeadCell>Occupation</Table.HeadCell>
          <Table.HeadCell>Actions</Table.HeadCell>
        </Table.Head>

        <Table.Body>
          {resolvers &&
            resolvers.length > 0 &&
            resolvers.map((resolver) => (
              <Table.Row key={resolver.id}>
                <Table.Cell>
                  <Button
                    color="link"
                    onClick={() => {
                      fetchResolverDetails(resolver.id);
                      setShowDetailsModal(true);
                    }}
                  >
                    {resolver.name}
                  </Button>
                </Table.Cell>
                <Table.Cell>{resolver.email}</Table.Cell>
                <Table.Cell>{resolver.phoneNumber}</Table.Cell>
                {resolver.location}
                <Table.Cell>{resolver.occupation}</Table.Cell>
                <Table.Cell className="flex flex-row gap-4">
                  <Button
                    color="warning"
                    onClick={() => {
                      fetchResolverDetails(resolver.id);
                      setShowUpdateModal(true);
                    }}
                  >
                    Update
                  </Button>
                  <Button
                    color="failure"
                    onClick={() => {
                      setResolverToDelete(resolver.id);
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
        </Table.Body>
      </Table>

      {/* Add Modal */}
      <AssignResolverModal
        showModal={showAddModal}
        setShowModal={setShowAddModal}
        refreshResolvers={fetchResolvers}
        setToastMessage={setToastMessage}
      />

      {/* Show Details Modal*/}
      <Modal
        show={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        size="2xl"
      >
        <Modal.Body>
          {selectedResolver && (
            <div>
              <p>
                <strong>Name:</strong> {selectedResolver.name}
              </p>
              <p>
                <strong>Email:</strong> {selectedResolver.email}
              </p>
              <p>
                <strong>Phone Number:</strong> {selectedResolver.phoneNumber}
              </p>
              <p>
                <strong>Location:</strong> {selectedResolver.location}
              </p>
              <p>
                <strong>Occupation:</strong> {selectedResolver.occupation}
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            color="warning"
            onClick={() => {
              setShowDetailsModal(false);
              setShowUpdateModal(true);
              fetchResolverDetails(selectedResolver);
            }}
          >
            Update
          </Button>
          <Button color="gray" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Update Details Modal */}
      <Modal
        show={showUpdateModal}
        size="4xl"
        onClose={() => setShowUpdateModal(false)}
      >
        <Modal.Header>Update Resolver Details</Modal.Header>
        <Modal.Body className="flex flex-col gap-3">
          <TextInput
            placeholder="Name"
            value={updatedResolver?.name || ""}
            onChange={(e) =>
              setUpdatedResolver({ ...updatedResolver, name: e.target.value })
            }
          />
          <TextInput
            placeholder="Email"
            value={updatedResolver?.email || ""}
            onChange={(e) =>
              setUpdatedResolver({
                ...updatedResolver,
                email: e.target.value,
              })
            }
          />
          <TextInput
            placeholder="Phone Number"
            value={updatedResolver?.phoneNumber || ""}
            onChange={(e) =>
              setUpdatedResolver({
                ...updatedResolver,
                phoneNumber: e.target.value,
              })
            }
          />

          <Select
            theme={customThemeSelect}
            onChange={(e) =>
              setUpdatedResolver({
                ...updatedResolver,
                location: e.target.value,
              })
            }
            value={updatedResolver?.location || ""}
            defaultValue=""
          >
            <option value="" disabled>
              Select Location
            </option>
            {locations &&
              locations.length > 0 &&
              locations.map((loc) => (
                <option
                  key={loc.id}
                  value={`${loc.location}${
                    loc.locationName ? `-${loc.locationName}` : ""
                  }${loc.locationBlock ? `-${loc.locationBlock}` : ""}`}
                >
                  {loc.location}
                  {loc.locationName ? `-${loc.locationName}` : ""}
                  {""}
                  {loc.locationBlock ? `-${loc.locationBlock}` : ""}
                </option>
              ))}
          </Select>
          <TextInput
            placeholder="Occupation"
            value={updatedResolver?.occupation || ""}
            onChange={(e) =>
              setUpdatedResolver({
                ...updatedResolver,
                designation: e.target.value,
              })
            }
            theme={customThemeTi}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleUpdateResolver}>Save</Button>
          <Button color="gray" onClick={() => setShowUpdateModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Modal*/}
      <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <Modal.Header>Confirm Deletion</Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to delete the resolver? This action cannot be
            undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            color="failure"
            onClick={() => {
              handleDeleteResolver();
              setShowDeleteModal(false);
            }}
          >
            Delete
          </Button>
          <Button color="gray" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ManageResolvers;
