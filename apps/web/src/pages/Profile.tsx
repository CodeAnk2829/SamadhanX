import React, { useEffect, useState } from "react";
import SideBar from "../components/SideBar";
import { useDispatch, useSelector } from "react-redux";
import { Alert, Button, Modal, Spinner, TextInput } from "flowbite-react";
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { signOutSuccess } from "../redux/user/userSlice";
import ComplaintCard from "../components/ComplaintCard";
import { customThemeTi } from "../utils/flowbiteCustomThemes";

function Profile() {
  const { currentUser } = useSelector((state) => state.user);
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    role: "",
  });
  const [passwordData, setPasswordData] = useState({});
  const [loading, setLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [upvotedComplaints, setUpvotedComplaints] = useState([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  useEffect(() => {
    fetchUserProfile();
    fetchUpvotedComplaints();
  }, []);
  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/user/me/profile");
      const data = await res.json();
      if (data.ok) {
        setUserData({
          name: data.name,
          email: data.email,
          phoneNumber: data.phoneNumber,
          role: data.role,
        });
      }
    } catch (error) {
      setUpdateError("Could not fetch user details: ", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpvotedComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/user/me/upvoted");
      const data = await res.json();
      if (data.ok) {
        setUpvotedComplaints(data.upvotedComplaintsDetails);
        console.log(data.upvotedComplaintsDetails);
      }
    } catch (error) {
      setUpdateError("Could not fetch upvoted complaints: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      const res = await fetch("/api/v1/user/me/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }
      setUpdateSuccess(data.message);
      fetchUserProfile();
    } catch (error) {
      setUpdateError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setShowModal(false);
    try {
      const res = await fetch("/api/v1/user/me/delete", {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete account");
      }
      navigate("/sign-in");
    } catch (error) {
      setUpdateError("Error deleting account");
    }
  };
  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.id]: e.target.value });
  };

  const handlePasswordChange = async (e) => {
    setPasswordData({ ...passwordData, [e.target.id]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    console.log("data: ", passwordData);
    setLoading(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setUpdateError("New password and confirm password do not match.");
      setLoading(false);
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setUpdateError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/user/me/change-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      setUpdateSuccess(data.message);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setUpdateError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignout = async () => {
    try {
      const res = await fetch("/api/v1/user/auth/signout", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        console.log(data.message);
      } else {
        dispatch(signOutSuccess());
        navigate("/sign-in");
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  const getInitials = (name: string) => {
    const nameParts = name.trim().split(" ");
    const initials =
      nameParts.length === 1
        ? nameParts[0][0]
        : nameParts[0][0] + nameParts[nameParts.length - 1][0];
    return initials.toUpperCase();
  };
  useEffect(() => {
    let timer;
    if (updateSuccess || updateError) {
      timer = setTimeout(() => {
        setUpdateSuccess(null);
        setUpdateError(null);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [updateSuccess, updateError]);

  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4">
        <SideBar />
      </div>

      {/* Main Section */}
      <div className="w-full md:w-3/4 flex flex-col px-6 py-4">
        {loading && (
          <div className="flex justify-center items-center h-full">
            <Spinner size="xl" className="fill-[rgb(60,79,131)]" />
          </div>
        )}
        <div className="max-w-lg mx-auto p-3 w-full">
          <h1 className="my-7 text-center font-semibold text-3xl">Profile</h1>
          <div className="flex flex-col items-center gap-4">
            {/* Profile Circle */}
            <div className="relative w-28 h-28 rounded-full bg-[rgb(60,79,131)] flex items-center justify-center text-white text-5xl font-bold shadow-md">
              {getInitials(userData.name || "Guest User")}
            </div>
            <span className="text-gray-700 text-lg font-light mb-2">
              {userData.role}
            </span>
          </div>
          <div className="flex flex-col gap-4">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <TextInput
                type="text"
                id="name"
                placeholder="Name"
                value={userData.name}
                onChange={handleChange}
                required
                theme={customThemeTi}
              />
              <TextInput
                type="email"
                id="email"
                placeholder="Email"
                value={userData.email}
                onChange={handleChange}
                required
                theme={customThemeTi}
              />
              <TextInput
                type="text"
                id="phoneNumber"
                placeholder="Phone Number"
                value={userData.phoneNumber}
                onChange={handleChange}
                required
                theme={customThemeTi}
              />
              <Button
                type="submit"
                gradientDuoTone="purpleToBlue"
                outline
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Profile"}
              </Button>
            </form>

            <form
              className="flex flex-col gap-4 mt-8"
              onSubmit={handlePasswordSubmit}
            >
              <TextInput
                type="password"
                id="currentPassword"
                placeholder="Current Password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
                theme={customThemeTi}
              />
              <TextInput
                type="password"
                id="newPassword"
                placeholder="New Password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                theme={customThemeTi}
              />
              <TextInput
                type="password"
                id="confirmPassword"
                placeholder="Confirm New Password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
                theme={customThemeTi}
              />
              <Button
                type="submit"
                gradientDuoTone="purpleToBlue"
                outline
                disabled={loading}
              >
                {loading ? "Updating..." : "Change Password"}
              </Button>
            </form>
          </div>
          <div className="text-red-500 flex justify-between mt-5">
            <span className="cursor-pointer" onClick={() => setShowModal(true)}>
              Delete Account
            </span>
            <span className="cursor-pointer" onClick={handleSignout}>
              Sign Out
            </span>
          </div>

          {updateSuccess && (
            <Alert color="success" className="mt-5">
              {updateSuccess}
            </Alert>
          )}
          {updateError && (
            <Alert color="failure" className="mt-5">
              {updateError}
            </Alert>
          )}

          <Modal
            show={showModal}
            onClose={() => setShowModal(false)}
            popup
            size="md"
          >
            <Modal.Header />
            <Modal.Body>
              <div className="text-center">
                <HiOutlineExclamationCircle className="h-14 w-14 text-gray-400 mb-4 mx-auto" />
                <h3 className="mb-5 text-lg text-gray-500">
                  Are you sure you want to delete your account?
                </h3>
                <div className="flex justify-center gap-4">
                  <Button color="failure" onClick={handleDeleteUser}>
                    Yes, I'm sure
                  </Button>
                  <Button color="gray" onClick={() => setShowModal(false)}>
                    No, cancel
                  </Button>
                </div>
              </div>
            </Modal.Body>
          </Modal>
        </div>

        <div className="mt-5">
          <h2 className="text-2xl font-semibold text-center mb-4">
            Recent Activity
          </h2>
          <div className="max-w-6xl mx-auto flex flex-col gap-8">
            {upvotedComplaints && upvotedComplaints.length === 0 ? (
              <p className="text-gray-500 text-center">
                No upvoted complaints yet.
              </p>
            ) : (
              <div className="flex flex-col gap-4 items-center">
                {upvotedComplaints &&
                  upvotedComplaints.map((complaint) => (
                    <ComplaintCard
                      key={complaint.id}
                      complaint={complaint}
                      showProfile={true}
                      showUpvote={false}
                      showActions={false}
                      showBadges={true}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
