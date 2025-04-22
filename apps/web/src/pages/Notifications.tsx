import React, { useCallback, useEffect, useState } from "react";
import SideBar from "../components/SideBar";
import EmojiRating from "../components/EmojiRating";
import { useSelector } from "react-redux";
import { Badge, Button, Label, Modal, Textarea } from "flowbite-react";
import { Link } from "react-router-dom";
import statusColors from "../utils/statusColors";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../utils/formatDate";

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any>({});
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState("");
  const { currentUser } = useSelector((state) => state.user);
  const [mood, setMood] = useState("");
  const [feedback, setFeedback] = useState({});

  console.log(currentUser);
  const currentUserId = currentUser.id;
  //TODO: fetch notifications
  const fetchNotifications = useCallback(() => {
    fetch(`/api/v1/user/me/notifications?eventType=all`)
      .then((res) => res.json())
      .then((data) => setNotifications(data.notifications));
  }, [currentUserId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  //TODO: add websocket
  // useComplaintWebSocket((data) => {
  //   if (data.type === "notification") {
  //     setNotifications((prev) => [data.notification, ...prev]);
  //   }
  // });

  //TODO: Complete this function
  const handleFeedback = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    setIsFeedbackModalOpen(true);
  };

  //TODO: Complete this function based on the backend
  const submitFeedback = (feedbackValue: number) => {
    console.log("Submit feedback");
    console.log("feedbackValue", feedbackValue);
    switch (feedbackValue) {
      case 1:
        setMood("Disappointed");
        break;
      case 2:
        setMood("Bad");
        break;
      case 3:
        setMood("Ok");
        break;
      case 4:
        setMood("Good");
        break;
      case 5:
        setMood("Excellent");
        break;
      default:
        setMood("");
    }
    // fetch(`/api/v1/complaints/${selectedComplaintId}/feedback`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ feedback: feedbackValue }),
    // })
    //   .then((res) => res.json())
    //   .then(() => {
    //     setIsFeedbackModalOpen(false);
    //     setNotifications((prev) =>
    //       prev.map((notif) =>
    //         notif.complaintId === selectedComplaintId
    //           ? { ...notif, feedbackSubmitted: true }
    //           : notif
    //       )
    //     );
    //   });
  };

  const handleModalClose = () => {
    setIsFeedbackModalOpen(false);
    setSelectedComplaintId("");
    setFeedback(""); // Reset the feedback
  };

  const handleReraiseComplaint = async () => {};

  return (
    <div className="flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/4">
        <SideBar />
      </div>

      {/* Main Section */}
      <div className="w-full md:w-3/4 flex flex-col px-6 py-4">
        <h2 className="text-2xl font-bold mb-4">Notifications</h2>

        <ul>
          {/* TODO: Map the notifications */}
          {notifications &&
            notifications.length > 0 &&
            notifications.map((notif: any, key: number) => (
              <li
                key={key}
                className="bg-white shadow-md p-4 rounded-lg mb-3 flex justify-between items-center"
              >
                <div>
                  <Link
                    to={`/complaint/${notif.payload.complaintId}`}
                    className="text-lg font-semibold text-gray-800 hover:text-[rgb(60,79,131)]"
                  >
                    {notif.payload.title}
                  </Link>
                  <p className="text-sm text-gray-500">
                    Complaint description in short with a see more button{" "}
                  </p>
                  <Badge
                    className="text-xs font-semibold px-3 py-1 w-1/2"
                    color={statusColors["RESOLVED"] || "gray"}
                  >
                    {notif.eventType}
                  </Badge>
                  <p className="text-sm text-gray-500">
                    {formatDate(notif.createdAt)}
                  </p>

                  <p className="text-sm text-gray-500">
                    {notif.payload.isEscalatedTo}
                  </p>
                </div>
                {notif.eventType === "RESOLVED" && !notif.feedbackSubmitted && (
                  <Button
                    onClick={() => handleFeedback(notif.payload.complaintId)}
                    gradientDuoTone="purpleToBlue"
                  >
                    Give Feedback
                  </Button>
                )}
              </li>
            ))}
        </ul>
        {/* Feedback Modal */}
        <Modal
          show={isFeedbackModalOpen}
          onClose={() => handleModalClose()}
          size="3xl"
        >
          <Modal.Header>Submit Feedback</Modal.Header>
          <Modal.Body>
            <Label>Feedback:</Label>
            <Textarea
              onChange={(e) => {
                setFeedback(e.target.value);
              }}
              placeholder="Write your feedback here"
              rows={5}
            />
            <EmojiRating onRate={submitFeedback} />
            <div className="flex gap-5 mt-5 justify-between">
              <Button
                gradientDuoTone="purpleToBlue"
                onClick={async () => {
                  try {
                    const res = await fetch(
                      "/api/v1/complaint/close",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        credentials: "include",
                        body: JSON.stringify({
                          complaintId: selectedComplaintId,
                          mood: mood,
                          remarks: feedback,
                        }),
                      }
                    );

                    const data = await res.json();
                    if (data.ok) {
                      // setToastMessage("Feedback submitted successfully!");
                      console.log(data);
                      setFeedback("");
                      setSelectedComplaintId("");
                      setIsFeedbackModalOpen(false);
                      navigate("/notifications");
                    } else {
                      // setError(data.error || "Failed to submit feedback.");
                      console.error("Failed to submit feedback");
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    console.log("Feedback submitted");
                  }
                }}
                outline
              >
                Submit Feedback & Close Complaint
              </Button>
              <Button
                gradientDuoTone="greenToBlue"
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/v1/complaint/recreate/${selectedComplaintId}`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        credentials: "include",
                      }
                    );
  
                    const data = await res.json();
                    if(data.ok) {
                      console.log(data);
                      navigate(`/`);
                    } else {
                      console.error("Failed to recreate complaint");
                    }

                    
                  } catch(err) {
                    console.error(err);
                  } finally {
                    console.log("Complaint recreated");
                  }
                }}
                outline
              >
                Reraise complaint
              </Button>
              <Button color="light" onClick={handleModalClose}>
                Cancel
              </Button>
            </div>
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
}

export default Notifications;
