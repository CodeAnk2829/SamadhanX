// NotificationCard.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Button,
  Badge,
  Card,
  Dropdown,
  Modal,
  Label,
  Textarea,
} from "flowbite-react";
import { Notification } from "../pages/Notifications";
import statusColors from "../utils/statusColors";
import { HiDotsVertical } from "react-icons/hi";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import EmojiRating from "../components/EmojiRating";

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

type Props = {
  notification: Notification;
};

const NotificationCard: React.FC<Props> = ({ notification }) => {
  const { eventType, createdAt, payload } = notification;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleModalClose = () => {
    setIsModalOpen(false);
    setFeedback("");
    setMood(null);
  };
  const submitFeedbackAndClose = async () => {
    if (!mood) return alert("Please rate your experience before closing.");
    setLoading(true);
    try {
        console.log({complaintId: payload.complaintId,
            mood,
            remarks: feedback,})
      const res = await fetch("/api/v1/complaints/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: payload.complaintId,
          mood,
          remarks: feedback,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("Complaint closed successfully.");
        handleModalClose();
        navigate('/');
      } else {
        console.error(data.error || "Failed to close complaint.");
      }
    } catch (err) {
      console.log("Something went wrong.", err);
    } finally {
      setLoading(false);
    }
  };

  const reraiseComplaint = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/complaints/recreate/${payload.complaintId}`,
        {
          method: "POST",
        }
      );
      const data = await res.json();
      if (data.ok) {
        alert("Complaint recreated successfully.");
        handleModalClose();
        window.location.reload();
      } else {
        alert(data.error || "Failed to recreate complaint.");
      }
    } catch (err) {
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = () => {
    switch (eventType) {
      case "ASSIGNED": //created and assigned
        return `Your complaint "${payload.title}" is created and has been assigned to ${payload.isAssignedTo}`;
      case "CLOSED":
        return `Your complaint "${payload.title}" is closed.`;
      case "DELEGATED":
        return `Your complaint "${payload.title}" has been delegated to ${payload.delegatedBy}`;
      case "ESCALATED":
        return `Your complaint "${payload.title}" has been escalated to ${payload.isEscalatedTo}`;
      case "RESOLVED":
        return `Your complaint "${payload.title}" has been resolved by ${payload.resolvedBy}`;
      case "RERAISED":
        return `Your complaint "${payload.title}" has been reraised.`;
      default:
        return `There is an update regarding your complaint "${payload.title}".`;
    }
  };

  const convertTimeZone = (createdAt: string) => {
    const istTime = dayjs.utc(createdAt).subtract(5.5, "hour");
    return istTime.fromNow();
  };
  const isClosedForSameComplaint = localStorage.getItem(`${payload.complaintId}_CLOSED`) === "true";
  const isDisabled = eventType === "CLOSED" || eventType === "RESOLVED";
  if (eventType === "CLOSED") {
    localStorage.setItem(`${payload.complaintId}_CLOSED`, "true");
  }

  const disableActions = eventType === "RESOLVED" && isClosedForSameComplaint;
  return (
    <Card className="relative">
      {!notification.isRead && (
        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 h-2 w-2 bg-red-500 rounded-full"></span>
      )}

      {/* Time and Menu */}
      <div className="absolute top-3 right-8 flex items-center gap-3">
        <p className="text-xs text-gray-500">{convertTimeZone(createdAt)}</p>
        <Dropdown
          label=""
          inline
          renderTrigger={() => (
            <HiDotsVertical className="text-gray-600 cursor-pointer" />
          )}
        >
          <Dropdown.Item>
            <Link to={`/complaint/${payload.complaintId}`}>View Complaint</Link>
          </Dropdown.Item>
        </Dropdown>
      </div>

      {/* Content */}
      <div className="w-full pr-12">
        <p className="text-sm text-gray-600 mt-1">{renderMessage()}</p>
        <div className="flex">
          <Badge
            className="text-xs font-semibold mt-2"
            color={statusColors[eventType] || "gray"}
          >
            {eventType}
          </Badge>
        </div>
      </div>

      {eventType === "RESOLVED" && (
        <div className="flex flex-row gap-2 mt-2 flex-end">
          <Button gradientDuoTone="purpleToBlue" size="xs" onClick={() => setIsModalOpen(true)} disabled={disableActions}>
            Give Feedback
          </Button>
        </div>
      )}

      <Modal show={isModalOpen} onClose={handleModalClose} size="3xl">
        <Modal.Header>Submit Feedback</Modal.Header>
        <Modal.Body>
          <Label>Feedback:</Label>
          <Textarea
            placeholder="Write your feedback here"
            rows={5}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <EmojiRating onRate={setMood} />
          <div className="flex gap-5 mt-5 justify-between">
            <Button
              gradientDuoTone="purpleToBlue"
              onClick={submitFeedbackAndClose}
              disabled={loading}
            >
              Submit Feedback & Close Complaint
            </Button>
            <Button
              gradientDuoTone="greenToBlue"
              onClick={reraiseComplaint}
              disabled={loading}
            >
              Reraise Complaint
            </Button>
            <Button color="light" onClick={handleModalClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </Card>
  );
};

export default NotificationCard;
