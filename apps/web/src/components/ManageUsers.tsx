import { Button, Modal, Spinner, Table, TextInput, Toast } from "flowbite-react";
import React, { useEffect, useState } from "react";
import { AiOutlineNotification } from "react-icons/ai";
import { customThemeTi } from "../utils/flowbiteCustomThemes";

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userIdToDelete, setUserIdToDelete] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/admin/get/users");
        const data = await res.json();
        if (data.ok) {
          setUsers(data.users);
          setFilteredUsers(data.users);
        }
      } catch (error) {
        console.error("Failed to fetch users: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleDeleteUser = async () => {
    if (!userIdToDelete) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/remove/user/${userIdToDelete}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setUsers(users.filter((user) => user.id !== userIdToDelete));
        setToastMessage("User deleted successfully!");
        setShowModal(false);
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      setToastMessage("Failed to delete user.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);

    const filtered = users.filter((user) =>
      [user.name, user.email, user.phoneNumber, user.role].some((field) =>
        field?.toLowerCase().includes(term.toLowerCase())
      )
    );

    setFilteredUsers(filtered);
  };

  return (
    <div>
      {loading && (
        <div className="flex justify-center items-center h-full">
          <Spinner size="xl" className="fill-[rgb(60,79,131)]" />
        </div>
      )}
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
      <div className="mb-4 w-full max-w-md">
        <TextInput
          type="text"
          placeholder="Search by name, email, phone or role"
          value={searchTerm}
          onChange={handleSearch}
          theme={customThemeTi}
        />
      </div>
      <Table hoverable>
        <Table.Head>
          {/* <Table.HeadCell>ID</Table.HeadCell> */}
          <Table.HeadCell>Name</Table.HeadCell>
          <Table.HeadCell>Email</Table.HeadCell>
          <Table.HeadCell>Phone</Table.HeadCell>
          <Table.HeadCell>Role</Table.HeadCell>
          <Table.HeadCell>Actions</Table.HeadCell>
        </Table.Head>
        <Table.Body>
          {filteredUsers &&
            filteredUsers.map((user) => (
              <Table.Row key={user.id}>
                {/* <Table.Cell>{user.id}</Table.Cell> */}
                <Table.Cell>{user.name}</Table.Cell>
                <Table.Cell>{user.email}</Table.Cell>
                <Table.Cell>{user.phoneNumber}</Table.Cell>
                <Table.Cell>{user.role}</Table.Cell>
                <Table.Cell className="flex flex-row gap-4">
                  {user.role !== "ADMIN" && (
                    <Button
                      color="failure"
                      onClick={() => {
                        setUserIdToDelete(user.id);
                        setShowModal(true);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
        </Table.Body>
      </Table>
      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <Modal.Header>Confirm Deletion</Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this user?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleDeleteUser} color="failure">
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

export default ManageUsers;
